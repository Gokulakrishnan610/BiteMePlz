# REC-KIOSK Backend

A Django-based backend with WebSocket support for real-time stock updates and order management.

## Prerequisites

- Python 3.8+
- pip
- Virtual environment (recommended)

## Installation

1. **Create and activate virtual environment:**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

4. **Create superuser (optional):**
   ```bash
   python manage.py createsuperuser
   ```

## Running the Server

### ⚠️ IMPORTANT: Use Daphne for WebSocket Support

**DO NOT use `python manage.py runserver`** - it only supports HTTP requests, not WebSockets.

**Use this command instead:**
```bash
daphne -b 127.0.0.1 -p 8000 rec_kiosk.asgi:application
```

### 🚨 CRITICAL: Must Run from Backend Directory

**You MUST be in the `backend` directory** when running the command:

```bash
cd backend
daphne -b 127.0.0.1 -p 8000 rec_kiosk.asgi:application
```

**If you run from the wrong directory, you'll get:**
```
ModuleNotFoundError: No module named 'rec_kiosk'
```

### Why Daphne?

- ✅ **Supports WebSockets** for real-time stock updates
- ✅ **ASGI server** that works with Django Channels
- ✅ **Real-time communication** between frontend and backend
- ✅ **Handles both HTTP and WebSocket** connections

### Alternative Commands

If you need to run on different ports or interfaces:

```bash
# Run on all interfaces (accessible from other devices)
daphne -b 0.0.0.0 -p 8000 rec_kiosk.asgi:application

# Run on different port
daphne -b 127.0.0.1 -p 9000 rec_kiosk.asgi:application

# Run with debug output
daphne -v 2 -b 127.0.0.1 -p 8000 rec_kiosk.asgi:application
```

## WebSocket Endpoints

Once running with Daphne, these WebSocket endpoints will be available:

- **Stock Updates**: `ws://localhost:8000/ws/stock/?shop_id={shop_id}`
- **Order Updates**: `ws://localhost:8000/ws/orders/?shop_id={shop_id}`

## Testing WebSocket Connection

### 🧪 Basic WebSocket Test

Use the included test script to verify WebSocket functionality:

```bash
# Make sure you're in the backend directory
cd backend

# Run the basic test
python test_websocket.py

# Run the comprehensive test (recommended)
python test_websocket_comprehensive.py
```

**Expected Output (Basic Test):**
```
Testing WebSocket connection...
Attempting to connect to ws://localhost:8000/ws/stock/?shop_id=test-shop-id
WebSocket connection established successfully!
Received message: {'type': 'connection_established', 'message': 'WebSocket connected successfully', 'shop_id': 'test-shop-id'}
✅ WebSocket is working correctly!
🎉 WebSocket test completed successfully!
```

**Expected Output (Comprehensive Test):**
```
🚀 REC-KIOSK WebSocket Comprehensive Test Suite
============================================================
🧪 Test 1: Basic WebSocket Connection
🧪 Test 2: Real Shop ID Connection  
🧪 Test 3: Multiple Simultaneous Connections
🧪 Test 4: Connection Stability
🧪 Test 5: Error Handling
🧪 Test 6: Message Type Handling

📊 TEST RESULTS SUMMARY
==================================================
Basic Connection           ✅ PASS
Real Shop ID              ✅ PASS
Multiple Connections       ✅ PASS
Connection Stability       ✅ PASS
Error Handling            ✅ PASS
Message Types             ✅ PASS
==================================================
Total Tests: 6
Passed: 6
Failed: 0
🎉 ALL TESTS PASSED! WebSocket is fully functional!
```

### 🔍 Advanced WebSocket Testing

#### Test 1: Connection Establishment
```bash
python test_websocket.py
```

#### Test 2: Test with Real Shop ID
```bash
# Replace with an actual shop ID from your database
python -c "
import asyncio
import websockets
import json

async def test_real_shop():
    uri = 'ws://localhost:8000/ws/stock/?shop_id=e896773f-a5a9-44ce-8164-39330c9ace23'
    try:
        async with websockets.connect(uri) as websocket:
            print('✅ Connected to real shop WebSocket')
            message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(message)
            print(f'📨 Received: {data}')
    except Exception as e:
        print(f'❌ Error: {e}')

asyncio.run(test_real_shop())
"
```

#### Test 3: Test Multiple Connections
```bash
# Test multiple simultaneous connections
python -c "
import asyncio
import websockets
import json

async def test_multiple_connections():
    uris = [
        'ws://localhost:8000/ws/stock/?shop_id=shop1',
        'ws://localhost:8000/ws/stock/?shop_id=shop2',
        'ws://localhost:8000/ws/stock/?shop_id=shop3'
    ]
    
    tasks = []
    for i, uri in enumerate(uris):
        task = asyncio.create_task(test_single_connection(uri, i+1))
        tasks.append(task)
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            print(f'❌ Connection {i+1} failed: {result}')
        else:
            print(f'✅ Connection {i+1} successful')

async def test_single_connection(uri, conn_num):
    async with websockets.connect(uri) as websocket:
        message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
        data = json.loads(message)
        print(f'📨 Connection {conn_num}: {data}')
        return True

asyncio.run(test_multiple_connections())
"
```

### 🚨 Troubleshooting WebSocket Tests

**If tests fail, check:**

1. **Server is running:**
   ```bash
   netstat -an | findstr :8000
   # Should show: TCP    127.0.0.1:8000         0.0.0.0:0              LISTENING
   ```

2. **Correct directory:**
   ```bash
   pwd  # or dir on Windows
   # Should show: .../backend
   ```

3. **Server logs show:**
   ```
   Channels is available - WebSocket support enabled
   DEBUG: Using in-memory channel layer for development
   ASGI application configured with WebSocket support
   Listening on TCP address 127.0.0.1:8000
   ```

4. **No Redis errors:**
   - Should NOT see: `redis.exceptions.ResponseError: unknown command 'BZPOPMIN'`
   - Should see: `DEBUG: Using in-memory channel layer for development`

## Development vs Production

### Development (Current Setup)
- Uses **in-memory channel layer** (no Redis required)
- WebSocket support enabled
- Debug mode enabled

### Production
- Should use **Redis channel layer** for scalability
- Requires Redis server running
- Debug mode disabled

## Troubleshooting

### WebSocket Connection Failed
1. Make sure you're using `daphne`, not `python manage.py runserver`
2. Check that the server is running on the correct port
3. Verify the WebSocket URL in your frontend code

### Redis Errors
If you see Redis-related errors, the system will automatically fall back to in-memory channels.

### Port Already in Use
If port 8000 is busy, use a different port:
```bash
daphne -b 127.0.0.1 -p 8001 rec_kiosk.asgi:application
```

## File Structure

```
backend/
├── api/                    # Main application
│   ├── consumers.py       # WebSocket consumers
│   ├── models.py          # Database models
│   ├── views.py           # API views
│   └── urls.py            # URL routing
├── rec_kiosk/             # Project settings
│   ├── settings.py        # Django settings
│   ├── asgi.py            # ASGI configuration
│   └── urls.py            # Main URL routing
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## API Endpoints

- **Admin**: `http://localhost:8000/admin/`
- **API Base**: `http://localhost:8000/api/`
- **Media Files**: `http://localhost:8000/media/`

## Environment Variables

Create a `.env` file in the backend directory:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
JWT_SECRET=your-jwt-secret
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

## Support

For WebSocket issues, ensure:
1. ✅ Using `daphne` command (not `runserver`)
2. ✅ Server is running without errors
3. ✅ Frontend is connecting to correct WebSocket URL
4. ✅ No firewall blocking the connection 