from channels.generic.websocket import AsyncJsonWebsocketConsumer
import json
import logging

logger = logging.getLogger(__name__)


class StockConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        try:
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
                logger.info(f"WebSocket connecting to shop: {shop_id}")
            else:
                self.group_name = 'stock_updates'
                self.shop_id = None
                logger.info("WebSocket connecting to general stock updates")
                
            # Add to channel layer group
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            
            # Accept the connection
            await self.accept()
            logger.info(f"WebSocket connection accepted for group: {self.group_name}")
            
            # Send connection confirmation
            await self.send_json({
                'type': 'connection_established',
                'message': 'WebSocket connected successfully',
                'shop_id': self.shop_id
            })
            logger.info("Connection confirmation sent")
            
        except Exception as e:
            logger.error(f"Error in WebSocket connect: {e}")
            # Try to accept anyway and send error message
            try:
                await self.accept()
                await self.send_json({
                    'type': 'connection_error',
                    'message': f'Connection error: {str(e)}',
                    'shop_id': None
                })
            except:
                pass

    async def disconnect(self, close_code):
        try:
            if hasattr(self, 'group_name'):
                await self.channel_layer.group_discard(self.group_name, self.channel_name)
                logger.info(f"WebSocket disconnected from group: {self.group_name}")
        except Exception as e:
            logger.error(f"Error in WebSocket disconnect: {e}")

    async def stock_update(self, event):
        """Handle stock updates"""
        try:
            await self.send_json({
                'type': 'stock_update',
                'product_id': event.get('product_id'),
                'stock': event.get('stock'),
                'shop_id': event.get('shop_id'),
                'timestamp': event.get('timestamp')
            })
        except Exception as e:
            logger.error(f"Error sending stock update: {e}")

    async def order_update(self, event):
        """Handle order updates"""
        try:
            await self.send_json({
                'type': 'order_update',
                'order_id': event.get('order_id'),
                'status': event.get('status'),
                'shop_id': event.get('shop_id'),
                'timestamp': event.get('timestamp')
            })
        except Exception as e:
            logger.error(f"Error sending order update: {e}")

    async def product_update(self, event):
        """Handle product updates (price, availability, etc.)"""
        try:
            await self.send_json({
                'type': 'product_update',
                'product_id': event.get('product_id'),
                'shop_id': event.get('shop_id'),
                'changes': event.get('changes', {}),
                'timestamp': event.get('timestamp')
            })
        except Exception as e:
            logger.error(f"Error sending product update: {e}")

    async def notification(self, event):
        """Handle general notifications"""
        try:
            await self.send_json({
                'type': 'notification',
                'message': event.get('message'),
                'category': event.get('category'),
                'shop_id': event.get('shop_id'),
                'timestamp': event.get('timestamp')
            })
        except Exception as e:
            logger.error(f"Error sending notification: {e}")

    async def receive_json(self, content):
        """Handle incoming messages from client"""
        try:
            message_type = content.get('type')
            logger.info(f"Received message type: {message_type}")
            
            # Echo back for testing
            await self.send_json({
                'type': 'message_received',
                'message': f'Received: {message_type}',
                'data': content
            })
        except Exception as e:
            logger.error(f"Error handling received message: {e}")
            await self.send_json({
                'type': 'error',
                'message': f'Error processing message: {str(e)}'
            })


