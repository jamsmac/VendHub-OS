/**
 * Route Screen
 * Optimized route for daily machine visits + route lifecycle (start/end) with
 * background GPS tracking.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { tasksApi, machinesApi, routesApi } from "../../services/api";
import {
  requestPermissions,
  startTracking,
  stopTracking,
  isTracking,
  getBufferSize,
  getActiveRouteId,
} from "../../services/gps-tracker";

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

interface ActiveRoute {
  id: string;
  status: string;
}

export function RouteScreen() {
  const { t } = useTranslation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const queryClient = useQueryClient();
  const [expandedStop, setExpandedStop] = useState<string | null>(null);
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [endOdometer, setEndOdometer] = useState("");
  const [bufferSize, setBufferSize] = useState(0);

  // Poll the GPS buffer size while tracking so the UI updates
  useEffect(() => {
    const timer = setInterval(() => {
      setBufferSize(getBufferSize());
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const { data: activeRoute, refetch: refetchActiveRoute } =
    useQuery<ActiveRoute | null>({
      queryKey: ["route", "active"],
      queryFn: async () => {
        try {
          const res = await routesApi.getActive();
          return (res.data ?? null) as ActiveRoute | null;
        } catch {
          return null;
        }
      },
    });

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

  const startMutation = useMutation({
    mutationFn: async (routeId: string) => {
      await routesApi.start(routeId);
      await startTracking(routeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["route", "active"] });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : t("route.startError");
      Alert.alert(t("route.startError"), message);
    },
  });

  const endMutation = useMutation({
    mutationFn: async ({
      routeId,
      odometer,
    }: {
      routeId: string;
      odometer: number;
    }) => {
      await stopTracking();
      await routesApi.end(routeId, odometer);
    },
    onSuccess: () => {
      setEndModalVisible(false);
      setEndOdometer("");
      queryClient.invalidateQueries({ queryKey: ["route", "active"] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : t("route.endError");
      Alert.alert(t("route.endError"), message);
    },
  });

  const handleStart = async () => {
    // Prefer backend-supplied active route id; fall back to first stop's machine
    // id is NOT a route id, so we require an activeRoute-compatible id from
    // context. In practice, managers assign the route in the web dashboard
    // (status = PLANNED) and getActive returns it.
    if (!activeRoute?.id) {
      Alert.alert(t("route.noActiveRoute"), t("route.assignRoutePrompt"));
      return;
    }

    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert(
        t("route.permissionDeniedTitle"),
        t("route.permissionDeniedBody"),
      );
      return;
    }

    startMutation.mutate(activeRoute.id);
  };

  const handleConfirmEnd = () => {
    const parsed = Number(endOdometer);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert(t("route.endError"), t("route.invalidOdometer"));
      return;
    }
    const routeId = activeRoute?.id ?? getActiveRouteId();
    if (!routeId) {
      Alert.alert(t("route.endError"), t("route.noActiveRoute"));
      return;
    }
    endMutation.mutate({ routeId, odometer: parsed });
  };

  const isActive =
    (activeRoute?.status === "active" || isTracking()) &&
    Boolean(activeRoute?.id);

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
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => {
            void refetch();
            void refetchActiveRoute();
          }}
        />
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

        {/* Start / End / Status */}
        <View style={styles.actionRow}>
          {!isActive && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnStart]}
              onPress={handleStart}
              disabled={startMutation.isPending}
              activeOpacity={0.8}
            >
              {startMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>{t("route.start")}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {isActive && (
            <>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{t("route.inProgress")}</Text>
              </View>
              <Text style={styles.pointsText}>
                {t("route.pointsRecorded", { count: bufferSize })}
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnEnd]}
                onPress={() => setEndModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="stop" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>{t("route.end")}</Text>
              </TouchableOpacity>
            </>
          )}
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

      {/* End Route Modal */}
      <Modal
        visible={endModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEndModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("route.end")}</Text>
            <Text style={styles.modalPrompt}>
              {t("route.endOdometerPrompt")}
            </Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={endOdometer}
              onChangeText={setEndOdometer}
              placeholder={t("route.endOdometerPlaceholder")}
              placeholderTextColor={COLORS.muted}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setEndModalVisible(false)}
                disabled={endMutation.isPending}
              >
                <Text style={styles.modalBtnCancelText}>
                  {t("route.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleConfirmEnd}
                disabled={endMutation.isPending}
              >
                {endMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>
                    {t("route.confirm")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 40,
  },
  btnStart: { backgroundColor: COLORS.green, flex: 1 },
  btnEnd: { backgroundColor: COLORS.red },
  actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.green,
  },
  statusText: { color: COLORS.green, fontSize: 13, fontWeight: "600" },
  pointsText: { color: COLORS.muted, fontSize: 12, flex: 1 },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  modalPrompt: { fontSize: 14, color: COLORS.muted, marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    justifyContent: "flex-end",
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 100,
    alignItems: "center",
  },
  modalBtnCancel: { backgroundColor: "#F3F4F6" },
  modalBtnCancelText: { color: COLORS.text, fontWeight: "600" },
  modalBtnConfirm: { backgroundColor: COLORS.primary },
  modalBtnConfirmText: { color: "#fff", fontWeight: "600" },
});
