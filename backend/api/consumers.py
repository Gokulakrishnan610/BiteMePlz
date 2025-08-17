from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.urls import path
import json


class StockConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        # Get shop_id from query parameters
        query_string = self.scope.get('query_string', b'').decode()
        shop_id = None
        
        # Parse query string to get shop_id
        if query_string:
            params = dict(item.split('=') for item in query_string.split('&') if '=' in item)
            shop_id = params.get('shop_id')
        
        if shop_id:
            self.group_name = f'shop_{shop_id}'
            self.shop_id = shop_id
        else:
            self.group_name = 'stock_updates'
            self.shop_id = None
            
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        
        # Send connection confirmation
        await self.send_json({
            'type': 'connection_established',
            'message': 'WebSocket connected successfully',
            'shop_id': self.shop_id
        })

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def stock_update(self, event):
        """Handle stock updates"""
        await self.send_json({
            'type': 'stock_update',
            'product_id': event.get('product_id'),
            'stock': event.get('stock'),
            'shop_id': event.get('shop_id'),
            'timestamp': event.get('timestamp')
        })

    async def order_update(self, event):
        """Handle order updates"""
        await self.send_json({
            'type': 'order_update',
            'order_id': event.get('order_id'),
            'status': event.get('status'),
            'shop_id': event.get('shop_id'),
            'timestamp': event.get('timestamp')
        })

    async def product_update(self, event):
        """Handle product updates (price, availability, etc.)"""
        await self.send_json({
            'type': 'product_update',
            'product_id': event.get('product_id'),
            'shop_id': event.get('shop_id'),
            'changes': event.get('changes', {}),
            'timestamp': event.get('timestamp')
        })

    async def notification(self, event):
        """Handle general notifications"""
        await self.send_json({
            'type': 'notification',
            'message': event.get('message'),
            'category': event.get('category'),
            'shop_id': event.get('shop_id'),
            'timestamp': event.get('timestamp')
        })


# WebSocket URL patterns for ASGI routing
websocket_urlpatterns = [
    path('ws/stock/', StockConsumer.as_asgi()),
    path('ws/orders/', StockConsumer.as_asgi()),  # Reuse for now, can add separate consumer later
]


