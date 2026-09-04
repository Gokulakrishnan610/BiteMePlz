"""
Server-Sent Events (SSE) endpoint for lightweight real-time updates.
Replaces WebSocket connections for one-way server → client push.
"""
from __future__ import annotations

import json
import logging

from django.http import StreamingHttpResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from .event_bus import shop_channel, subscribe, user_channel

logger = logging.getLogger(__name__)


def _get_user_from_token(token: str | None):
    if not token:
        return None

    try:
        from rest_framework_simplejwt.tokens import AccessToken
        from api.models import User

        access = AccessToken(token.strip())
        return User.objects.filter(id=access['user_id']).first()
    except Exception:
        return None


def _sse_message(event_type: str, data: dict) -> str:
    return f'event: {event_type}\ndata: {json.dumps(data)}\n\n'


def _event_stream(channels: list[str]):
    yield _sse_message('connected', {'channels': channels, 'transport': 'sse'})

    try:
        for payload in subscribe(channels):
            event_type = payload.pop('type', 'message')
            if event_type == 'ping':
                yield ': keepalive\n\n'
                continue
            yield _sse_message(event_type, payload)
    except GeneratorExit:
        logger.info('SSE client disconnected from channels: %s', channels)
    except Exception as exc:
        logger.error('SSE stream error: %s', exc)
        yield _sse_message('error', {'message': 'stream_error'})


@method_decorator(csrf_exempt, name='dispatch')
class EventStreamView(View):
  """
  GET /api/events/stream/?shop_ids=<uuid>,<uuid>&token=<jwt>

  - shop_ids: comma-separated shop UUIDs (public stock/order events)
  - token: optional JWT for user-scoped wallet events
  """

  def get(self, request):
    shop_ids_param = request.GET.get('shop_ids', '')
    shop_ids = [shop_id.strip() for shop_id in shop_ids_param.split(',') if shop_id.strip()]

    channels = [shop_channel(shop_id) for shop_id in shop_ids]

    token = request.GET.get('token') or request.META.get('HTTP_AUTHORIZATION', '').replace('Bearer ', '')
    user = _get_user_from_token(token)
    if user:
        channels.append(user_channel(str(user.id)))

    if not channels:
        channels = [shop_channel('public')]

    response = StreamingHttpResponse(
        _event_stream(channels),
        content_type='text/event-stream',
    )
    response['Cache-Control'] = 'no-cache, no-transform'
    response['X-Accel-Buffering'] = 'no'
    response['Connection'] = 'keep-alive'
    return response
