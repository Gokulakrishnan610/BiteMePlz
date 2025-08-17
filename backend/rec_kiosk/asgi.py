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
logger = logging.getLogger(__name__)

try:
    from channels.routing import ProtocolTypeRouter, URLRouter
    from channels.auth import AuthMiddlewareStack
    from django.urls import path
    from api import consumers as api_consumers
    _channels_available = True
    logger.info("Channels is available - WebSocket support enabled")
except Exception as e:
    _channels_available = False
    logger.warning(f"Channels not available: {e}")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rec_kiosk.settings')

django_asgi_app = get_asgi_application()

if _channels_available:
    websocket_urlpatterns = [
        path('ws/stock/', api_consumers.StockConsumer.as_asgi()),
        path('ws/orders/', api_consumers.StockConsumer.as_asgi()),  # Reuse for now, can add separate consumer later
    ]
    
    application = ProtocolTypeRouter({
        'http': django_asgi_app,
        'websocket': AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
    })
    logger.info("ASGI application configured with WebSocket support")
else:
    # Plain ASGI app without websockets
    application = django_asgi_app
    logger.info("ASGI application configured without WebSocket support")