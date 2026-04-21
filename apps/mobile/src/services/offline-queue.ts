/**
 * Offline Mutation Queue
 *
 * Persists failed mutations in AsyncStorage and retries on reconnect.
 * Prevents data loss (task completions, inventory transfers, etc.) when
 * network drops mid-request.
 *
 * Design notes:
 * - FIFO processing (creation order) for causal correctness
 * - MAX_QUEUE_SIZE (100) prevents unbounded storage growth
 * - MAX_ATTEMPTS (5) bounds retry spam; dropped after exhaustion
 * - In-memory mirror avoids re-reading AsyncStorage on every op
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

export interface QueuedMutation {
  id: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

const STORAGE_KEY = "vendhub:offline-mutation-queue";
const MAX_ATTEMPTS = 5;
const MAX_QUEUE_SIZE = 100;

let memoryQueue: QueuedMutation[] = [];
let loaded = false;
const listeners = new Set<(queue: QueuedMutation[]) => void>();

async function loadQueue(): Promise<QueuedMutation[]> {
  if (loaded) return memoryQueue;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    memoryQueue = raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
  } catch {
    // Corrupted queue — reset rather than crash the app
    memoryQueue = [];
  }
  loaded = true;
  return memoryQueue;
}

async function persistQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memoryQueue));
  } catch {
    // AsyncStorage failure — in-memory queue still intact, next persist may succeed
  }
  listeners.forEach((l) => l(memoryQueue.slice()));
}

export async function enqueue(
  mutation: Omit<QueuedMutation, "id" | "createdAt" | "attempts">,
): Promise<string> {
  await loadQueue();
  if (memoryQueue.length >= MAX_QUEUE_SIZE) {
    // Drop oldest to prevent unbounded storage
    memoryQueue.shift();
  }
  const queued: QueuedMutation = {
    ...mutation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  memoryQueue.push(queued);
  await persistQueue();
  return queued.id;
}

export async function getQueue(): Promise<QueuedMutation[]> {
  await loadQueue();
  return memoryQueue.slice();
}

export async function removeFromQueue(id: string): Promise<void> {
  await loadQueue();
  memoryQueue = memoryQueue.filter((m) => m.id !== id);
  await persistQueue();
}

export async function clearQueue(): Promise<void> {
  memoryQueue = [];
  await persistQueue();
}

export function subscribe(
  listener: (queue: QueuedMutation[]) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function flush(): Promise<{
  succeeded: number;
  failed: number;
  remaining: number;
}> {
  await loadQueue();
  let succeeded = 0;
  let failed = 0;

  // Process in FIFO order — important for correctness
  const snapshot = memoryQueue.slice();
  for (const mutation of snapshot) {
    try {
      await api.request({
        method: mutation.method,
        url: mutation.url,
        data: mutation.body,
        headers: mutation.headers,
      });
      await removeFromQueue(mutation.id);
      succeeded++;
    } catch (err) {
      mutation.attempts++;
      mutation.lastError = err instanceof Error ? err.message : String(err);
      if (mutation.attempts >= MAX_ATTEMPTS) {
        // Drop after max attempts — operator can inspect logs / re-submit manually
        await removeFromQueue(mutation.id);
      } else {
        // Keep in queue for next flush (attempts/lastError already updated in-place)
        await persistQueue();
      }
      failed++;
    }
  }

  return { succeeded, failed, remaining: memoryQueue.length };
}

/**
 * Heuristic network-error detector for mutation error branches.
 * Axios/fetch raise a variety of shapes — this catches the common ones
 * without pulling in axios-specific typing at every call site.
 */
export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  if (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnaborted") ||
    msg.includes("econnrefused") ||
    msg.includes("failed to fetch")
  ) {
    return true;
  }
  // Axios error without a response = network layer failure
  const maybeAxios = err as { response?: unknown; code?: string };
  if (maybeAxios.response === undefined) {
    if (
      maybeAxios.code === "ECONNABORTED" ||
      maybeAxios.code === "ERR_NETWORK" ||
      maybeAxios.code === "ETIMEDOUT"
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Test-only: resets in-memory state so tests don't bleed into each other.
 * Do NOT call from production code.
 */
export function __resetForTests(): void {
  memoryQueue = [];
  loaded = false;
  listeners.clear();
}
