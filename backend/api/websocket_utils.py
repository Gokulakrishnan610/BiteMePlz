"""
Real-time broadcast helpers — publishes to the SSE event bus (Redis or in-memory).
"""
from datetime import datetime
from typing import Any, Dict

from .event_bus import publish_event, shop_channel


def broadcast_stock_update(product_id: str, stock: int, shop_id: str):
    publish_event(
        shop_channel(shop_id),
        'stock_update',
        {
            'product_id': product_id,
            'stock': stock,
            'shop_id': shop_id,
        },
    )


def broadcast_order_update(order_id: str, status: str, shop_id: str):
    publish_event(
        shop_channel(shop_id),
        'order_update',
        {
            'order_id': order_id,
            'status': status,
            'shop_id': shop_id,
        },
    )


def broadcast_product_update(product_id: str, shop_id: str, changes: Dict[str, Any]):
    publish_event(
        shop_channel(shop_id),
        'product_update',
        {
            'product_id': product_id,
            'shop_id': shop_id,
            'changes': changes,
        },
    )


def broadcast_notification(message: str, category: str, shop_id: str):
    publish_event(
        shop_channel(shop_id),
        'notification',
        {
            'message': message,
            'category': category,
            'shop_id': shop_id,
        },
    )


def broadcast_order_verification(order_id: str, shop_id: str, order_data: Dict[str, Any]):
    publish_event(
        shop_channel(shop_id),
        'order_verification',
        {
            'order_id': order_id,
            'shop_id': shop_id,
            'order_data': order_data,
        },
    )


def broadcast_wallet_update(user_id: str, balance: float, change: float = 0, transaction_type: str = 'update'):
    from .event_bus import user_channel

    publish_event(
        user_channel(user_id),
        'wallet_update',
        {
            'user_id': user_id,
            'balance': balance,
            'change': change,
            'transaction_type': transaction_type,
        },
    )


def broadcast_to_all_shops(event_type: str, data: Dict[str, Any]):
    publish_event(shop_channel('global'), event_type, data)
