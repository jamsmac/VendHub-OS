/**
 * RetryableAction
 * Wraps an async operation with loading/retry/success states.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from "react-native";
import { useTranslation } from "react-i18next";

interface Props {
  /** Function to execute. Return resolved value on success, throw on failure. */
  action: () => Promise<void>;
  /** Label shown on action button */
  label: string;
  /** Max retry attempts before giving up (default 3) */
  maxAttempts?: number;
  /** Called after successful execution */
  onSuccess?: () => void;
  /** Disabled state pass-through */
  disabled?: boolean;
}

interface State {
  status: "idle" | "running" | "success" | "failed";
  attempt: number;
  error: string | null;
}

export function RetryableAction({
  action,
  label,
  maxAttempts = 3,
  onSuccess,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const [state, setState] = useState<State>({
    status: "idle",
    attempt: 0,
    error: null,
  });

  const run = useCallback(async () => {
    setState((prev) => ({
      status: "running",
      attempt: prev.attempt + 1,
      error: null,
    }));
    try {
      await action();
      setState({ status: "success", attempt: 0, error: null });
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState((prev) => ({
        status: "failed",
        attempt: prev.attempt,
        error: message,
      }));
    }
  }, [action, onSuccess]);

  if (state.status === "running") {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" />
        <Text style={styles.status}>{t("common.loading", "Отправка...")}</Text>
      </View>
    );
  }

  if (state.status === "failed") {
    const canRetry = state.attempt < maxAttempts;
    return (
      <View style={styles.container}>
        <Text style={styles.error}>
          {t("error.failed", "Не удалось")}: {state.error ?? "?"}
        </Text>
        {canRetry ? (
          <Pressable
            style={[styles.button, styles.retry]}
            onPress={run}
            disabled={disabled}
          >
            <Text style={styles.buttonText}>
              {t("common.retry", "Повторить")} ({maxAttempts - state.attempt}{" "}
              {t("common.attemptsLeft", "попыток")})
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.error}>
            {t("error.exhausted", "Исчерпаны попытки. Проверьте соединение.")}
          </Text>
        )}
      </View>
    );
  }

  return (
    <Pressable
      style={[styles.button, styles.primary, disabled && styles.disabled]}
      onPress={run}
      disabled={disabled || state.status === "success"}
    >
      <Text style={styles.buttonText}>
        {state.status === "success" ? t("common.done", "Готово") : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    gap: 8,
    alignItems: "center",
    padding: 12,
  },
  status: { fontSize: 14 },
  error: { color: "#dc2626", fontSize: 13, textAlign: "center" },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: "center",
  },
  primary: { backgroundColor: "#D3A066" },
  retry: { backgroundColor: "#f97316" },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
