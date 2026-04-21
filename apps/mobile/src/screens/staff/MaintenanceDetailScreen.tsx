/**
 * Maintenance Detail Screen
 * Shows full info for a maintenance task, allows start + complete with notes/photo.
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { maintenanceApi } from "../../services/api";
import { enqueue, isNetworkError } from "../../services/offline-queue";
import { MainStackParamList } from "../../navigation/MainNavigator";

type RouteType = RouteProp<MainStackParamList, "MaintenanceDetail">;

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
  border: "#E5E7EB",
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
  description?: string;
  status: MaintenanceStatus;
  priority: "low" | "normal" | "high" | "critical";
  maintenanceType: string;
  machineId?: string;
  machine?: { id?: string; name: string; address?: string };
  assignedTechnicianId?: string;
  scheduledDate?: string;
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  symptoms?: string[];
  createdAt: string;
  updatedAt: string;
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

export function MaintenanceDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const queryClient = useQueryClient();
  const { taskId } = route.params;

  const [notes, setNotes] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const {
    data: task,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["maintenance-task", taskId],
    queryFn: async () => {
      const res = await maintenanceApi.getTask(taskId);
      return res.data as MaintenanceTask;
    },
  });

  const startMutation = useMutation({
    mutationFn: () => maintenanceApi.startTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["my-maintenance-tasks"] });
      Alert.alert(t("common.success"), t("maintenance.startedWork"));
    },
    onError: (err) => {
      Alert.alert(t("common.error"), t("maintenance.startFailed"));
      console.warn("startMutation error", err);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (payload: { notes: string; photoUrl?: string }) => {
      try {
        return await maintenanceApi.completeTask(taskId, payload);
      } catch (err) {
        if (isNetworkError(err)) {
          await enqueue({
            method: "POST",
            url: `/maintenance/${taskId}/complete`,
            body: payload,
          });
          return { queued: true };
        }
        throw err;
      }
    },
    onSuccess: (res) => {
      const queued = res && typeof res === "object" && "queued" in res;
      queryClient.invalidateQueries({ queryKey: ["maintenance-task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["my-maintenance-tasks"] });
      Alert.alert(
        t("common.success"),
        queued
          ? t(
              "maintenance.queuedOffline",
              "Сохранено офлайн, отправится при подключении",
            )
          : t("maintenance.completed"),
        [{ text: t("common.ok"), onPress: () => navigation.goBack() }],
      );
    },
    onError: () =>
      Alert.alert(t("common.error"), t("maintenance.completeFailed")),
  });

  const handleStart = () => {
    if (!task) return;
    Alert.alert(
      t("maintenance.startWork"),
      t("maintenance.startWorkConfirm", "Начать работу по этому заданию?"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("maintenance.startWork"),
          onPress: () => startMutation.mutate(),
        },
      ],
    );
  };

  const handleComplete = () => {
    if (!notes.trim()) {
      Alert.alert(t("common.error"), t("maintenance.notesRequired"));
      return;
    }
    const payload: { notes: string; photoUrl?: string } = {
      notes: notes.trim(),
    };
    // photoUri would need to be uploaded first; here we pass it as-is (local URI).
    // In production integrate with StorageService upload endpoint.
    if (photoUri) {
      payload.photoUrl = photoUri;
    }
    completeMutation.mutate(payload);
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    if (!permission?.granted) {
      await requestPermission();
      return;
    }
    setShowCamera(true);
  };

  const capturePhoto = async () => {
    if (cameraRef.current) {
      const result = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (result) {
        setPhotoUri(result.uri);
        setShowCamera(false);
      }
    }
  };

  if (showCamera) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView style={{ flex: 1 }} facing="back" ref={cameraRef}>
          <View style={styles.cameraOverlay}>
            <TouchableOpacity
              style={styles.cameraClose}
              onPress={() => setShowCamera(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </CameraView>
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.captureButton} onPress={capturePhoto}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (isError || !task) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.red} />
        <Text style={styles.errorText}>{t("common.error")}</Text>
      </View>
    );
  }

  const canStart = ["submitted", "approved", "scheduled"].includes(task.status);
  const canComplete = task.status === "in_progress";
  const isTerminal = [
    "completed",
    "verified",
    "cancelled",
    "rejected",
  ].includes(task.status);

  return (
    <ScrollView style={styles.container}>
      {/* Status + Priority */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View
            style={[
              styles.badge,
              { backgroundColor: statusColor(task.status) + "20" },
            ]}
          >
            <Text
              style={[styles.badgeText, { color: statusColor(task.status) }]}
            >
              {task.status.replace(/_/g, " ").toUpperCase()}
            </Text>
          </View>
          <Text
            style={[
              styles.priorityLabel,
              { color: priorityColorText(task.priority) },
            ]}
          >
            {task.priority.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.taskTitle}>{task.title}</Text>

        {task.description ? (
          <Text style={styles.description}>{task.description}</Text>
        ) : null}
      </View>

      {/* Machine */}
      {task.machine ? (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cafe-outline" size={16} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>
              {t("maintenance.machine", "Автомат")}
            </Text>
          </View>
          <Text style={styles.machineName}>{task.machine.name}</Text>
          {task.machine.address ? (
            <Text style={styles.machineAddress}>{task.machine.address}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Details */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={COLORS.primary}
          />
          <Text style={styles.sectionTitle}>
            {t("maintenance.details", "Детали")}
          </Text>
        </View>
        <DetailRow
          label={t("maintenance.type", "Тип")}
          value={task.maintenanceType}
        />
        {task.scheduledDate ? (
          <DetailRow
            label={t("maintenance.scheduledDate", "Запланировано")}
            value={new Date(task.scheduledDate).toLocaleDateString("ru-RU")}
          />
        ) : null}
        {task.startedAt ? (
          <DetailRow
            label={t("maintenance.startedAt", "Начато")}
            value={new Date(task.startedAt).toLocaleString("ru-RU")}
          />
        ) : null}
        {task.completedAt ? (
          <DetailRow
            label={t("maintenance.completedAt", "Завершено")}
            value={new Date(task.completedAt).toLocaleString("ru-RU")}
          />
        ) : null}
        {task.notes ? (
          <DetailRow
            label={t("maintenance.notes", "Заметки")}
            value={task.notes}
          />
        ) : null}
      </View>

      {/* Symptoms */}
      {task.symptoms && task.symptoms.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning-outline" size={16} color={COLORS.amber} />
            <Text style={styles.sectionTitle}>
              {t("maintenance.symptoms", "Симптомы")}
            </Text>
          </View>
          {task.symptoms.map((s, i) => (
            <Text key={i} style={styles.symptomItem}>
              • {s}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Actions */}
      {!isTerminal ? (
        <View style={styles.actionsCard}>
          {canStart ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={handleStart}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {t("maintenance.startWork")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {canComplete ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeToggleButton]}
              onPress={() => setShowCompleteForm((v) => !v)}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>
                {t("maintenance.completeWork")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Complete Form */}
      {showCompleteForm && canComplete ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {t("maintenance.completeWork")}
          </Text>

          <Text style={styles.fieldLabel}>
            {t("maintenance.notes")}
            <Text style={{ color: COLORS.red }}> *</Text>
          </Text>
          <TextInput
            style={styles.textArea}
            value={notes}
            onChangeText={setNotes}
            placeholder={t("maintenance.notesRequired")}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.fieldLabel}>
            {t("maintenance.photoOptional")}
          </Text>
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoPickerBtn} onPress={takePhoto}>
              <Ionicons
                name="camera-outline"
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.photoPickerText}>
                {t("maintenance.addPhoto")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoPickerBtn}
              onPress={pickFromGallery}
            >
              <Ionicons
                name="images-outline"
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.photoPickerText}>
                {t("taskPhoto.pickFromGallery")}
              </Text>
            </TouchableOpacity>
          </View>

          {photoUri ? (
            <View style={styles.photoPreviewWrapper}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <TouchableOpacity
                style={styles.removePhoto}
                onPress={() => setPhotoUri(null)}
              >
                <Ionicons name="close-circle" size={24} color={COLORS.red} />
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.submitButton,
              !notes.trim() && styles.buttonDisabled,
            ]}
            onPress={handleComplete}
            disabled={completeMutation.isPending || !notes.trim()}
          >
            {completeMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>
                  {t("maintenance.completeWork")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function priorityColorText(priority: string): string {
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  errorText: { fontSize: 16, color: COLORS.text },
  card: {
    backgroundColor: COLORS.card,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  priorityLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  taskTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  description: { fontSize: 14, color: COLORS.muted, lineHeight: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  machineName: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  machineAddress: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: { fontSize: 13, color: COLORS.muted },
  detailValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "500",
    flexShrink: 1,
    textAlign: "right",
  },
  symptomItem: { fontSize: 13, color: COLORS.text, marginBottom: 4 },
  actionsCard: {
    margin: 16,
    marginBottom: 0,
    gap: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
  },
  startButton: { backgroundColor: COLORS.blue },
  completeToggleButton: { backgroundColor: COLORS.green },
  submitButton: { backgroundColor: COLORS.primary, marginTop: 12 },
  buttonDisabled: { opacity: 0.5 },
  actionButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 12,
  },
  textArea: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 96,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  photoPickerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
  },
  photoPickerText: { fontSize: 13, color: COLORS.primary },
  photoPreviewWrapper: {
    marginTop: 10,
    position: "relative",
    alignSelf: "flex-start",
  },
  photoPreview: { width: 120, height: 90, borderRadius: 8 },
  removePhoto: { position: "absolute", top: -10, right: -10 },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    padding: 16,
    paddingTop: 48,
  },
  cameraClose: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 4,
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#000",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#000",
  },
});
