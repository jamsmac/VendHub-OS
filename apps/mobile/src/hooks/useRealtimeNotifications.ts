/**
 * Real-time notifications hook.
 *
 * Subscribes to the `notifications:new` WebSocket event for the lifetime of the
 * hosting component. On each incoming event it:
 *   1. Invalidates the `["notifications"]` React Query cache so the list view
 *      re-fetches from `/notifications/all`.
 *   2. Schedules a local foreground banner via expo-notifications.
 *
 * Mount this hook once in a top-level authenticated layout (MainNavigator or
 * ClientNavigator). Polling (React Query's refetchOnWindowFocus / stale time)
 * remains as a fallback so users still get notifications if the socket fails.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { subscribe } from "../services/socket";

export interface RealtimeNotificationPayload {
  id: string;
  title: string;
  body: string;
  type: string;
  priority?: string;
  data?: Record<string, unknown>;
  userId?: string;
  createdAt: string;
}

export function useRealtimeNotifications(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = subscribe<RealtimeNotificationPayload>(
      "notifications:new",
      (notification) => {
        // Refresh list immediately — the list query will re-fetch.
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });

        // Foreground local banner. expo-notifications' handler (set in
        // push-notifications.ts) decides whether to show it.
        void Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title,
            body: notification.body,
            data: { notificationId: notification.id, type: notification.type },
          },
          trigger: null,
        }).catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);

          console.warn("[useRealtimeNotifications] local banner failed:", msg);
        });
      },
    );

    return unsubscribe;
  }, [queryClient]);
}
