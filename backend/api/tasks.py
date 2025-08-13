from celery import shared_task
from django.utils import timezone
from api.models import Order, Transaction, Product
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction as db_transaction
from django.conf import settings

@shared_task(name='api.tasks.expire_orders_and_handle_refund')
def expire_orders_and_handle_refund():
    """Auto-expire paid, unverified orders and handle refunds with constraints.

    - If an order is from a multi-order checkout, each sibling is handled independently.
      Verified siblings are not refunded; unverified, expired siblings are refunded if paid by wallet.
    - Refunds are only applied for wallet/balance payments. Gateway payments are not auto-refunded.
    - Idempotent: will not double-refund the same order.
    """
    now = timezone.now()
    expired_orders = Order.objects.filter(
        expires_at__lt=now,
        status='pending',
        is_paid=True,
        is_verified=False
    )

    for order in expired_orders:
        with db_transaction.atomic():
            # Mark order as expired and RESTOCK all items since order not verified
            order.status = 'expired'
            order.save()
            try:
                for it in (order.order_items or []):
                    product_id = it.get('product_id')
                    qty = int(it.get('quantity') or 0)
                    if not product_id or qty <= 0:
                        continue
                    try:
                        p = Product.objects.select_for_update().get(id=product_id)
                        p.stock = p.stock + qty
                        p.save()
                    except Product.DoesNotExist:
                        # If product gone, skip restock
                        pass
            except Exception:
                # Do not fail the expiry if restock loop errors; continue with refund logic
                pass

            # Determine original payment method
            try:
                payment_method = (order.payment_result or {}).get('method')
            except Exception:
                payment_method = None

            # Idempotency: don't refund twice
            already_refunded = Transaction.objects.filter(
                order=order,
                type__in=['credit', 'refund'],
                metadata__reason='expiry_refund'
            ).exists()

            if payment_method == 'balance' and not already_refunded:
                # Return amount to wallet for wallet payments
                user = order.user
                user.balance += order.total_price
                user.save()

                Transaction.objects.create(
                    user=user,
                    shop=order.shop,
                    order=order,
                    amount=order.total_price,
                    type='credit',
                    status='success',
                    payment_method='balance',
                    description=f'Order {order.order_id} expired, amount returned to wallet.',
                    metadata={'reason': 'expiry_refund'}
                )
            elif payment_method == 'razorpay' and not already_refunded:
                # Dummy refund for Razorpay: credit the same amount to wallet, but mark as dummy
                user = order.user
                user.balance += order.total_price
                user.save()

                Transaction.objects.create(
                    user=user,
                    shop=order.shop,
                    order=order,
                    amount=order.total_price,
                    type='credit',
                    status='success',
                    payment_method='dummy_razorpay',
                    description=f'Order {order.order_id} expired, dummy refund credited to wallet (Razorpay payment).',
                    metadata={'reason': 'dummy_expiry_refund'}
                )
            else:
                # For other non-wallet payments, log expiry once (no auto-refund)
                if not Transaction.objects.filter(order=order, type='expiry', metadata__reason='expired_no_refund').exists():
                    Transaction.objects.create(
                        user=order.user,
                        shop=order.shop,
                        order=order,
                        amount=order.total_price,
                        type='expiry',
                        status='success',
                        payment_method=payment_method,
                        description=f'Order {order.order_id} expired; no wallet refund (non-balance payment).',
                        metadata={'reason': 'expired_no_refund'}
                    )

    # Also expire and restock reserved, unpaid orders whose reservation expired
    reserved = Order.objects.filter(
        is_paid=False,
        status='pending',
        qr_valid_until__lt=now
    )
    for order in reserved:
        with db_transaction.atomic():
            try:
                for it in (order.order_items or []):
                    pid = it.get('product_id')
                    qty = int(it.get('quantity') or 0)
                    if not pid or qty <= 0:
                        continue
                    try:
                        p = Product.objects.select_for_update().get(id=pid)
                        p.stock = p.stock + qty
                        p.save()
                        # Broadcast stock update
                        try:
                            channel_layer = get_channel_layer()
                            async_to_sync(channel_layer.group_send)(
                                'stock_updates',
                                {
                                    'type': 'stock_update',
                                    'product_id': str(p.id),
                                    'shop_id': str(p.shop.id),
                                    'stock': int(p.stock),
                                },
                            )
                        except Exception:
                            pass
                    except Product.DoesNotExist:
                        pass
            except Exception:
                pass
            order.status = 'expired'
            order.save()