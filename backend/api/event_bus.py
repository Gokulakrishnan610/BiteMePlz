"""
Lightweight real-time event bus backed by Redis pub/sub with in-memory fallback.
Used by SSE streams and replaces Django Channels group_send for server-push events.
"""
from __future__ import annotations

import json
import logging
import queue
import threading
import time
from datetime import datetime
from typing import Any, Dict, Iterator, Optional

from django.conf import settings

logger = logging.getLogger(__name__)

REDIS_PREFIX = 'rec_kiosk:events:'
_memory_subscribers: Dict[str, set] = {}
_memory_lock = threading.Lock()
_redis_client = None
_redis_checked = False


def shop_channel(shop_id: str) -> str:
    return f'{REDIS_PREFIX}shop:{shop_id}'


def user_channel(user_id: str) -> str:
    return f'{REDIS_PREFIX}user:{user_id}'


def _get_redis():
    global _redis_client, _redis_checked
    if _redis_checked:
        return _redis_client

    _redis_checked = True
    redis_url = getattr(settings, 'CELERY_BROKER_URL', None) or getattr(settings, 'REDIS_URL', None)
    if not redis_url:
        return None

    try:
        import redis

        _redis_client = redis.from_url(redis_url, decode_responses=True)
        _redis_client.ping()
        logger.info('Event bus using Redis pub/sub')
    except Exception as exc:
        logger.warning('Event bus falling back to in-memory pub/sub: %s', exc)
        _redis_client = None

    return _redis_client


def publish_event(channel: str, event_type: str, payload: Optional[Dict[str, Any]] = None) -> None:
    """Publish a typed event to a channel."""
    message = {
        'type': event_type,
        'timestamp': datetime.now().isoformat(),
        **(payload or {}),
    }

    redis_client = _get_redis()
    if redis_client:
        try:
            redis_client.publish(channel, json.dumps(message))
            return
        except Exception as exc:
            logger.error('Redis publish failed, using in-memory fallback: %s', exc)

    serialized = json.dumps(message)
    with _memory_lock:
        for subscriber in list(_memory_subscribers.get(channel, set())):
            try:
                subscriber.put_nowait(serialized)
            except queue.Full:
                pass


def subscribe(channels: list[str]) -> Iterator[Dict[str, Any]]:
    """
    Blocking generator that yields parsed events from one or more channels.
    Used by the SSE streaming view.
    """
    if not channels:
        channels = [f'{REDIS_PREFIX}global']

    redis_client = _get_redis()
    if redis_client:
        yield from _subscribe_redis(redis_client, channels)
    else:
        yield from _subscribe_memory(channels)


def _subscribe_redis(redis_client, channels: list[str]) -> Iterator[Dict[str, Any]]:
    pubsub = redis_client.pubsub(ignore_subscribe_messages=True)
    pubsub.subscribe(*channels)
    last_ping = time.time()

    try:
        while True:
            message = pubsub.get_message(timeout=1.0)
            if message and message.get('type') == 'message':
                try:
                    yield json.loads(message['data'])
                except json.JSONDecodeError:
                    continue

            if time.time() - last_ping >= 15:
                yield {'type': 'ping'}
                last_ping = time.time()
    finally:
        try:
            pubsub.unsubscribe(*channels)
            pubsub.close()
        except Exception:
            pass


def _subscribe_memory(channels: list[str]) -> Iterator[Dict[str, Any]]:
    event_queue: queue.Queue[str] = queue.Queue(maxsize=256)

    with _memory_lock:
        for channel in channels:
            _memory_subscribers.setdefault(channel, set()).add(event_queue)

    last_ping = time.time()
    try:
        while True:
            try:
                raw = event_queue.get(timeout=1.0)
                yield json.loads(raw)
            except queue.Empty:
                pass

            if time.time() - last_ping >= 15:
                yield {'type': 'ping'}
                last_ping = time.time()
    finally:
        with _memory_lock:
            for channel in channels:
                subscribers = _memory_subscribers.get(channel)
                if subscribers:
                    subscribers.discard(event_queue)
