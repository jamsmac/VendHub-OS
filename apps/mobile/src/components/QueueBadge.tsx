/**
 * Queue Badge
 * Shows count of queued offline mutations with a manual retry action.
 * Rendered only when queue is non-empty.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { useOfflineQueue } from "../hooks/useOfflineQueue";

export function QueueBadge() {
  const { count, flushing, retry } = useOfflineQueue();
  const { t } = useTranslation();

  if (count === 0) return null;

  const label = flushing
    ? t("offlineQueue.sending", { defaultValue: "Отправка..." })
    : t("offlineQueue.pending", {
        count,
        defaultValue: `${count} в очереди`,
      });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
      <TouchableOpacity
        style={[styles.button, flushing && styles.buttonDisabled]}
        onPress={() => {
          if (!flushing) void retry();
        }}
        disabled={flushing}
      >
        <Text style={styles.buttonText}>
          {t("offlineQueue.retry", { defaultValue: "Повторить" })}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2563EB",
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  button: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});
