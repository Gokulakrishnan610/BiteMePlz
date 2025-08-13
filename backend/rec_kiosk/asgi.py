"""
ASGI config for rec_kiosk project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path

from api import consumers as api_consumers

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rec_kiosk.settings')

django_asgi_app = get_asgi_application()

websocket_urlpatterns = [
    path('ws/stock/', api_consumers.StockConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})