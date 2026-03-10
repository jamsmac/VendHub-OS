"use client";

/**
 * WebSocket hook for real-time updates in VendHub Admin Panel
 *
 * Connects to NestJS WebSocket server (Socket.IO) for:
 * - Machine status changes (online/offline/error)
 * - Machine inventory updates (low stock alerts)
 * - Order lifecycle events (created, processing, completed)
 * - Notifications (alerts, system messages)
 * - Loyalty events (tier upgrades, quest completions)
 *
 * Namespaces:
 *   /machines — machine telemetry & status
 *   /orders — order lifecycle
 *   /notifications — alerts & presence
 *
 * Authentication: JWT token from in-memory store + httpOnly cookies
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "../api";

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

export interface MachineStatusEvent {
  machineId: number;
  status: "online" | "offline" | "error" | "maintenance";
  previousStatus?: string;
  timestamp: string;
}

export interface MachineInventoryEvent {
  machineId: number;
  productId: number;
  quantity: number;
  threshold?: number;
  timestamp: string;
}

export interface MachineErrorEvent {
  machineId: number;
  error: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: string;
}

export interface OrderEvent {
  orderId: number;
  status: string;
  machineId?: number;
  userId?: number;
  total?: number;
  timestamp: string;
}

export interface NotificationEvent {
  id: string;
  type: "alert" | "info" | "warning" | "success";
  title: string;
  message: string;
  actionUrl?: string;
  timestamp: string;
}

export interface LoyaltyEvent {
  userId: number;
  type:
    | "points_earned"
    | "points_redeemed"
    | "tier_upgrade"
    | "quest_completed";
  data: Record<string, unknown>;
  timestamp: string;
}

export type RealtimeEventMap = {
  "machine:status": MachineStatusEvent;
  "machine:inventory": MachineInventoryEvent;
  "machine:error": MachineErrorEvent;
  "machine:heartbeat": { machineId: number; timestamp: string };
  "order:created": OrderEvent;
  "order:status": OrderEvent;
  "order:completed": OrderEvent;
  notification: NotificationEvent;
  "notification:broadcast": NotificationEvent;
  "loyalty:points_earned": LoyaltyEvent;
  "loyalty:tier_upgrade": LoyaltyEvent;
  "loyalty:quest_completed": LoyaltyEvent;
};

type EventHandler<K extends keyof RealtimeEventMap> = (
  data: RealtimeEventMap[K],
) => void;

interface SocketLike {
  connected: boolean;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler?: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  connect(): void;
  disconnect(): void;
}

// ═══════════════════════════════════════
// SOCKET CONNECTION MANAGER
// ═══════════════════════════════════════

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

// Lazy import of socket.io-client (only when actually used)
let ioModule: unknown = null;

async function getIO(): Promise<unknown> {
  if (ioModule) return ioModule;
  try {
    ioModule = await import("socket.io-client");
    return ioModule;
  } catch {
    console.warn(
      "[WebSocket] socket.io-client not installed. Real-time updates disabled.",
    );
    console.warn("[WebSocket] Install with: pnpm add socket.io-client");
    return null;
  }
}

// ═══════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════

interface UseRealtimeUpdatesOptions {
  /** WebSocket namespace to connect to */
  namespace?: "/machines" | "/orders" | "/notifications";
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Rooms to subscribe to */
  subscribeRooms?: string[];
  /** Auto-invalidate React Query keys on events */
  autoInvalidate?: boolean;
}

export function useRealtimeUpdates(options: UseRealtimeUpdatesOptions = {}) {
  const {
    namespace = "/notifications",
    autoConnect = true,
    subscribeRooms = [],
    autoInvalidate = true,
  } = options;

  const socketRef = useRef<SocketLike | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{
    event: string;
    data: unknown;
  } | null>(null);
  const handlersRef = useRef<Map<string, Set<(...args: unknown[]) => void>>>(
    new Map(),
  );
  const queryClient = useQueryClient();

  // Connect to WebSocket
  const connect = useCallback(async () => {
    const io = await getIO();
    if (!io) return;

    const token = getAccessToken();
    if (!token) {
      console.warn("[WebSocket] No auth token — skipping connection");
      return;
    }

    // Prevent duplicate connections
    if (socketRef.current?.connected) return;

    const socket = (
      io as unknown as {
        io: (
          url: string,
          opts: Record<string, unknown>,
        ) => NonNullable<typeof socketRef.current>;
      }
    ).io(`${WS_URL}${namespace}`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
    });

    socket.on("connect", () => {
      setIsConnected(true);
      console.log(`[WebSocket] Connected to ${namespace}`);

      // Subscribe to rooms
      subscribeRooms.forEach((room) => {
        if (namespace === "/machines") {
          socket.emit("subscribe:machine", { machineId: room });
        } else if (namespace === "/orders") {
          socket.emit("subscribe:order", { orderId: room });
        } else if (namespace === "/notifications") {
          socket.emit("notifications:subscribe", { topic: room });
        }
      });
    });

    socket.on("disconnect", (...args: unknown[]) => {
      setIsConnected(false);
      console.log(`[WebSocket] Disconnected from ${namespace}:`, args[0]);
    });

    socket.on("connect_error", (...args: unknown[]) => {
      const error = args[0] as Error | undefined;
      console.warn(
        `[WebSocket] Connection error on ${namespace}:`,
        error?.message,
      );
      setIsConnected(false);
    });

    // Auto-invalidate React Query caches on key events
    if (autoInvalidate) {
      socket.on("machine:status", () => {
        queryClient.invalidateQueries({ queryKey: ["machines"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      });

      socket.on("machine:inventory", () => {
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        queryClient.invalidateQueries({ queryKey: ["machines"] });
      });

      socket.on("order:created", () => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      });

      socket.on("order:status", () => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      });

      socket.on("order:completed", () => {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["reports"] });
      });
    }

    // Track last event for debugging
    const trackableEvents = [
      "machine:status",
      "machine:inventory",
      "machine:error",
      "machine:heartbeat",
      "order:created",
      "order:status",
      "order:completed",
      "notification",
      "notification:broadcast",
    ];
    trackableEvents.forEach((event) => {
      socket.on(event, (data: unknown) => {
        setLastEvent({ event, data });
      });
    });

    socketRef.current = socket;
  }, [namespace, autoInvalidate, queryClient, subscribeRooms]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Subscribe to specific events
  const on = useCallback(
    <K extends keyof RealtimeEventMap>(event: K, handler: EventHandler<K>) => {
      if (!handlersRef.current.has(event)) {
        handlersRef.current.set(event, new Set());
      }
      handlersRef.current
        .get(event)!
        .add(handler as (...args: unknown[]) => void);

      if (socketRef.current) {
        socketRef.current.on(event, handler as (...args: unknown[]) => void);
      }

      // Return cleanup function
      return () => {
        handlersRef.current
          .get(event)
          ?.delete(handler as (...args: unknown[]) => void);
        if (socketRef.current) {
          socketRef.current.off(event, handler as (...args: unknown[]) => void);
        }
      };
    },
    [],
  );

  // Emit event
  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`[WebSocket] Cannot emit "${event}" — not connected`);
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    lastEvent,
    connect,
    disconnect,
    on,
    emit,
    socket: socketRef.current,
  };
}

// ═══════════════════════════════════════
// SPECIALIZED HOOKS
// ═══════════════════════════════════════

/**
 * Hook for machine real-time updates (dashboard, machine detail)
 */
export function useMachineRealtime(machineIds?: string[]) {
  return useRealtimeUpdates({
    namespace: "/machines",
    subscribeRooms: machineIds || [],
    autoInvalidate: true,
  });
}

/**
 * Hook for order real-time updates
 */
export function useOrderRealtime(orderId?: string) {
  return useRealtimeUpdates({
    namespace: "/orders",
    subscribeRooms: orderId ? [orderId] : [],
    autoInvalidate: true,
  });
}

/**
 * Hook for notifications
 */
export function useNotificationRealtime() {
  return useRealtimeUpdates({
    namespace: "/notifications",
    autoInvalidate: false,
  });
}
