import { useEffect, useRef } from 'react';
import type { RealtimeEventHandler, RealtimeEventType } from '../lib/realtime';

type EventHandlers = Partial<Record<RealtimeEventType, RealtimeEventHandler>>;

interface UsePollingOptions {
  enabled?: boolean;
  intervalMs?: number;
  fetcher: () => void | Promise<void>;
}

interface UseEventStreamSubscriptionOptions {
  shopIds?: string[];
  events?: EventHandlers;
  polling?: UsePollingOptions;
}

/**
 * Subscribe to multiplexed SSE events (with polling fallback) for the given shops.
 * Cleans up automatically on unmount.
 */
export function useEventStreamSubscription(
  register: (subscription: {
    shopIds: string[];
    events: EventHandlers;
    polling?: UsePollingOptions;
  }) => () => void,
  options: UseEventStreamSubscriptionOptions,
) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const current = optionsRef.current;
    const shopIds = (current.shopIds || []).filter(Boolean);

    return register({
      shopIds,
      events: current.events || {},
      polling: current.polling,
    });
    // Re-register when shop ids or handler identities change
  }, [
    register,
    JSON.stringify(options.shopIds || []),
    options.events?.stock_update,
    options.events?.order_verification,
    options.events?.order_update,
    options.events?.product_update,
    options.events?.wallet_update,
    options.events?.notification,
    options.polling?.enabled,
    options.polling?.intervalMs,
    options.polling?.fetcher,
  ]);
}

/**
 * Simple interval polling hook used as SSE fallback.
 */
export function usePolling(enabled: boolean, intervalMs: number, fetcher: () => void | Promise<void>) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      try {
        await fetcher();
      } catch {
        // Ignore polling errors; next tick will retry
      }
    };

    run();
    const timer = window.setInterval(run, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs, fetcher]);
}
