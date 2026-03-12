/**
 * Tasks Screen
 * List of operator's tasks
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { tasksApi } from "../../services/api";
import { MainStackParamList } from "../../navigation/MainNavigator";

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface Task {
  id: string;
  taskNumber: string;
  taskType: string;
  status: string;
  priority: string;
  dueDate?: string;
  machine?: {
    id: string;
    name: string;
    address?: string;
  };
}

type TabType = "active" | "completed";

const taskTypeConfig: Record<
  string,
  { key: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  refill: {
    key: "tasks.types.refill",
    icon: "battery-charging",
    color: "#4F46E5",
  },
  collection: { key: "tasks.types.collection", icon: "cash", color: "#059669" },
  cleaning: { key: "tasks.types.cleaning", icon: "water", color: "#0EA5E9" },
  repair: { key: "tasks.types.repair", icon: "construct", color: "#F59E0B" },
  audit: { key: "tasks.types.audit", icon: "clipboard", color: "#8B5CF6" },
};

const statusConfig: Record<string, { key: string; color: string }> = {
  pending: { key: "tasks.status.pending", color: "#6B7280" },
  assigned: { key: "tasks.status.assigned", color: "#3B82F6" },
  in_progress: { key: "tasks.status.inProgress", color: "#F59E0B" },
  completed: { key: "tasks.status.completed", color: "#10B981" },
  rejected: { key: "tasks.status.rejected", color: "#EF4444" },
  postponed: { key: "tasks.status.postponed", color: "#8B5CF6" },
};

export function TasksScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<TabType>("active");

  const {
    data: tasks,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: () => tasksApi.getMy().then((res) => res.data),
  });

  const filteredTasks = tasks?.filter((task: Task) => {
    if (activeTab === "active") {
      return ["pending", "assigned", "in_progress"].includes(task.status);
    }
    return ["completed", "rejected", "postponed"].includes(task.status);
  });

  const renderTask = ({ item }: { item: Task }) => {
    const type = taskTypeConfig[item.taskType] || {
      key: item.taskType,
      icon: "clipboard",
      color: "#6B7280",
    };
    const status = statusConfig[item.status] || {
      key: item.status,
      color: "#6B7280",
    };
    const isOverdue =
      item.dueDate &&
      new Date(item.dueDate) < new Date() &&
      item.status !== "completed";

    return (
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => navigation.navigate("TaskDetail", { taskId: item.id })}
      >
        <View style={[styles.typeIcon, { backgroundColor: type.color + "20" }]}>
          <Ionicons name={type.icon} size={24} color={type.color} />
        </View>

        <View style={styles.taskContent}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskType}>{t(type.key)}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: status.color + "20" },
              ]}
            >
              <Text style={[styles.statusText, { color: status.color }]}>
                {t(status.key)}
              </Text>
            </View>
          </View>

          <Text style={styles.machineName}>
            {item.machine?.name || t("tasks.machine")}
          </Text>

          {item.machine?.address && (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={14} color="#9CA3AF" />
              <Text style={styles.address} numberOfLines={1}>
                {item.machine.address}
              </Text>
            </View>
          )}

          <View style={styles.taskFooter}>
            {item.dueDate && (
              <View style={styles.dueDate}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={isOverdue ? "#EF4444" : "#9CA3AF"}
                />
                <Text
                  style={[
                    styles.dueDateText,
                    isOverdue ? styles.overdueText : null,
                  ]}
                >
                  {new Date(item.dueDate).toLocaleDateString("ru-RU")}
                </Text>
              </View>
            )}

            {item.priority === "high" || item.priority === "urgent" ? (
              <View style={styles.priorityBadge}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <Text style={styles.priorityText}>
                  {item.priority === "urgent"
                    ? t("tasks.priority.urgent")
                    : t("tasks.priority.high")}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "active" && styles.tabActive]}
          onPress={() => setActiveTab("active")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "active" && styles.tabTextActive,
            ]}
          >
            {t("tasks.tabs.active")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "completed" && styles.tabActive]}
          onPress={() => setActiveTab("completed")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "completed" && styles.tabTextActive,
            ]}
          >
            {t("tasks.tabs.completed")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={
                activeTab === "active"
                  ? "checkmark-circle-outline"
                  : "clipboard-outline"
              }
              size={64}
              color="#D1D5DB"
            />
            <Text style={styles.emptyTitle}>
              {activeTab === "active"
                ? t("tasks.emptyActive")
                : t("tasks.emptyCompleted")}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === "active"
                ? t("tasks.allDone")
                : t("tasks.completedAppearHere")}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "#EEF2FF",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#4F46E5",
  },
  listContent: {
    padding: 16,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  taskType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  machineName: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  address: {
    fontSize: 12,
    color: "#9CA3AF",
    marginLeft: 4,
    flex: 1,
  },
  taskFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dueDate: {
    flexDirection: "row",
    alignItems: "center",
  },
  dueDateText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginLeft: 4,
  },
  overdueText: {
    color: "#EF4444",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 12,
    color: "#EF4444",
    marginLeft: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 64,
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
    marginTop: 4,
  },
});
