/**
 * Socket.IO Client Service
 *
 * Manages the long-lived WebSocket connection to the API's `/notifications`
 * namespace. Handles reconnection (exponential backoff) and event subscriptions.
 * Token is read from SecureStore at connect() time and re-used automatically on
 * reconnects because socket.io keeps the original handshake auth payload.
 *
 * Graceful degradation: if the socket fails to connect or authenticate, the
 * rest of the app keeps working with React Query polling as a fallback.
 */

import { io, type Socket } from "socket.io-client";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:4000";

const TOKEN_KEY = "vendhub_access_token";

let socket: Socket | null = null;
const listeners = new Map<string, Set<(data: unknown) => void>>();

/**
 * Connect to the `/notifications` WebSocket namespace.
 * No-op if already connected. Returns null if no access token is available.
 */
export async function connect(): Promise<Socket | null> {
  if (socket?.connected) return socket;

  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return null;

  // Namespace-qualified URL — backend NotificationGateway uses /notifications
  const url = `${API_URL}/notifications`;

  socket = io(url, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    timeout: 20000,
  });

  socket.on("connect", () => {
    console.log("[socket] connected", socket?.id);
    // Re-attach listeners registered before socket existed
    for (const [event, set] of listeners.entries()) {
      set.forEach((fn) => {
        socket?.on(event, fn);
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("[socket] disconnected:", reason);
  });

  socket.on("connect_error", (err: Error) => {
    console.warn("[socket] connect_error:", err.message);
  });

  return socket;
}

/**
 * Disconnect and clear all listeners. Call on logout.
 */
export function disconnect(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  listeners.clear();
}

/**
 * Subscribe to a socket event. Returns an unsubscribe function.
 * Safe to call before connect() — the listener is registered when the socket
 * becomes available (on "connect").
 */
export function subscribe<T = unknown>(
  event: string,
  listener: (data: T) => void,
): () => void {
  const cast = listener as (data: unknown) => void;
  const set = listeners.get(event) ?? new Set<(data: unknown) => void>();
  set.add(cast);
  listeners.set(event, set);

  if (socket) {
    socket.on(event, cast);
  }

  return () => {
    const current = listeners.get(event);
    if (current) {
      current.delete(cast);
      if (current.size === 0) listeners.delete(event);
    }
    if (socket) {
      socket.off(event, cast);
    }
  };
}

export function getSocket(): Socket | null {
  return socket;
}

export function isConnected(): boolean {
  return Boolean(socket?.connected);
}
