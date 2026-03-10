/**
 * Maintenance Screen
 * Machine maintenance checklist and reporting
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { machinesApi, api } from "../../services/api";

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

interface ChecklistItem {
  id: string;
  labelKey: string;
  category: string;
  isRequired: boolean;
  checked: boolean;
}

const DEFAULT_CHECKLIST: Omit<ChecklistItem, "checked">[] = [
  {
    id: "1",
    labelKey: "maintenance.checklist.visualInspection",
    category: "visual",
    isRequired: true,
  },
  {
    id: "2",
    labelKey: "maintenance.checklist.checkDisplay",
    category: "visual",
    isRequired: true,
  },
  {
    id: "3",
    labelKey: "maintenance.checklist.checkPayment",
    category: "payment",
    isRequired: true,
  },
  {
    id: "4",
    labelKey: "maintenance.checklist.checkChange",
    category: "payment",
    isRequired: false,
  },
  {
    id: "5",
    labelKey: "maintenance.checklist.cleanDispensers",
    category: "cleaning",
    isRequired: true,
  },
  {
    id: "6",
    labelKey: "maintenance.checklist.cleanTray",
    category: "cleaning",
    isRequired: true,
  },
  {
    id: "7",
    labelKey: "maintenance.checklist.checkTemperature",
    category: "tech",
    isRequired: true,
  },
  {
    id: "8",
    labelKey: "maintenance.checklist.checkWaterPressure",
    category: "tech",
    isRequired: false,
  },
  {
    id: "9",
    labelKey: "maintenance.checklist.updateFirmware",
    category: "tech",
    isRequired: false,
  },
  {
    id: "10",
    labelKey: "maintenance.checklist.checkIngredients",
    category: "inventory",
    isRequired: true,
  },
  {
    id: "11",
    labelKey: "maintenance.checklist.refillCups",
    category: "inventory",
    isRequired: true,
  },
  {
    id: "12",
    labelKey: "maintenance.checklist.replaceFilter",
    category: "maintenance",
    isRequired: false,
  },
];

const CATEGORIES: Record<
  string,
  { key: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  visual: {
    key: "maintenance.categories.visual",
    icon: "eye",
    color: COLORS.blue,
  },
  payment: {
    key: "maintenance.categories.payment",
    icon: "card",
    color: COLORS.green,
  },
  cleaning: {
    key: "maintenance.categories.cleaning",
    icon: "sparkles",
    color: COLORS.amber,
  },
  tech: {
    key: "maintenance.categories.tech",
    icon: "settings",
    color: COLORS.primary,
  },
  inventory: {
    key: "maintenance.categories.inventory",
    icon: "cube",
    color: "#8B5CF6",
  },
  maintenance: {
    key: "maintenance.categories.maintenance",
    icon: "construct",
    color: COLORS.red,
  },
};

export function MaintenanceScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const machineId = route.params?.machineId;

  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    DEFAULT_CHECKLIST.map((item) => ({ ...item, checked: false })),
  );
  const [notes, setNotes] = useState("");
  const [issues, setIssues] = useState("");

  const { data: machine } = useQuery({
    queryKey: ["machine", machineId],
    queryFn: () => machinesApi.getById(machineId).then((res) => res.data),
    enabled: !!machineId,
  });

  const submitMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (data: any) => api.post("/maintenance/reports", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      Alert.alert(t("common.done"), t("maintenance.reportSent"), [
        { text: t("common.ok"), onPress: () => navigation.goBack() },
      ]);
    },
    onError: () =>
      Alert.alert(t("common.error"), t("maintenance.reportFailed")),
  });

  const toggleCheck = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  };

  const requiredCount = checklist.filter((i) => i.isRequired).length;
  const checkedRequired = checklist.filter(
    (i) => i.isRequired && i.checked,
  ).length;
  const totalChecked = checklist.filter((i) => i.checked).length;
  const canSubmit = checkedRequired === requiredCount;

  const handleSubmit = () => {
    if (!canSubmit) {
      Alert.alert(t("common.error"), t("maintenance.completeRequired"));
      return;
    }

    submitMutation.mutate({
      machineId,
      checklist: checklist.map((i) => ({
        id: i.id,
        label: t(i.labelKey),
        checked: i.checked,
      })),
      notes,
      issues: issues || null,
      completedAt: new Date().toISOString(),
    });
  };

  // Group by category
  const categories = [...new Set(checklist.map((i) => i.category))];

  return (
    <ScrollView style={styles.container}>
      {/* Machine Info */}
      {machine && (
        <View style={styles.machineCard}>
          <Ionicons name="cafe" size={24} color={COLORS.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.machineName}>{machine.name}</Text>
            <Text style={styles.machineAddress}>
              {machine.address || machine.location?.address}
            </Text>
          </View>
        </View>
      )}

      {/* Progress */}
      <View style={styles.progressCard}>
        <Text style={styles.progressText}>
          {t("maintenance.progress", {
            done: totalChecked,
            total: checklist.length,
            doneRequired: checkedRequired,
            totalRequired: requiredCount,
          })}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(totalChecked / checklist.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Checklist by Category */}
      {categories.map((cat) => {
        const catInfo = CATEGORIES[cat];
        const items = checklist.filter((i) => i.category === cat);

        return (
          <View key={cat} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Ionicons name={catInfo.icon} size={18} color={catInfo.color} />
              <Text style={styles.categoryTitle}>{t(catInfo.key)}</Text>
            </View>
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.checkItem}
                onPress={() => toggleCheck(item.id)}
              >
                <Ionicons
                  name={item.checked ? "checkbox" : "square-outline"}
                  size={24}
                  color={item.checked ? COLORS.green : COLORS.muted}
                />
                <Text
                  style={[
                    styles.checkLabel,
                    item.checked && styles.checkLabelDone,
                  ]}
                >
                  {t(item.labelKey)}
                </Text>
                {item.isRequired && <Text style={styles.requiredBadge}>*</Text>}
              </TouchableOpacity>
            ))}
          </View>
        );
      })}

      {/* Issues */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("maintenance.issuesTitle")}</Text>
        <TextInput
          style={styles.textArea}
          value={issues}
          onChangeText={setIssues}
          placeholder={t("maintenance.issuesPlaceholder")}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("maintenance.notesTitle")}</Text>
        <TextInput
          style={styles.textArea}
          value={notes}
          onChangeText={setNotes}
          placeholder={t("maintenance.notesPlaceholder")}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit || submitMutation.isPending}
      >
        {submitMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.submitText}>
              {t("maintenance.submitReport")}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  machineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  machineName: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  machineAddress: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  progressCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  progressText: { fontSize: 14, color: COLORS.text, marginBottom: 8 },
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
  categorySection: { marginHorizontal: 16, marginBottom: 12 },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  categoryTitle: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    padding: 14,
    marginBottom: 4,
    borderRadius: 10,
    gap: 10,
  },
  checkLabel: { flex: 1, fontSize: 14, color: COLORS.text },
  checkLabelDone: { textDecorationLine: "line-through", color: COLORS.muted },
  requiredBadge: { fontSize: 16, color: COLORS.red, fontWeight: "700" },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
