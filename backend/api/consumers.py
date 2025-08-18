from channels.generic.websocket import AsyncJsonWebsocketConsumer
import json
import logging

logger = logging.getLogger(__name__)


class StockConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        try:
            # Get parameters from query string
            query_string = self.scope.get('query_string', b'').decode()
            shop_id = None
            user_id = None
            
            # Parse query string to get parameters
            if query_string:
                params = dict(item.split('=') for item in query_string.split('&') if '=' in item)
                shop_id = params.get('shop_id')
                user_id = params.get('user_id')
            
            # Determine group based on connection type
            if shop_id:
                self.group_name = f'shop_{shop_id}'
                self.shop_id = shop_id
                self.user_id = user_id
                logger.info(f"WebSocket connecting to shop: {shop_id}")
            elif user_id:
                self.group_name = f'wallet_updates'
                self.shop_id = None
                self.user_id = user_id
                logger.info(f"WebSocket connecting to wallet updates for user: {user_id}")
            else:
                self.group_name = 'stock_updates'
                self.shop_id = None
                self.user_id = None
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
                'shop_id': self.shop_id,
                'user_id': self.user_id
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
                    'shop_id': None,
                    'user_id': None
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

    async def order_verification(self, event):
        """Handle order verification updates"""
        try:
            logger.info(f"Order verification event received: {event}")
            message = {
                'type': 'order_verification',
                'order_id': event.get('order_id'),
                'shop_id': event.get('shop_id'),
                'order_data': event.get('order_data'),
                'timestamp': event.get('timestamp')
            }
            logger.info(f"Sending order verification message: {message}")
            await self.send_json(message)
            logger.info("Order verification message sent successfully")
        except Exception as e:
            logger.error(f"Error sending order verification update: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")

    async def wallet_update(self, event):
        """Handle wallet balance updates"""
        try:
            # Only send to the specific user if this is a wallet connection
            if hasattr(self, 'user_id') and self.user_id:
                event_user_id = event.get('user_id')
                if event_user_id == self.user_id:
                    await self.send_json({
                        'type': 'wallet_update',
                        'user_id': event.get('user_id'),
                        'balance': event.get('balance'),
                        'change': event.get('change', 0),
                        'transaction_type': event.get('transaction_type'),
                        'timestamp': event.get('timestamp')
                    })
            else:
                # Send to all wallet connections (fallback)
                await self.send_json({
                    'type': 'wallet_update',
                    'user_id': event.get('user_id'),
                    'balance': event.get('balance'),
                    'change': event.get('change', 0),
                    'transaction_type': event.get('transaction_type'),
                    'timestamp': event.get('timestamp')
                })
        except Exception as e:
            logger.error(f"Error sending wallet update: {e}")

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


