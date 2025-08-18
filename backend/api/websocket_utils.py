"""
WebSocket utility functions for broadcasting live updates
"""
import json
from datetime import datetime
from typing import Optional, Dict, Any

try:
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    _channels_available = True
except ImportError:
    _channels_available = False


def broadcast_stock_update(product_id: str, stock: int, shop_id: str):
    """Broadcast stock update to all connected clients for a specific shop"""
    if not _channels_available:
        return
    
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'shop_{shop_id}',
            {
                'type': 'stock_update',
                'product_id': product_id,
                'stock': stock,
                'shop_id': shop_id,
                'timestamp': datetime.now().isoformat()
            }
        )
        print(f"DEBUG: Stock update broadcasted for product {product_id} in shop {shop_id}")
    except Exception as e:
        print(f"ERROR: Failed to broadcast stock update: {e}")


def broadcast_order_update(order_id: str, status: str, shop_id: str):
    """Broadcast order update to all connected clients for a specific shop"""
    if not _channels_available:
        return
    
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'shop_{shop_id}',
            {
                'type': 'order_update',
                'order_id': order_id,
                'status': status,
                'shop_id': shop_id,
                'timestamp': datetime.now().isoformat()
            }
        )
        print(f"DEBUG: Order update broadcasted for order {order_id} in shop {shop_id}")
    except Exception as e:
        print(f"ERROR: Failed to broadcast order update: {e}")


def broadcast_product_update(product_id: str, shop_id: str, changes: Dict[str, Any]):
    """Broadcast product update to all connected clients for a specific shop"""
    if not _channels_available:
        return
    
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'shop_{shop_id}',
            {
                'type': 'product_update',
                'product_id': product_id,
                'shop_id': shop_id,
                'changes': changes,
                'timestamp': datetime.now().isoformat()
            }
        )
        print(f"DEBUG: Product update broadcasted for product {product_id} in shop {shop_id}")
    except Exception as e:
        print(f"ERROR: Failed to broadcast product update: {e}")


def broadcast_notification(message: str, category: str, shop_id: str):
    """Broadcast general notification to all connected clients for a specific shop"""
    if not _channels_available:
        return
    
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'shop_{shop_id}',
            {
                'type': 'notification',
                'message': message,
                'category': category,
                'shop_id': shop_id,
                'timestamp': datetime.now().isoformat()
            }
        )
        print(f"DEBUG: Notification broadcasted for shop {shop_id}: {message}")
    except Exception as e:
        print(f"ERROR: Failed to broadcast notification: {e}")


def broadcast_order_verification(order_id: str, shop_id: str, order_data: Dict[str, Any]):
    """Broadcast order verification update to all connected clients for a specific shop"""
    if not _channels_available:
        return
    
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'shop_{shop_id}',
            {
                'type': 'order_verification',
                'order_id': order_id,
                'shop_id': shop_id,
                'order_data': order_data,
                'timestamp': datetime.now().isoformat()
            }
        )
        print(f"DEBUG: Order verification broadcasted for order {order_id} in shop {shop_id}")
    except Exception as e:
        print(f"ERROR: Failed to broadcast order verification: {e}")


def broadcast_to_all_shops(event_type: str, data: Dict[str, Any]):
    """Broadcast to all connected clients across all shops"""
    if not _channels_available:
        return
    
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'stock_updates',
            {
                'type': event_type,
                **data,
                'timestamp': datetime.now().isoformat()
            }
        )
        print(f"DEBUG: Broadcast to all shops: {event_type}")
    except Exception as e:
        print(f"ERROR: Failed to broadcast to all shops: {e}")
