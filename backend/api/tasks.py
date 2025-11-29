from celery import shared_task
from django.utils import timezone
from api.models import Order, Transaction, Product
try:
    from asgiref.sync import async_to_sync  # type: ignore
    from channels.layers import get_channel_layer  # type: ignore
    _channels_available = True
except Exception:
    _channels_available = False
from django.db import transaction as db_transaction
from django.conf import settings
from api.models import ShopLog
from api.models import Shop
from datetime import datetime

@shared_task(name='api.tasks.manage_shop_hours')
def manage_shop_hours():
    """Automatically open/close shops based on their configured hours"""
    now = timezone.now()
    current_time = now.time()
    
    # Get all active shops
    shops = Shop.objects.filter(is_active=True)
    
    for shop in shops:
        try:
            if shop.final_validity_time:
                # Convert final_validity_time to time object if it's a datetime
                if isinstance(shop.final_validity_time, datetime):
                    closing_time = shop.final_validity_time.time()
                else:
                    closing_time = shop.final_validity_time
                
                # Check if shop should be open or closed
                should_be_open = current_time < closing_time
                
                # Update shop status if it differs from current state
                if shop.is_open != should_be_open:
                    old_status = shop.is_open
                    shop.is_open = should_be_open
                    shop.save()
                    
                    # Log the automatic status change
                    action = 'shop_auto_opened' if should_be_open else 'shop_auto_closed'
                    ShopLog.objects.create(
                        shop=shop,
                        action=action,
                        performed_by=None,  # System action
                        details={
                            'old_status': 'closed' if old_status else 'open',
                            'new_status': 'open' if should_be_open else 'closed',
                            'time_checked': now.isoformat(),
                            'closing_time': closing_time.isoformat(),
                            'reason': 'Automatic time-based operation'
                        }
                    )
                    
        except Exception as e:
            # Log error but continue with other shops
            print(f"Error managing shop hours for {shop.name}: {str(e)}")
            continue

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
            
            # Log the order expiration
            try:
                ShopLog.objects.create(
                    shop=order.shop,
                    action='order_expired',
                    performed_by=None,  # System action
                    details={
                        'order_id': order.order_id,
                        'total_price': float(order.total_price),
                        'expired_at': now.isoformat(),
                        'customer_name': order.user.name if order.user else 'Unknown',
                        'payment_method': (order.payment_result or {}).get('method', 'unknown'),
                        'was_paid': order.is_paid,
                        'expiry_reason': 'QR validity expired'
                    }
                )
            except Exception:
                # Don't fail the expiry if logging errors
                pass
            
            try:
                for it in (order.order_items or []):
                    product_id = it.get('product_id')
                    qty = int(it.get('quantity') or 0)
                    if not product_id or qty <= 0:
                        continue
                    try:
                        p = Product.objects.select_for_update().get(id=product_id)
                        # Only restock regular stock products, not live stock products
                        if p.stock_mode == 'stock':
                            p.stock = p.stock + qty
                            p.save()
                        # For live stock products, no restocking needed
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
                
                # Send WebSocket update for wallet balance change
                send_wallet_update(
                    user_id=str(user.id),
                    balance=float(user.balance),
                    change=float(order.total_price),
                    transaction_type='expiry_refund'
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
                
                # Send WebSocket update for wallet balance change
                send_wallet_update(
                    user_id=str(user.id),
                    balance=float(user.balance),
                    change=float(order.total_price),
                    transaction_type='dummy_expiry_refund'
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
                        # Only restock regular stock products, not live stock products
                        if p.stock_mode == 'stock':
                            p.stock = p.stock + qty
                            p.save()
                            # Broadcast stock update if channels present
                            if _channels_available:
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
                        # For live stock products, no restocking needed
                    except Product.DoesNotExist:
                        pass
            except Exception:
                pass
            order.status = 'expired'
            order.save()


def send_wallet_update(user_id: str, balance: float, change: float = 0, transaction_type: str = 'update'):
    """Send wallet update via WebSocket to connected clients"""
    if not _channels_available:
        return
    
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'wallet_updates',
            {
                'type': 'wallet_update',
                'user_id': user_id,
                'balance': balance,
                'change': change,
                'transaction_type': transaction_type,
                'timestamp': timezone.now().isoformat()
            }
        )
    except Exception as e:
        print(f"Error sending wallet update: {e}")

@shared_task(name='api.tasks.cleanup_pending_razorpay_orders')
def cleanup_pending_razorpay_orders():
    """
    Clean up pending Razorpay orders that are older than 10 minutes.
    These are orders created but payment was never completed.
    """
    from datetime import timedelta
    
    cutoff_time = timezone.now() - timedelta(minutes=10)
    
    # Find pending orders older than 10 minutes
    pending_orders = Order.objects.filter(
        is_paid=False,
        payment_result__method='razorpay',
        created_at__lt=cutoff_time
    )
    
    deleted_count = 0
    for order in pending_orders:
        try:
            order.delete()
            deleted_count += 1
        except Exception as e:
            print(f"Error deleting pending order {order.order_id}: {e}")
    
    if deleted_count > 0:
        print(f"Cleaned up {deleted_count} pending Razorpay orders")
    
    return deleted_count
