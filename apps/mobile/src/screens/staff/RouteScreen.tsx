/**
 * Route Screen
 * Optimized route for daily machine visits
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { tasksApi, machinesApi } from "../../services/api";

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

interface RouteStop {
  id: string;
  order: number;
  machine: {
    id: string;
    name: string;
    machineNumber: string;
    address: string;
    latitude?: number;
    longitude?: number;
  };
  tasks: {
    id: string;
    taskType: string;
    status: string;
    priority: string;
  }[];
  estimatedTime: number; // minutes
  isCompleted: boolean;
}

export function RouteScreen() {
  const { t } = useTranslation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  useQueryClient();
  const [expandedStop, setExpandedStop] = useState<string | null>(null);

  const {
    data: route,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["my-route"],
    queryFn: async () => {
      const [tasksRes, machinesRes] = await Promise.all([
        tasksApi.getMy(),
        machinesApi.getMy(),
      ]);
      const tasks = tasksRes.data?.data || tasksRes.data || [];
      const machines = machinesRes.data?.data || machinesRes.data || [];

      // Group tasks by machine
      const machineMap = new Map<string, RouteStop>();
      let order = 1;

      tasks
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((t: any) => ["assigned", "in_progress"].includes(t.status))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .forEach((task: any) => {
          const machineId = task.machineId || task.machine?.id;
          if (!machineId) return;

          if (!machineMap.has(machineId)) {
            const machine =
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              machines.find((m: any) => m.id === machineId) || task.machine;
            machineMap.set(machineId, {
              id: machineId,
              order: order++,
              machine: {
                id: machineId,
                name: machine?.name || t("home.machine"),
                machineNumber: machine?.machineNumber || "",
                address: machine?.address || machine?.location?.address || "",
                latitude: machine?.latitude,
                longitude: machine?.longitude,
              },
              tasks: [],
              estimatedTime: 0,
              isCompleted: false,
            });
          }

          const stop = machineMap.get(machineId)!;
          stop.tasks.push({
            id: task.id,
            taskType: task.taskType,
            status: task.status,
            priority: task.priority || "normal",
          });
          stop.estimatedTime +=
            task.taskType === "refill"
              ? 20
              : task.taskType === "collection"
                ? 15
                : 30;
        });

      return Array.from(machineMap.values());
    },
  });

  const completedCount = route?.filter((s) => s.isCompleted).length || 0;
  const totalCount = route?.length || 0;
  const totalTime = route?.reduce((sum, s) => sum + s.estimatedTime, 0) || 0;

  const getTaskTypeLabel = (type: string) => {
    const key = `route.taskTypes.${type}`;
    const translated = t(key);
    return translated !== key ? translated : type;
  };

  const getTaskIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
      refill: "battery-charging",
      collection: "cash",
      cleaning: "sparkles",
      repair: "construct",
      audit: "clipboard",
    };
    return icons[type] || "help-circle";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return COLORS.red;
      case "high":
        return COLORS.amber;
      default:
        return COLORS.blue;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
    >
      {/* Route Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{t("route.title")}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="location" size={20} color={COLORS.primary} />
            <Text style={styles.summaryValue}>{totalCount}</Text>
            <Text style={styles.summaryLabel}>{t("route.stops")}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.green} />
            <Text style={styles.summaryValue}>{completedCount}</Text>
            <Text style={styles.summaryLabel}>{t("route.done")}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="time" size={20} color={COLORS.amber} />
            <Text style={styles.summaryValue}>
              {t("route.timeFormat", {
                hours: Math.round(totalTime / 60),
                minutes: totalTime % 60,
              })}
            </Text>
            <Text style={styles.summaryLabel}>{t("route.totalTime")}</Text>
          </View>
        </View>
        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width:
                  totalCount > 0
                    ? `${(completedCount / totalCount) * 100}%`
                    : "0%",
              },
            ]}
          />
        </View>
      </View>

      {/* Route Stops */}
      {route?.map((stop, idx) => (
        <TouchableOpacity
          key={stop.id}
          style={[styles.stopCard, stop.isCompleted && styles.stopCompleted]}
          onPress={() =>
            setExpandedStop(expandedStop === stop.id ? null : stop.id)
          }
          activeOpacity={0.7}
        >
          {/* Timeline connector */}
          <View style={styles.timeline}>
            <View
              style={[
                styles.timelineDot,
                stop.isCompleted && styles.timelineDotDone,
              ]}
            >
              {stop.isCompleted ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text style={styles.timelineNumber}>{stop.order}</Text>
              )}
            </View>
            {idx < (route?.length || 0) - 1 && (
              <View style={styles.timelineLine} />
            )}
          </View>

          {/* Stop Info */}
          <View style={styles.stopInfo}>
            <Text style={styles.stopName}>{stop.machine.name}</Text>
            <Text style={styles.stopAddress}>{stop.machine.address}</Text>
            <View style={styles.stopMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={COLORS.muted} />
                <Text style={styles.metaText}>
                  ~{stop.estimatedTime} {t("route.minutes")}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons
                  name="clipboard-outline"
                  size={14}
                  color={COLORS.muted}
                />
                <Text style={styles.metaText}>
                  {stop.tasks.length} {t("route.tasksCount")}
                </Text>
              </View>
            </View>

            {/* Expanded tasks */}
            {expandedStop === stop.id && (
              <View style={styles.tasksExpanded}>
                {stop.tasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskRow}
                    onPress={() =>
                      navigation.navigate("TaskDetail", { taskId: task.id })
                    }
                  >
                    <Ionicons
                      name={getTaskIcon(task.taskType)}
                      size={18}
                      color={COLORS.primary}
                    />
                    <Text style={styles.taskLabel}>
                      {getTaskTypeLabel(task.taskType)}
                    </Text>
                    <View
                      style={[
                        styles.priorityDot,
                        { backgroundColor: getPriorityColor(task.priority) },
                      ]}
                    />
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={COLORS.muted}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}

      {(!route || route.length === 0) && !isLoading && (
        <View style={styles.emptyState}>
          <Ionicons name="navigate-outline" size={48} color={COLORS.green} />
          <Text style={styles.emptyText}>{t("route.empty")}</Text>
          <Text style={styles.emptySubtext}>{t("route.emptySubtitle")}</Text>
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  summaryCard: {
    backgroundColor: COLORS.card,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  summaryItem: { alignItems: "center" },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 4,
  },
  summaryLabel: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.green,
    borderRadius: 3,
  },
  stopCard: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stopCompleted: { opacity: 0.6 },
  timeline: { alignItems: "center", marginRight: 12, width: 28 },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  timelineDotDone: { backgroundColor: COLORS.green },
  timelineNumber: { color: "#fff", fontSize: 12, fontWeight: "700" },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 4,
    minHeight: 20,
  },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  stopAddress: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  stopMeta: { flexDirection: "row", gap: 12, marginTop: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: COLORS.muted },
  tasksExpanded: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  taskLabel: { flex: 1, fontSize: 14, color: COLORS.text },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  emptyState: { alignItems: "center", padding: 48 },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtext: { fontSize: 14, color: COLORS.muted, marginTop: 4 },
});
