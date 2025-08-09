from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Order, Transaction
from django.db import transaction as db_transaction

class Command(BaseCommand):
    help = 'Expire orders whose QR validity has ended and return amount to wallet if not bought.'

    def handle(self, *args, **options):
        now = timezone.now()
        expired_orders = Order.objects.filter(
            expires_at__lt=now,
            status='pending',
            is_paid=True,
            is_verified=False
        )
        count = 0
        for order in expired_orders:
            with db_transaction.atomic():
                # Mark as expired
                order.status = 'expired'
                order.save()
                # Return amount to wallet
                user = order.user
                user.balance += order.total_price
                user.save()
                # Log transaction as 'credit' with description 'Order expired, amount returned to wallet'
                Transaction.objects.create(
                    user=user,
                    shop=order.shop,
                    order=order,
                    amount=order.total_price,
                    type='credit',
                    status='success',
                    payment_method='balance',
                    description=f'Order {order.order_id} expired, amount returned to wallet.'
                )
                count += 1
        self.stdout.write(self.style.SUCCESS(f'Processed {count} expired orders and returned amount to wallet.')) 