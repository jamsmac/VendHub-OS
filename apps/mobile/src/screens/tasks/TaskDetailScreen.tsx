/**
 * Task Detail Screen
 * Full task information and actions
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { tasksApi } from "../../services/api";
import { MainStackParamList } from "../../navigation/MainNavigator";

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;
type RouteType = RouteProp<MainStackParamList, "TaskDetail">;

export function TaskDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const queryClient = useQueryClient();
  const { taskId } = route.params;

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => tasksApi.getById(taskId).then((res) => res.data.data),
  });

  const startMutation = useMutation({
    mutationFn: () => tasksApi.start(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
    },
  });

  const completeMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (data: any) => tasksApi.complete(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      Alert.alert(t("common.success"), t("tasks.detail.taskCompleted"));
      navigation.goBack();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("tasks.detail.completeFailed"),
      );
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t("tasks.detail.notFound")}</Text>
      </View>
    );
  }

  const typeLabels: Record<string, string> = {
    refill: `🔋 ${t("tasks.types.refill")}`,
    collection: `💰 ${t("tasks.types.collection")}`,
    cleaning: `🧹 ${t("tasks.types.cleaning")}`,
    repair: `🔧 ${t("tasks.types.repair")}`,
    audit: `📊 ${t("tasks.types.audit")}`,
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: t("tasks.status.pending"), color: "#6B7280" },
    assigned: { label: t("tasks.status.assigned"), color: "#3B82F6" },
    in_progress: { label: t("tasks.status.inProgress"), color: "#F59E0B" },
    completed: { label: t("tasks.status.completed"), color: "#10B981" },
  };

  const status = statusLabels[task.status] || statusLabels.pending;

  const handleStart = () => {
    Alert.alert(
      t("tasks.detail.startConfirmTitle"),
      t("tasks.detail.startConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("tasks.detail.start"),
          onPress: () => startMutation.mutate(),
        },
      ],
    );
  };

  const handleComplete = () => {
    if (!task.hasPhotoBefore || !task.hasPhotoAfter) {
      Alert.alert(
        t("tasks.detail.photosRequired"),
        `${t("tasks.detail.uploadPhotos")} ${!task.hasPhotoBefore ? t("tasks.detail.photoBefore") : ""}${!task.hasPhotoBefore && !task.hasPhotoAfter ? ` ${t("common.and")} ` : ""}${!task.hasPhotoAfter ? t("tasks.detail.photoAfter") : ""}`,
      );
      return;
    }

    if (task.taskType === "collection") {
      // For collection tasks, prompt for cash amount
      Alert.prompt(
        t("tasks.detail.collectionAmount"),
        t("tasks.detail.enterActualAmount"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("tasks.detail.complete"),
            onPress: (amount) => {
              if (amount) {
                completeMutation.mutate({
                  actualCashAmount: parseFloat(amount),
                });
              }
            },
          },
        ],
        "plain-text",
        String(task.expectedCashAmount || ""),
      );
    } else {
      completeMutation.mutate({});
    }
  };

  const openNavigation = () => {
    if (task.machine?.latitude && task.machine?.longitude) {
      const url = `https://yandex.ru/maps/?rtext=~${task.machine.latitude},${task.machine.longitude}`;
      Linking.openURL(url);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <Text style={styles.taskNumber}>#{task.taskNumber}</Text>
        <Text style={styles.taskType}>
          {typeLabels[task.taskType] || task.taskType}
        </Text>
        <View
          style={[styles.statusBadge, { backgroundColor: status.color + "20" }]}
        >
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      {/* Machine Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("tasks.detail.machine")}</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="cafe-outline" size={20} color="#6B7280" />
            <Text style={styles.infoLabel}>{t("tasks.detail.name")}:</Text>
            <Text style={styles.infoValue}>{task.machine?.name || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#6B7280" />
            <Text style={styles.infoLabel}>{t("tasks.detail.address")}:</Text>
            <Text style={styles.infoValue}>
              {task.machine?.address || "N/A"}
            </Text>
          </View>
          {task.machine?.latitude && (
            <TouchableOpacity
              style={styles.navigationButton}
              onPress={openNavigation}
            >
              <Ionicons name="navigate-outline" size={20} color="#4F46E5" />
              <Text style={styles.navigationText}>
                {t("tasks.detail.openNavigation")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Task Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("tasks.detail.details")}</Text>
        <View style={styles.infoCard}>
          {task.dueDate && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>{t("tasks.detail.dueDate")}:</Text>
              <Text style={styles.infoValue}>
                {new Date(task.dueDate).toLocaleString("ru-RU")}
              </Text>
            </View>
          )}
          {task.priority && (
            <View style={styles.infoRow}>
              <Ionicons name="flag-outline" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>
                {t("tasks.detail.priority")}:
              </Text>
              <Text style={styles.infoValue}>
                {task.priority === "urgent"
                  ? `🔴 ${t("tasks.priority.urgent")}`
                  : task.priority === "high"
                    ? `🟠 ${t("tasks.priority.high")}`
                    : `🟢 ${t("tasks.priority.normal")}`}
              </Text>
            </View>
          )}
          {task.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.infoLabel}>
                {t("tasks.detail.description")}:
              </Text>
              <Text style={styles.description}>{task.description}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Items (for refill tasks) */}
      {task.items && task.items.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("tasks.detail.itemsToLoad")}
          </Text>
          <View style={styles.infoCard}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {task.items.map((item: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemQty}>
                  {item.plannedQuantity} {item.unit || "шт"}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Collection Info */}
      {task.taskType === "collection" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("tasks.types.collection")}</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>
                {t("tasks.detail.expectedAmount")}:
              </Text>
              <Text style={styles.infoValue}>
                {Number(task.expectedCashAmount || 0).toLocaleString()} сум
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Photo Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("tasks.detail.photoReport")}</Text>
        <View style={styles.photoButtons}>
          <TouchableOpacity
            style={[
              styles.photoButton,
              task.hasPhotoBefore && styles.photoButtonDone,
            ]}
            onPress={() =>
              navigation.navigate("TaskPhoto", { taskId, type: "before" })
            }
          >
            <Ionicons
              name={task.hasPhotoBefore ? "checkmark-circle" : "camera-outline"}
              size={24}
              color={task.hasPhotoBefore ? "#10B981" : "#6B7280"}
            />
            <Text
              style={[
                styles.photoButtonText,
                task.hasPhotoBefore && styles.photoButtonTextDone,
              ]}
            >
              {t("tasks.detail.photoBefore")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.photoButton,
              task.hasPhotoAfter && styles.photoButtonDone,
            ]}
            onPress={() =>
              navigation.navigate("TaskPhoto", { taskId, type: "after" })
            }
          >
            <Ionicons
              name={task.hasPhotoAfter ? "checkmark-circle" : "camera-outline"}
              size={24}
              color={task.hasPhotoAfter ? "#10B981" : "#6B7280"}
            />
            <Text
              style={[
                styles.photoButtonText,
                task.hasPhotoAfter && styles.photoButtonTextDone,
              ]}
            >
              {t("tasks.detail.photoAfter")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {task.status === "assigned" && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStart}
            disabled={startMutation.isPending}
          >
            {startMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.startButtonText}>
                  {t("tasks.detail.startExecution")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {task.status === "in_progress" && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleComplete}
            disabled={completeMutation.isPending}
          >
            {completeMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.completeButtonText}>
                  {t("tasks.detail.completeTask")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCard: {
    backgroundColor: "#fff",
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  taskNumber: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  taskType: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
    flex: 2,
  },
  descriptionContainer: {
    paddingTop: 12,
  },
  description: {
    fontSize: 14,
    color: "#374151",
    marginTop: 8,
    lineHeight: 20,
  },
  navigationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
  },
  navigationText: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "500",
    marginLeft: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  itemName: {
    fontSize: 14,
    color: "#374151",
  },
  itemQty: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "500",
  },
  photoButtons: {
    flexDirection: "row",
    gap: 12,
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  photoButtonDone: {
    borderColor: "#10B981",
    borderStyle: "solid",
    backgroundColor: "#ECFDF5",
  },
  photoButtonText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 8,
  },
  photoButtonTextDone: {
    color: "#10B981",
  },
  actions: {
    padding: 16,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    padding: 16,
  },
  startButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    borderRadius: 12,
    padding: 16,
  },
  completeButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 24,
  },
});
