"""
ASGI config for rec_kiosk project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rec_kiosk.settings')

# Get Django ASGI application
django_asgi_app = get_asgi_application()

# Check if channels is available
try:
    from channels.routing import ProtocolTypeRouter, URLRouter
    from channels.auth import AuthMiddlewareStack
    from django.urls import path
    from api.consumers import StockConsumer
    
    # WebSocket URL patterns
    websocket_urlpatterns = [
        path('ws/stock/', StockConsumer.as_asgi()),
        path('ws/orders/', StockConsumer.as_asgi()),  # Reuse for now, can add separate consumer later
    ]
    
    # ASGI application with WebSocket support
    application = ProtocolTypeRouter({
        'http': django_asgi_app,
        'websocket': AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    })
    
    print("DEBUG: ASGI configured with WebSocket support")
    
except ImportError as e:
    print(f"DEBUG: Channels not available, using basic ASGI: {e}")
    # Fallback to basic ASGI without WebSocket support
    application = django_asgi_app
except Exception as e:
    print(f"DEBUG: Error configuring ASGI with WebSocket: {e}")
    # Fallback to basic ASGI
    application = django_asgi_app