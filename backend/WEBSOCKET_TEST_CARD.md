# 🚀 WebSocket Testing Quick Reference

## 🚨 CRITICAL: Must Run from Backend Directory

```bash
cd backend
```

## 🧪 Quick Tests

### 1. Basic Connection Test
```bash
python test_websocket.py
```

### 2. Comprehensive Test (Recommended)
```bash
python test_websocket_comprehensive.py
```

### 3. Manual Test
```bash
python -c "
import asyncio
import websockets
import json

async def test():
    uri = 'ws://localhost:8000/ws/stock/?shop_id=test-shop'
    async with websockets.connect(uri) as ws:
        msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
        print(f'✅ Connected! Message: {json.loads(msg)}')

asyncio.run(test())
"
```

## 🔍 What to Look For

### ✅ Success Indicators
- `Channels is available - WebSocket support enabled`
- `DEBUG: Using in-memory channel layer for development`
- `ASGI application configured with WebSocket support`
- `Listening on TCP address 127.0.0.1:8000`
- `WSCONNECT /ws/stock/`

### ❌ Failure Indicators
- `ModuleNotFoundError: No module named 'rec_kiosk'` (wrong directory)
- `redis.exceptions.ResponseError: unknown command 'BZPOPMIN'` (Redis issue)
- `Connection refused` (server not running)
- `404 Not Found` (wrong server type)

## 🚀 Start Server Commands

### Windows
```bash
# Double-click start_server.bat
# OR
start_server.bat
```

### PowerShell
```bash
# Right-click start_server.ps1 → "Run with PowerShell"
# OR
.\start_server.ps1
```

### Manual
```bash
daphne -b 127.0.0.1 -p 8000 rec_kiosk.asgi:application
```

## 📱 Frontend Connection URL

```javascript
const wsUrl = `ws://localhost:8000/ws/stock/?shop_id=${shopId}`;
```

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| `ModuleNotFoundError` | Run from `backend` directory |
| `Connection refused` | Start Daphne server |
| `404 Not Found` | Use Daphne, not `runserver` |
| Redis errors | Check settings.py channel layers |
| Port busy | Use different port: `-p 8001` |

## 🎯 Test Checklist

- [ ] Server running with Daphne
- [ ] In `backend` directory
- [ ] Basic test passes
- [ ] Comprehensive test passes
- [ ] Frontend connects successfully
- [ ] Real-time updates working
