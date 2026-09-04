import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getApiBaseUrl } from '../api';
import { useAuth } from './AuthContext';
import type {
  ConnectionMode,
  RealtimeEventHandler,
  RealtimeEventPayload,
  RealtimeEventType,
} from '../lib/realtime';

interface PollingConfig {
  enabled?: boolean;
  intervalMs?: number;
  fetcher: () => void | Promise<void>;
}

interface InternalSubscription {
  id: number;
  shopIds: string[];
  events: Partial<Record<RealtimeEventType, RealtimeEventHandler>>;
  polling?: PollingConfig;
}

interface EventStreamContextValue {
  connectionMode: ConnectionMode;
  isLiveConnected: boolean;
  register: (subscription: Omit<InternalSubscription, 'id'>) => () => void;
}

const EventStreamContext = createContext<EventStreamContextValue | undefined>(undefined);

const DEFAULT_POLL_INTERVAL_MS = 12000;
const SSE_ERROR_THRESHOLD = 3;

function buildStreamUrl(shopIds: string[], token: string | null): string {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const params = new URLSearchParams();
  if (shopIds.length > 0) {
    params.set('shop_ids', shopIds.join(','));
  }
  if (token) {
    params.set('token', token);
  }
  const query = params.toString();
  return `${base}/api/events/stream${query ? `?${query}` : ''}`;
}

export const EventStreamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('disconnected');
  const subscriptionsRef = useRef<Map<number, InternalSubscription>>(new Map());
  const nextIdRef = useRef(1);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const sseErrorCountRef = useRef(0);
  const [subscriptionVersion, setSubscriptionVersion] = useState(0);

  const mergedShopIds = useMemo(() => {
    const ids = new Set<string>();
    subscriptionsRef.current.forEach((sub) => {
      sub.shopIds.forEach((shopId) => ids.add(shopId));
    });
    return Array.from(ids).sort();
  }, [subscriptionVersion, token]);

  const dispatchEvent = useCallback((eventType: RealtimeEventType, data: RealtimeEventPayload) => {
    subscriptionsRef.current.forEach((sub) => {
      const handler = sub.events[eventType];
      if (handler) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Realtime handler failed for ${eventType}:`, error);
        }
      }
    });
  }, []);

  const runPolling = useCallback(async () => {
    const seenFetchers = new Set<() => void | Promise<void>>();
    subscriptionsRef.current.forEach((sub) => {
      if (sub.polling?.enabled === false || !sub.polling?.fetcher) return;
      if (seenFetchers.has(sub.polling.fetcher)) return;
      seenFetchers.add(sub.polling.fetcher);
    });

    for (const fetcher of seenFetchers) {
      try {
        await fetcher();
      } catch {
        // Continue polling other fetchers
      }
    }
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    setConnectionMode('polling');

    const intervals = Array.from(subscriptionsRef.current.values())
      .map((sub) => sub.polling?.intervalMs)
      .filter((value): value is number => typeof value === 'number' && value > 0);
    const intervalMs = intervals.length > 0 ? Math.min(...intervals) : DEFAULT_POLL_INTERVAL_MS;

    runPolling();
    pollTimerRef.current = window.setInterval(runPolling, intervalMs);
  }, [runPolling, stopPolling]);

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const attachEventSource = useCallback(
    (eventSource: EventSource) => {
      const eventTypes: RealtimeEventType[] = [
        'stock_update',
        'order_update',
        'order_verification',
        'product_update',
        'notification',
        'wallet_update',
      ];

      eventSource.addEventListener('open', () => {
        sseErrorCountRef.current = 0;
        setConnectionMode('sse');
        stopPolling();
      });

      eventSource.addEventListener('error', () => {
        sseErrorCountRef.current += 1;
        if (sseErrorCountRef.current >= SSE_ERROR_THRESHOLD) {
          closeEventSource();
          startPolling();
        }
      });

      eventTypes.forEach((eventType) => {
        eventSource.addEventListener(eventType, (event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data) as RealtimeEventPayload;
            dispatchEvent(eventType, data);
          } catch (error) {
            console.error(`Failed to parse SSE event ${eventType}:`, error);
          }
        });
      });

      eventSource.addEventListener('connected', () => {
        setConnectionMode('sse');
      });
    },
    [closeEventSource, dispatchEvent, startPolling, stopPolling],
  );

  const connectStream = useCallback(() => {
    closeEventSource();
    stopPolling();

    const hasSubscriptions = subscriptionsRef.current.size > 0;
    const hasPollingOnly = Array.from(subscriptionsRef.current.values()).some(
      (sub) => sub.polling?.fetcher,
    );

    if (!hasSubscriptions && !token) {
      setConnectionMode('disconnected');
      return;
    }

    if (typeof EventSource === 'undefined') {
      startPolling();
      return;
    }

    const streamUrl = buildStreamUrl(mergedShopIds, token);
    const eventSource = new EventSource(streamUrl);
    eventSourceRef.current = eventSource;
    attachEventSource(eventSource);

    if (hasPollingOnly) {
      // Run an immediate poll while SSE warms up
      runPolling();
    }
  }, [
    attachEventSource,
    closeEventSource,
    mergedShopIds,
    runPolling,
    startPolling,
    stopPolling,
    token,
  ]);

  useEffect(() => {
    connectStream();
    return () => {
      closeEventSource();
      stopPolling();
      setConnectionMode('disconnected');
    };
  }, [connectStream, closeEventSource, stopPolling]);

  const register = useCallback((subscription: Omit<InternalSubscription, 'id'>) => {
    const id = nextIdRef.current++;
    subscriptionsRef.current.set(id, { id, ...subscription });
    setSubscriptionVersion((value) => value + 1);

    return () => {
      subscriptionsRef.current.delete(id);
      setSubscriptionVersion((value) => value + 1);
    };
  }, []);

  const value = useMemo(
    () => ({
      connectionMode,
      isLiveConnected: connectionMode === 'sse' || connectionMode === 'polling',
      register,
    }),
    [connectionMode, register],
  );

  return <EventStreamContext.Provider value={value}>{children}</EventStreamContext.Provider>;
};

export const useEventStream = () => {
  const context = useContext(EventStreamContext);
  if (!context) {
    throw new Error('useEventStream must be used within an EventStreamProvider');
  }
  return context;
};
