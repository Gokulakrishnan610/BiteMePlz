#!/usr/bin/env python3
"""
Test script for WebSocket order verification
This script helps debug the WebSocket order verification process
"""

import os
import sys
import django
import json
import asyncio
import websockets
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rec_kiosk.settings')
django.setup()

from api.websocket_utils import broadcast_order_verification
from api.models import Order, Shop, User
from api.serializers import OrderSerializer

def test_broadcast_order_verification():
    """Test the broadcast_order_verification function"""
    print("Testing broadcast_order_verification function...")
    
    # Get a sample order
    try:
        order = Order.objects.first()
        if not order:
            print("No orders found in database")
            return
        
        print(f"Using order: {order.order_id} (ID: {order.id})")
        print(f"Shop: {order.shop.name} (ID: {order.shop.id})")
        
        # Serialize the order
        order_data = OrderSerializer(order).data
        print(f"Order data keys: {list(order_data.keys())}")
        print(f"Order data ID: {order_data.get('id')}")
        print(f"Order verification status: {order_data.get('is_verified')}")
        
        # Test the broadcast
        broadcast_order_verification(
            order_id=str(order.id),
            shop_id=str(order.shop.id),
            order_data=order_data
        )
        
        print("Broadcast test completed")
        return str(order.shop.id)  # Return shop ID for WebSocket test
        
    except Exception as e:
        print(f"Error testing broadcast: {e}")
        import traceback
        traceback.print_exc()
        return None

async def test_websocket_connection(shop_id):
    """Test WebSocket connection and listen for messages"""
    print(f"Testing WebSocket connection for shop {shop_id}...")
    
    # Connect to WebSocket
    uri = f"ws://localhost:8000/ws/orders/?shop_id={shop_id}"
    print(f"Connecting to: {uri}")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("WebSocket connected successfully")
            
            # Send a test message
            test_message = {
                "type": "test",
                "message": "Test from Python script",
                "shop_id": shop_id,
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send(json.dumps(test_message))
            print("Test message sent")
            
            # Listen for messages for 10 seconds
            print("Listening for messages...")
            for i in range(10):
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    print(f"Received message: {data}")
                    
                    if data.get('type') == 'connection_established':
                        print(f"✅ Connection established! Shop ID: {data.get('shop_id')}")
                        if data.get('shop_id') == shop_id:
                            print("✅ Shop ID matches!")
                        else:
                            print(f"❌ Shop ID mismatch! Expected: {shop_id}, Got: {data.get('shop_id')}")
                    
                    if data.get('type') == 'order_verification':
                        print("✅ Order verification message received!")
                        print(f"Order ID: {data.get('order_id')}")
                        print(f"Shop ID: {data.get('shop_id')}")
                        print(f"Verification status: {data.get('order_data', {}).get('is_verified')}")
                        
                except asyncio.TimeoutError:
                    print(f"Timeout waiting for message ({i+1}/10)")
                    
    except Exception as e:
        print(f"WebSocket connection error: {e}")

def list_shops_and_users():
    """List available shops and users for testing"""
    print("\nAvailable shops:")
    shops = Shop.objects.all()
    for shop in shops:
        print(f"  - {shop.name} (ID: {shop.id})")
    
    print("\nAvailable users:")
    users = User.objects.filter(role__in=['admin', 'shopAdmin'])
    for user in users:
        shop_info = f" (Shop: {user.shop})" if user.shop else ""
        print(f"  - {user.name} ({user.role}){shop_info}")

def main():
    """Main test function"""
    print("WebSocket Order Verification Test")
    print("=" * 40)
    
    # List available shops and users
    list_shops_and_users()
    
    # Test 1: Broadcast function
    print("\n1. Testing broadcast function...")
    shop_id = test_broadcast_order_verification()
    
    # Test 2: WebSocket connection
    print("\n2. Testing WebSocket connection...")
    
    if shop_id:
        print(f"Using shop ID from broadcast test: {shop_id}")
        asyncio.run(test_websocket_connection(shop_id))
    else:
        # Get a shop ID from database
        try:
            shop = Shop.objects.first()
            if shop:
                print(f"Using first shop: {shop.name} (ID: {shop.id})")
                asyncio.run(test_websocket_connection(str(shop.id)))
            else:
                print("No shops found in database")
        except Exception as e:
            print(f"Error in WebSocket test: {e}")
            import traceback
            traceback.print_exc()
    
    print("\nTest completed!")

if __name__ == "__main__":
    main()
