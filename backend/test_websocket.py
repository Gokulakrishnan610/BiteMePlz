#!/usr/bin/env python3
"""
Simple WebSocket test script to check if the WebSocket endpoint is working
"""
import asyncio
import websockets
import json

async def test_websocket():
    """Test WebSocket connection to the stock endpoint"""
    uri = "ws://localhost:8000/ws/stock/?shop_id=test-shop-id"
    
    try:
        print(f"Attempting to connect to {uri}")
        async with websockets.connect(uri) as websocket:
            print("WebSocket connection established successfully!")
            
            # Wait for the connection confirmation message
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                print(f"Received message: {data}")
                
                if data.get('type') == 'connection_established':
                    print("✅ WebSocket is working correctly!")
                else:
                    print("⚠️  Unexpected message type received")
                    
            except asyncio.TimeoutError:
                print("⚠️  No message received within 5 seconds")
                
    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("Testing WebSocket connection...")
    success = asyncio.run(test_websocket())
    
    if success:
        print("\n🎉 WebSocket test completed successfully!")
    else:
        print("\n💥 WebSocket test failed!")
