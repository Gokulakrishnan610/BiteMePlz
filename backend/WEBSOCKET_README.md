# WebSocket Implementation for Live Data Updates

This document explains the WebSocket implementation that provides real-time updates for your REC-KIOSK application.

## 🚀 Features

- **Real-time stock updates** - Product stock changes are broadcasted instantly
- **Live order status updates** - Order status changes are pushed to connected clients
- **Product updates** - Product information changes are broadcasted in real-time
- **Shop-specific channels** - Each shop has its own WebSocket channel for isolated updates
- **Automatic fallback** - Falls back to in-memory channel layer if Redis is unavailable

## 📦 Dependencies

The following packages are required for WebSocket functionality:

```bash
pip install channels channels-redis redis websockets
```

## 🔧 Configuration

### 1. Django Settings

The WebSocket configuration is automatically handled in `settings.py`:

```python
# Channels configuration with automatic fallback
try:
    import channels
    INSTALLED_APPS += ['channels']
    ASGI_APPLICATION = 'rec_kiosk.asgi.application'
    
    # Try Redis first, fallback to in-memory
    try:
        import redis
        CHANNEL_LAYERS = {
            'default': {
                'BACKEND': 'channels_redis.core.RedisChannelLayer',
                'CONFIG': {
                    'hosts': [config('REDIS_URL', default='redis://127.0.0.1:6379')],
                },
            },
        }
    except Exception:
        CHANNEL_LAYERS = {
            'default': {
                'BACKEND': 'channels.layers.InMemoryChannelLayer',
            },
        }
except Exception:
    WSGI_APPLICATION = 'rec_kiosk.wsgi.application'
```

### 2. ASGI Configuration

WebSocket routing is configured in `asgi.py`:

```python
websocket_urlpatterns = [
    path('ws/stock/', api_consumers.StockConsumer.as_asgi()),
    path('ws/orders/', api_consumers.StockConsumer.as_asgi()),
]
```

## 🔌 WebSocket Endpoints

### Stock Updates
- **URL**: `ws://localhost:8000/ws/stock/?shop_id={shop_id}`
- **Purpose**: Receive real-time stock updates for a specific shop
- **Message Types**: `stock_update`, `product_update`, `order_update`, `notification`

### Order Updates
- **URL**: `ws://localhost:8000/ws/orders/?shop_id={shop_id}`
- **Purpose**: Receive real-time order status updates for a specific shop
- **Message Types**: `order_update`, `notification`

## 📡 Broadcasting Functions

### 1. Stock Updates
```python
from api.websocket_utils import broadcast_stock_update

broadcast_stock_update(
    product_id="product-uuid",
    stock=50,
    shop_id="shop-uuid"
)
```

### 2. Order Updates
```python
from api.websocket_utils import broadcast_order_update

broadcast_order_update(
    order_id="order-uuid",
    status="preparing",
    shop_id="shop-uuid"
)
```

### 3. Product Updates
```python
from api.websocket_utils import broadcast_product_update

broadcast_product_update(
    product_id="product-uuid",
    shop_id="shop-uuid",
    changes={"price": 9.99, "name": "Updated Name"}
)
```

### 4. Notifications
```python
from api.websocket_utils import broadcast_notification

broadcast_notification(
    message="New product available!",
    category="info",
    shop_id="shop-uuid"
)
```

## 🧪 Testing

### 1. Test WebSocket Broadcasting
```bash
python manage.py test_websocket --shop-id="your-shop-id" --message="Test message"
```

### 2. Test WebSocket Connection
```bash
python test_websocket.py
```

### 3. Frontend Testing
Open your browser console on the ShopPage and look for WebSocket connection messages.

## 🔄 Automatic Broadcasting

The following actions automatically trigger WebSocket broadcasts:

### Product Updates
- **Stock changes** → `stock_update` message
- **Product modifications** → `product_update` message
- **Product creation** → `product_update` message with `action: 'created'`

### Order Updates
- **Status changes** → `order_update` message
- **Verification changes** → Logged but not broadcasted (can be added if needed)

## 🌐 Frontend Integration

### WebSocket Connection
```typescript
const wsUrl = `ws://localhost:8000/ws/stock/?shop_id=${shopId}`;
const ws = new WebSocket(wsUrl);

ws.onmessage = (ev) => {
  const data = JSON.parse(ev.data);
  
  switch (data.type) {
    case 'stock_update':
      // Update product stock in UI
      break;
    case 'order_update':
      // Update order status in UI
      break;
    case 'product_update':
      // Update product information in UI
      break;
    case 'notification':
      // Show notification to user
      break;
  }
};
```

### Message Types

#### Stock Update
```json
{
  "type": "stock_update",
  "product_id": "uuid",
  "stock": 50,
  "shop_id": "uuid",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Order Update
```json
{
  "type": "order_update",
  "order_id": "uuid",
  "status": "preparing",
  "shop_id": "uuid",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Product Update
```json
{
  "type": "product_update",
  "product_id": "uuid",
  "shop_id": "uuid",
  "changes": {
    "price": 9.99,
    "name": "Updated Name"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Notification
```json
{
  "type": "notification",
  "message": "New product available!",
  "category": "info",
  "shop_id": "uuid",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## 🚨 Troubleshooting

### Common Issues

1. **WebSocket connection refused**
   - Ensure Django server is running with ASGI support
   - Check if channels is properly installed
   - Verify ASGI configuration

2. **No messages received**
   - Check browser console for connection errors
   - Verify shop_id parameter is correct
   - Check Django server logs for broadcasting errors

3. **Redis connection issues**
   - WebSocket will automatically fallback to in-memory channel layer
   - Check Redis server status if you want persistent channels

### Debug Mode

Enable debug logging in your Django settings:
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'channels': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

## 🔒 Security Considerations

- WebSocket connections are authenticated via Django's authentication system
- Each shop has isolated channels to prevent cross-shop data leakage
- Connection parameters are validated before establishing channels

## 📈 Performance

- **In-memory channel layer**: Fastest for development and small deployments
- **Redis channel layer**: Better for production with multiple server instances
- **Automatic cleanup**: Disconnected clients are automatically removed from channels

## 🚀 Production Deployment

For production deployment:

1. **Install Redis** for persistent channel layers
2. **Set REDIS_URL** environment variable
3. **Use ASGI server** like Daphne or Uvicorn
4. **Configure WebSocket proxy** in your web server (nginx, etc.)

Example nginx configuration:
```nginx
location /ws/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 📚 Additional Resources

- [Django Channels Documentation](https://channels.readthedocs.io/)
- [WebSocket API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Redis Documentation](https://redis.io/documentation)
