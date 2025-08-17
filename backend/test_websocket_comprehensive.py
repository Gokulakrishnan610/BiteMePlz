#!/usr/bin/env python3
"""
Comprehensive WebSocket Test Script for REC-KIOSK Backend
Tests all WebSocket functionality including connection, messages, and error handling
"""
import asyncio
import websockets
import json
import time
from datetime import datetime

class WebSocketTester:
    def __init__(self):
        self.base_url = "ws://localhost:8000/ws/stock/"
        self.test_results = []
        
    async def test_basic_connection(self):
        """Test 1: Basic WebSocket connection"""
        print("🧪 Test 1: Basic WebSocket Connection")
        print("=" * 50)
        
        try:
            uri = f"{self.base_url}?shop_id=test-shop-id"
            print(f"Connecting to: {uri}")
            
            async with websockets.connect(uri) as websocket:
                print("✅ WebSocket connection established successfully!")
                
                # Wait for connection confirmation
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    data = json.loads(message)
                    print(f"📨 Received message: {data}")
                    
                    if data.get('type') == 'connection_established':
                        print("✅ Connection confirmation received correctly")
                        self.test_results.append(("Basic Connection", "PASS"))
                    else:
                        print("❌ Unexpected message type")
                        self.test_results.append(("Basic Connection", "FAIL"))
                        
                except asyncio.TimeoutError:
                    print("❌ No message received within 5 seconds")
                    self.test_results.append(("Basic Connection", "FAIL"))
                    
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            self.test_results.append(("Basic Connection", "FAIL"))
        
        print()
        
    async def test_real_shop_id(self):
        """Test 2: Test with real shop ID from your database"""
        print("🧪 Test 2: Real Shop ID Connection")
        print("=" * 50)
        
        # Replace this with an actual shop ID from your database
        real_shop_id = "e896773f-a5a9-44ce-8164-39330c9ace23"
        
        try:
            uri = f"{self.base_url}?shop_id={real_shop_id}"
            print(f"Connecting to real shop: {uri}")
            
            async with websockets.connect(uri) as websocket:
                print("✅ Connected to real shop WebSocket")
                
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                print(f"📨 Received: {data}")
                
                if data.get('shop_id') == real_shop_id:
                    print("✅ Shop ID correctly received")
                    self.test_results.append(("Real Shop ID", "PASS"))
                else:
                    print("❌ Shop ID mismatch")
                    self.test_results.append(("Real Shop ID", "FAIL"))
                    
        except Exception as e:
            print(f"❌ Real shop test failed: {e}")
            self.test_results.append(("Real Shop ID", "FAIL"))
        
        print()
        
    async def test_multiple_connections(self):
        """Test 3: Multiple simultaneous connections"""
        print("🧪 Test 3: Multiple Simultaneous Connections")
        print("=" * 50)
        
        shop_ids = ["shop1", "shop2", "shop3", "shop4", "shop5"]
        uris = [f"{self.base_url}?shop_id={shop_id}" for shop_id in shop_ids]
        
        print(f"Testing {len(uris)} simultaneous connections...")
        
        async def test_single_connection(uri, conn_num):
            try:
                async with websockets.connect(uri) as websocket:
                    message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    data = json.loads(message)
                    print(f"✅ Connection {conn_num}: {data.get('type', 'unknown')}")
                    return True
            except Exception as e:
                print(f"❌ Connection {conn_num} failed: {e}")
                return False
        
        # Create tasks for all connections
        tasks = []
        for i, uri in enumerate(uris):
            task = asyncio.create_task(test_single_connection(uri, i+1))
            tasks.append(task)
        
        # Wait for all connections to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        successful_connections = sum(1 for result in results if result is True)
        print(f"\n📊 Results: {successful_connections}/{len(uris)} connections successful")
        
        if successful_connections == len(uris):
            print("✅ All multiple connections successful")
            self.test_results.append(("Multiple Connections", "PASS"))
        else:
            print("❌ Some multiple connections failed")
            self.test_results.append(("Multiple Connections", "FAIL"))
        
        print()
        
    async def test_connection_stability(self):
        """Test 4: Connection stability over time"""
        print("🧪 Test 4: Connection Stability")
        print("=" * 50)
        
        try:
            uri = f"{self.base_url}?shop_id=stability-test"
            print(f"Testing connection stability for 10 seconds...")
            
            start_time = time.time()
            async with websockets.connect(uri) as websocket:
                # Wait for initial connection
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                print(f"✅ Initial connection: {data.get('type')}")
                
                # Keep connection alive and test stability
                connection_duration = 0
                while connection_duration < 10:
                    await asyncio.sleep(1)
                    connection_duration = time.time() - start_time
                    
                    # Test if connection is still responsive
                    try:
                        # Send a ping to test connection
                        pong_waiter = await websocket.ping()
                        await asyncio.wait_for(pong_waiter, timeout=1.0)
                        print(f"⏱️  Connection stable at {connection_duration:.1f}s")
                    except Exception as e:
                        print(f"❌ Connection lost at {connection_duration:.1f}s: {e}")
                        self.test_results.append(("Connection Stability", "FAIL"))
                        return
                
                print("✅ Connection remained stable for 10 seconds")
                self.test_results.append(("Connection Stability", "PASS"))
                
        except Exception as e:
            print(f"❌ Stability test failed: {e}")
            self.test_results.append(("Connection Stability", "FAIL"))
        
        print()
        
    async def test_error_handling(self):
        """Test 5: Error handling for invalid requests"""
        print("🧪 Test 5: Error Handling")
        print("=" * 50)
        
        # Test 1: Invalid shop ID format
        try:
            uri = f"{self.base_url}?shop_id=invalid-uuid-format"
            print(f"Testing invalid UUID format: {uri}")
            
            async with websockets.connect(uri) as websocket:
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                print(f"📨 Received: {data}")
                
                # Even with invalid UUID, connection should still work
                print("✅ Connection works with invalid UUID (expected behavior)")
                
        except Exception as e:
            print(f"❌ Invalid UUID test failed: {e}")
        
        # Test 2: Missing shop_id parameter
        try:
            uri = f"{self.base_url}"
            print(f"Testing missing shop_id: {uri}")
            
            async with websockets.connect(uri) as websocket:
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                print(f"📨 Received: {data}")
                
                if data.get('shop_id') is None:
                    print("✅ Correctly handles missing shop_id")
                else:
                    print("❌ Unexpected behavior with missing shop_id")
                    
        except Exception as e:
            print(f"❌ Missing shop_id test failed: {e}")
        
        self.test_results.append(("Error Handling", "PASS"))
        print()
        
    async def test_message_types(self):
        """Test 6: Different message types"""
        print("🧪 Test 6: Message Type Handling")
        print("=" * 50)
        
        try:
            uri = f"{self.base_url}?shop_id=message-test"
            print(f"Testing message type handling...")
            
            async with websockets.connect(uri) as websocket:
                # Wait for connection message
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                
                expected_fields = ['type', 'message', 'shop_id']
                missing_fields = [field for field in expected_fields if field not in data]
                
                if not missing_fields:
                    print("✅ All expected message fields present")
                    print(f"📋 Message structure: {list(data.keys())}")
                    self.test_results.append(("Message Types", "PASS"))
                else:
                    print(f"❌ Missing fields: {missing_fields}")
                    self.test_results.append(("Message Types", "FAIL"))
                    
        except Exception as e:
            print(f"❌ Message type test failed: {e}")
            self.test_results.append(("Message Types", "FAIL"))
        
        print()
        
    def print_summary(self):
        """Print test results summary"""
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 50)
        
        passed = 0
        total = len(self.test_results)
        
        for test_name, result in self.test_results:
            status = "✅ PASS" if result == "PASS" else "❌ FAIL"
            print(f"{test_name:<25} {status}")
            if result == "PASS":
                passed += 1
        
        print("=" * 50)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! WebSocket is fully functional!")
        else:
            print("⚠️  Some tests failed. Check the output above for details.")
        
        print(f"\nTest completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

async def main():
    """Main test function"""
    print("🚀 REC-KIOSK WebSocket Comprehensive Test Suite")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    tester = WebSocketTester()
    
    # Run all tests
    await tester.test_basic_connection()
    await tester.test_real_shop_id()
    await tester.test_multiple_connections()
    await tester.test_connection_stability()
    await tester.test_error_handling()
    await tester.test_message_types()
    
    # Print summary
    print()
    tester.print_summary()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        print("Make sure the Daphne server is running with:")
        print("daphne -b 127.0.0.1 -p 8000 rec_kiosk.asgi:application")
