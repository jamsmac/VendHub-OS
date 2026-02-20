/**
 * Notifications Screen
 * Shows user notifications with mark-as-read functionality
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { notificationsApi } from "../services/api";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

const typeConfig: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  task: { icon: "clipboard-outline", color: "#3B82F6" },
  order: { icon: "cart-outline", color: "#10B981" },
  alert: { icon: "alert-circle-outline", color: "#EF4444" },
  machine: { icon: "cafe-outline", color: "#F59E0B" },
  system: { icon: "settings-outline", color: "#6B7280" },
  inventory: { icon: "cube-outline", color: "#8B5CF6" },
  payment: { icon: "card-outline", color: "#EC4899" },
  trip: { icon: "car-outline", color: "#14B8A6" },
};

const defaultType = {
  icon: "notifications-outline" as keyof typeof Ionicons.glyphMap,
  color: "#6B7280",
};

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("ru-RU");
}

export function NotificationsScreen() {
  const { t } = useTranslation();
  useNavigation();
  const queryClient = useQueryClient();

  const {
    data: notifications,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      notificationsApi.getAll().then((res) => res.data as Notification[]),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  const handlePress = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;
    Alert.alert(
      t("notifications.markAllReadTitle"),
      t("notifications.unreadCount", { count: unreadCount }),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.yes"), onPress: () => markAllReadMutation.mutate() },
      ],
    );
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const config = typeConfig[item.type] || defaultType;

    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: config.color + "15" },
          ]}
        >
          <Ionicons name={config.icon} size={22} color={config.color} />
        </View>

        <View style={styles.notificationContent}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.notificationTitle,
                !item.isRead && styles.unreadTitle,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.notificationTime}>
            {formatTimeAgo(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off-outline" size={56} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>{t("notifications.empty")}</Text>
      <Text style={styles.emptySubtitle}>
        {t("notifications.emptySubtitle")}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header actions */}
      {unreadCount > 0 && (
        <View style={styles.headerActions}>
          <Text style={styles.unreadLabel}>
            {t("notifications.unreadCount", { count: unreadCount })}
          </Text>
          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
          >
            <Text style={styles.markAllText}>{t("notifications.readAll")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List */}
      <FlatList
        data={notifications || []}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        contentContainerStyle={
          (!notifications || notifications.length === 0) && !isLoading
            ? styles.emptyContainer
            : styles.listContent
        }
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ItemSeparatorComponent={() => <View style={{ height: 1 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },

  // Header
  headerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  unreadLabel: { fontSize: 13, color: "#6B7280" },
  markAllText: { fontSize: 13, color: "#43302b", fontWeight: "600" },

  // List
  listContent: { padding: 12, paddingBottom: 40 },
  emptyContainer: { flexGrow: 1 },

  // Card
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: "#FFFBF5",
    borderLeftWidth: 3,
    borderLeftColor: "#43302b",
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notificationContent: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    flex: 1,
  },
  unreadTitle: { fontWeight: "700" },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#43302b",
  },
  notificationMessage: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 3,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },

  // Empty
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 6,
  },
});
