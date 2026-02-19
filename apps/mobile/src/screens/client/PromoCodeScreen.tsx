/**
 * Promo Code Screen
 * Enter and validate promo codes for discounts
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../services/api";

const COLORS = {
  primary: "#4F46E5",
  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
  bg: "#F9FAFB",
  card: "#fff",
  text: "#1F2937",
  muted: "#6B7280",
};

interface PromoResult {
  valid: boolean;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  description?: string;
  min_order_amount?: number;
  expires_at?: string;
}

export function PromoCodeScreen() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<PromoResult | null>(null);

  const validateMutation = useMutation({
    mutationFn: (promoCode: string) =>
      api
        .post("/promo-codes/validate", { code: promoCode })
        .then((res) => res.data),
    onSuccess: (data: PromoResult) => {
      setResult(data);
    },
    onError: () => {
      setResult(null);
      Alert.alert("Ошибка", "Промокод не найден или недействителен");
    },
  });

  const handleValidate = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert("Ошибка", "Введите промокод");
      return;
    }
    validateMutation.mutate(trimmed);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="ticket" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>Промокод</Text>
          <Text style={styles.heroSubtitle}>
            Введите промокод для получения скидки на следующий заказ
          </Text>
        </View>

        {/* Input */}
        <View style={styles.inputSection}>
          <View style={styles.inputContainer}>
            <Ionicons name="pricetag-outline" size={20} color={COLORS.muted} />
            <TextInput
              style={styles.input}
              placeholder="Введите промокод"
              placeholderTextColor={COLORS.muted}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
              returnKeyType="go"
              onSubmitEditing={handleValidate}
            />
            {code.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setCode("");
                  setResult(null);
                }}
              >
                <Ionicons name="close-circle" size={20} color={COLORS.muted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.validateButton,
              validateMutation.isPending && styles.buttonDisabled,
            ]}
            onPress={handleValidate}
            disabled={validateMutation.isPending}
          >
            {validateMutation.isPending ? (
              <ActivityIndicator color={COLORS.card} size="small" />
            ) : (
              <Text style={styles.validateButtonText}>Применить</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Result */}
        {result && (
          <View
            style={[
              styles.resultCard,
              result.valid ? styles.resultSuccess : styles.resultError,
            ]}
          >
            <View style={styles.resultHeader}>
              <Ionicons
                name={result.valid ? "checkmark-circle" : "close-circle"}
                size={28}
                color={result.valid ? COLORS.green : COLORS.red}
              />
              <Text
                style={[
                  styles.resultTitle,
                  { color: result.valid ? COLORS.green : COLORS.red },
                ]}
              >
                {result.valid
                  ? "Промокод действителен!"
                  : "Недействительный промокод"}
              </Text>
            </View>

            {result.valid && (
              <View style={styles.resultDetails}>
                <View style={styles.discountRow}>
                  <Text style={styles.discountLabel}>Скидка:</Text>
                  <Text style={styles.discountValue}>
                    {result.discount_type === "percentage"
                      ? `${result.discount_value}%`
                      : `${result.discount_value.toLocaleString()} so'm`}
                  </Text>
                </View>

                {result.description && (
                  <Text style={styles.resultDescription}>
                    {result.description}
                  </Text>
                )}

                {result.min_order_amount && (
                  <Text style={styles.resultNote}>
                    Мин. сумма заказа:{" "}
                    {result.min_order_amount.toLocaleString()} so'm
                  </Text>
                )}

                {result.expires_at && (
                  <Text style={styles.resultNote}>
                    Действует до:{" "}
                    {new Date(result.expires_at).toLocaleDateString("ru-RU")}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.infoText}>
            Промокоды можно получить в рассылках, у партнёров или в рамках акций
            VendHub
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: 16 },
  hero: { alignItems: "center", paddingVertical: 32 },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: { fontSize: 24, fontWeight: "700", color: COLORS.text },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  inputSection: { gap: 12, marginBottom: 24 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    paddingVertical: 14,
    letterSpacing: 1,
  },
  validateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  validateButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.card,
  },
  resultCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
  },
  resultSuccess: {
    backgroundColor: "#D1FAE520",
    borderColor: COLORS.green + "40",
  },
  resultError: {
    backgroundColor: "#FEE2E220",
    borderColor: COLORS.red + "40",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  resultTitle: { fontSize: 16, fontWeight: "700" },
  resultDetails: { gap: 8, paddingLeft: 38 },
  discountRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  discountLabel: { fontSize: 14, color: COLORS.muted },
  discountValue: { fontSize: 18, fontWeight: "700", color: COLORS.green },
  resultDescription: { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  resultNote: { fontSize: 12, color: COLORS.muted },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primary,
    lineHeight: 18,
    fontWeight: "500",
  },
});
