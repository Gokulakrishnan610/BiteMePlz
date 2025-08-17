"""
ASGI config for rec_kiosk project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os
import logging
from django.core.asgi import get_asgi_application

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rec_kiosk.settings')

# Get Django ASGI application
django_asgi_app = get_asgi_application()

# Check if channels is available
try:
    logger.info("Attempting to configure ASGI with WebSocket support...")
    
    from channels.routing import ProtocolTypeRouter, URLRouter
    from channels.auth import AuthMiddlewareStack
    from django.urls import path
    from api.consumers import StockConsumer
    
    logger.info("Successfully imported channels components")
    
    # WebSocket URL patterns
    websocket_urlpatterns = [
        path('ws/stock/', StockConsumer.as_asgi()),
        path('ws/orders/', StockConsumer.as_asgi()),  # Reuse for now, can add separate consumer later
        path('ws/wallet/', StockConsumer.as_asgi()),  # Wallet updates
    ]
    
    logger.info(f"WebSocket URL patterns configured: {websocket_urlpatterns}")
    
    # ASGI application with WebSocket support
    application = ProtocolTypeRouter({
        'http': django_asgi_app,
        'websocket': AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    })
    
    logger.info("✅ ASGI configured with WebSocket support successfully")
    print("DEBUG: ASGI configured with WebSocket support")
    
except ImportError as e:
    logger.error(f"Channels not available: {e}")
    print(f"DEBUG: Channels not available, using basic ASGI: {e}")
    # Fallback to basic ASGI without WebSocket support
    application = django_asgi_app
except Exception as e:
    logger.error(f"Error configuring ASGI with WebSocket: {e}")
    print(f"DEBUG: Error configuring ASGI with WebSocket: {e}")
    # Fallback to basic ASGI
    application = django_asgi_app