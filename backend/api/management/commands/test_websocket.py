from django.core.management.base import BaseCommand
from django.conf import settings
import time

class Command(BaseCommand):
    help = 'Test WebSocket broadcasting functionality'

    def add_arguments(self, parser):
        parser.add_argument('--shop-id', type=str, default='test-shop', help='Shop ID to broadcast to')
        parser.add_argument('--product-id', type=str, default='test-product', help='Product ID to broadcast')
        parser.add_argument('--message', type=str, default='Test notification', help='Message to broadcast')

    def handle(self, *args, **options):
        shop_id = options['shop_id']
        product_id = options['product_id']
        message = options['message']
        
        self.stdout.write(f"🧪 Testing WebSocket broadcasting for shop: {shop_id}")
        
        try:
            # Test stock update broadcast
            from api.websocket_utils import broadcast_stock_update
            self.stdout.write("📡 Broadcasting stock update...")
            broadcast_stock_update(
                product_id=product_id,
                stock=100,
                shop_id=shop_id
            )
            self.stdout.write("✅ Stock update broadcasted successfully")
            
            # Test order update broadcast
            from api.websocket_utils import broadcast_order_update
            self.stdout.write("📡 Broadcasting order update...")
            broadcast_order_update(
                order_id='test-order-123',
                status='preparing',
                shop_id=shop_id
            )
            self.stdout.write("✅ Order update broadcasted successfully")
            
            # Test product update broadcast
            from api.websocket_utils import broadcast_product_update
            self.stdout.write("📡 Broadcasting product update...")
            broadcast_product_update(
                product_id=product_id,
                shop_id=shop_id,
                changes={'price': 9.99, 'name': 'Updated Product'}
            )
            self.stdout.write("✅ Product update broadcasted successfully")
            
            # Test notification broadcast
            from api.websocket_utils import broadcast_notification
            self.stdout.write("📡 Broadcasting notification...")
            broadcast_notification(
                message=message,
                category='info',
                shop_id=shop_id
            )
            self.stdout.write("✅ Notification broadcasted successfully")
            
            self.stdout.write("\n🎉 All WebSocket broadcasts completed successfully!")
            self.stdout.write("   Check your frontend console for received messages.")
            
        except ImportError as e:
            self.stdout.write(self.style.ERROR(f"❌ Import error: {e}"))
            self.stdout.write("   Make sure channels and related packages are installed.")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ WebSocket test failed: {e}"))
            self.stdout.write("   Check your Django server logs for more details.")
