/**
 * useOfflineQueue
 *
 * Subscribes to the offline mutation queue and auto-flushes when network
 * returns. Also exposes a manual retry callback for UI (e.g. badge tap).
 */

import { useCallback, useEffect, useState } from "react";
import { useNetworkStatus } from "./useNetworkStatus";
import {
  QueuedMutation,
  flush,
  getQueue,
  subscribe,
} from "../services/offline-queue";

interface FlushResult {
  succeeded: number;
  failed: number;
  remaining: number;
}

export function useOfflineQueue() {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOnline = isConnected && isInternetReachable;

  const [queue, setQueue] = useState<QueuedMutation[]>([]);
  const [flushing, setFlushing] = useState(false);

  // Load initial queue + subscribe to updates
  useEffect(() => {
    let mounted = true;
    getQueue().then((q) => {
      if (mounted) setQueue(q);
    });
    const unsub = subscribe((q) => {
      if (mounted) setQueue(q);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // Auto-flush when online and queue non-empty
  useEffect(() => {
    if (!isOnline || queue.length === 0 || flushing) return;
    setFlushing(true);
    flush().finally(() => setFlushing(false));
  }, [isOnline, queue.length, flushing]);

  const retry = useCallback(async (): Promise<FlushResult> => {
    setFlushing(true);
    try {
      return await flush();
    } finally {
      setFlushing(false);
    }
  }, []);

  return {
    queue,
    count: queue.length,
    flushing,
    isOnline,
    retry,
  };
}
