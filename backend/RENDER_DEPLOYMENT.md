# 🚀 Render Deployment Guide for WebSocket Support

## ⚠️ **CRITICAL: WebSocket Support Requires ASGI Server**

Your current setup has been updated to support WebSockets on Render. Here's what changed and what you need to know:

## 🔧 **What Was Updated:**

### 1. **Procfile** - Changed from WSGI to ASGI:
```diff
- web: gunicorn rec_kiosk.wsgi:application
+ web: daphne rec_kiosk.asgi:application --bind 0.0.0.0 --port $PORT
```

### 2. **requirements.txt** - Added Daphne:
```diff
+ daphne==4.1.0
```

### 3. **settings.py** - Smart Channel Layer Selection:
- **Development**: Uses in-memory channel layer
- **Production**: Uses Redis channel layer (for Render)

### 4. **ASGI Configuration** - WebSocket Support:
- Updated `asgi.py` for proper WebSocket routing
- Added `websocket_urlpatterns` to `consumers.py`

## 🚀 **Deployment Steps:**

### **Step 1: Push Your Changes**
```bash
git add .
git commit -m "Add WebSocket support with Daphne ASGI server"
git push origin main
```

### **Step 2: Render Will Auto-Deploy**
- ✅ **No manual changes needed in Render dashboard**
- ✅ **Auto-deploy on push is enabled**
- ✅ **Build will use new Procfile and requirements**

### **Step 3: Verify Deployment**
1. Check Render build logs for success
2. Test WebSocket connection to your Render URL
3. Monitor for any Redis connection issues

## 🔍 **What Happens During Deployment:**

1. **Build Phase:**
   - Installs `daphne` ASGI server
   - Installs `channels` and `channels-redis`
   - Uses new `Procfile` with Daphne

2. **Runtime:**
   - Daphne starts instead of Gunicorn
   - ASGI application loads with WebSocket support
   - Channel layers configured for production

## 🌐 **Production WebSocket URLs:**

Your WebSocket endpoints will be available at:
```
wss://your-app-name.onrender.com/ws/stock/?shop_id=SHOP_ID
wss://your-app-name.onrender.com/ws/orders/?shop_id=SHOP_ID
```

## ⚡ **Performance Considerations:**

### **Channel Layer Backend:**
- **Development**: In-memory (fast, single-process)
- **Production**: Redis (scalable, multi-process)

### **Redis Requirements:**
- Render provides Redis add-on
- Set `REDIS_URL` environment variable
- Fallback to in-memory if Redis unavailable

## 🚨 **Potential Issues & Solutions:**

### **1. Redis Connection Failed:**
```
Error: Redis connection failed
Solution: Check REDIS_URL environment variable in Render
```

### **2. Daphne Not Found:**
```
Error: daphne command not found
Solution: Ensure daphne==4.1.0 is in requirements.txt
```

### **3. WebSocket Connection Refused:**
```
Error: WebSocket connection failed
Solution: Verify ASGI application is loading correctly
```

## 📊 **Monitoring & Debugging:**

### **Render Logs:**
- Check build logs for package installation
- Monitor runtime logs for ASGI startup
- Look for WebSocket connection attempts

### **Health Check:**
- HTTP endpoints should work normally
- WebSocket endpoints should accept connections
- Channel layer should be Redis (not in-memory)

## ✅ **Success Indicators:**

1. **Build Success:** No errors during package installation
2. **Runtime Success:** Daphne starts without errors
3. **WebSocket Success:** Connections accepted at `/ws/stock/`
4. **Channel Layer:** Redis backend active in production

## 🔄 **Rollback Plan:**

If issues occur, you can quickly rollback:
```bash
git revert HEAD
git push origin main
```

## 📝 **Environment Variables (Optional):**

For optimal performance, consider setting in Render:
```
REDIS_URL=redis://your-redis-instance:port
DEBUG=False
```

## 🎯 **Next Steps After Deployment:**

1. **Test WebSocket Connection:**
   ```javascript
   const ws = new WebSocket('wss://your-app.onrender.com/ws/stock/?shop_id=test');
   ```

2. **Update Frontend URLs:**
   - Change from `ws://localhost:8000` to `wss://your-app.onrender.com`

3. **Monitor Performance:**
   - Check WebSocket connection stability
   - Monitor Redis usage

## 🚀 **Ready to Deploy!**

Your code is now WebSocket-ready for Render. Just push and it will auto-deploy with full WebSocket support!

**No manual Render dashboard changes needed.** 🎉
