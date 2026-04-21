/**
 * Maintenance Screen
 * Lists operator's maintenance tasks fetched from the backend.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { maintenanceApi } from "../../services/api";
import { MainStackParamList } from "../../navigation/MainNavigator";

type NavProp = NativeStackNavigationProp<MainStackParamList>;

const COLORS = {
  primary: "#4F46E5",
  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
  blue: "#3B82F6",
  bg: "#F9FAFB",
  card: "#fff",
  text: "#1F2937",
  muted: "#6B7280",
};

type MaintenanceStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "scheduled"
  | "in_progress"
  | "awaiting_parts"
  | "completed"
  | "verified"
  | "cancelled";

interface MaintenanceTask {
  id: string;
  title: string;
  status: MaintenanceStatus;
  priority: "low" | "normal" | "high" | "critical";
  maintenanceType: string;
  machineId?: string;
  machine?: { name: string; address?: string };
  scheduledDate?: string;
  dueDate?: string;
  createdAt: string;
}

function statusColor(status: MaintenanceStatus): string {
  switch (status) {
    case "in_progress":
      return COLORS.blue;
    case "completed":
    case "verified":
      return COLORS.green;
    case "cancelled":
    case "rejected":
      return COLORS.red;
    case "awaiting_parts":
      return COLORS.amber;
    default:
      return COLORS.muted;
  }
}

function priorityColor(priority: string): string {
  switch (priority) {
    case "critical":
      return COLORS.red;
    case "high":
      return COLORS.amber;
    case "normal":
      return COLORS.primary;
    default:
      return COLORS.muted;
  }
}

function statusLabel(
  status: MaintenanceStatus,
  t: (k: string) => string,
): string {
  const map: Record<MaintenanceStatus, string> = {
    draft: t("maintenance.status.draft"),
    submitted: t("maintenance.status.submitted"),
    approved: t("maintenance.status.approved"),
    rejected: t("maintenance.status.rejected"),
    scheduled: t("maintenance.status.scheduled"),
    in_progress: t("maintenance.status.inProgress"),
    awaiting_parts: t("maintenance.status.awaitingParts"),
    completed: t("maintenance.status.completed"),
    verified: t("maintenance.status.verified"),
    cancelled: t("maintenance.status.cancelled"),
  };
  return map[status] ?? status;
}

export function MaintenanceScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavProp>();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["my-maintenance-tasks"],
    queryFn: async () => {
      const res = await maintenanceApi.getMyTasks();
      const raw = res.data;
      return (
        Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? [])
      ) as MaintenanceTask[];
    },
  });

  const tasks = data ?? [];

  const renderItem = ({ item }: { item: MaintenanceTask }) => {
    const machineName =
      item.machine?.name ?? t("maintenance.unknownMachine", "Автомат");
    const machineAddr = item.machine?.address;
    const due = item.scheduledDate ?? item.dueDate ?? item.createdAt;
    const dueFormatted = due ? new Date(due).toLocaleDateString("ru-RU") : null;

    return (
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() =>
          navigation.navigate("MaintenanceDetail", { taskId: item.id })
        }
        activeOpacity={0.7}
      >
        <View style={styles.taskHeader}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor(item.status) + "20" },
            ]}
          >
            <Text
              style={[styles.statusText, { color: statusColor(item.status) }]}
            >
              {statusLabel(item.status, t)}
            </Text>
          </View>
          <View
            style={[
              styles.priorityDot,
              { backgroundColor: priorityColor(item.priority) },
            ]}
          />
        </View>

        <Text style={styles.taskTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.taskMeta}>
          <Ionicons name="cafe-outline" size={14} color={COLORS.muted} />
          <Text style={styles.taskMetaText}>{machineName}</Text>
        </View>

        {machineAddr ? (
          <View style={styles.taskMeta}>
            <Ionicons name="location-outline" size={14} color={COLORS.muted} />
            <Text style={styles.taskMetaText} numberOfLines={1}>
              {machineAddr}
            </Text>
          </View>
        ) : null}

        {dueFormatted ? (
          <View style={styles.taskMeta}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.muted} />
            <Text style={styles.taskMetaText}>{dueFormatted}</Text>
          </View>
        ) : null}

        <Ionicons
          name="chevron-forward"
          size={16}
          color={COLORS.muted}
          style={styles.chevron}
        />
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.red} />
        <Text style={styles.errorText}>{t("common.error")}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={
        tasks.length === 0 ? styles.emptyContainer : styles.listContent
      }
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          tintColor={COLORS.primary}
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyInner}>
          <Ionicons name="construct-outline" size={64} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>{t("maintenance.empty")}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  listContent: { padding: 16, gap: 12 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  errorText: { fontSize: 16, color: COLORS.text, textAlign: "center" },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "600" },
  emptyContainer: { flex: 1 },
  emptyInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: { fontSize: 16, color: COLORS.muted, textAlign: "center" },
  taskCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    position: "relative",
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: "600" },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  taskMetaText: { fontSize: 13, color: COLORS.muted, flex: 1 },
  chevron: { position: "absolute", right: 16, top: "50%" },
});
