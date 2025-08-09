from celery import shared_task
from celery import Celery
from celery.schedules import crontab
from django.utils import timezone
from api.models import Order, Transaction
from django.db import transaction as db_transaction
from django.conf import settings

app = Celery('rec_kiosk')

app.conf.beat_schedule = {
    'expire-orders-every-minute': {
        'task': 'api.tasks.expire_orders_and_return_wallet',
        'schedule': crontab(),  # every minute
    },
}

@shared_task
def expire_orders_and_return_wallet():
    now = timezone.now()
    expired_orders = Order.objects.filter(
        expires_at__lt=now,
        status='pending',
        is_paid=True,
        is_verified=False
    )
    for order in expired_orders:
        with db_transaction.atomic():
            order.status = 'expired'
            order.save()
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
                description=f'Order {order.order_id} expired, amount returned to wallet.'
            ) 