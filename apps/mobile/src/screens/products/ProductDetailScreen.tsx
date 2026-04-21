/**
 * Product Detail Screen
 * Shows product details after barcode scan lookup
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { productsApi } from "../../services/api";
import { MainStackParamList } from "../../navigation/MainNavigator";

const COLORS = {
  primary: "#4F46E5",
  text: "#1F2937",
  muted: "#6B7280",
  border: "#E5E7EB",
  bg: "#F9FAFB",
  white: "#FFFFFF",
  green: "#10B981",
};

interface ProductDetail {
  id: string;
  name: string;
  nameUz?: string;
  sku: string;
  barcode?: string;
  category: string;
  sellingPrice: number;
  purchasePrice: number;
  unitOfMeasure: string;
  isActive: boolean;
  description?: string;
}

export function ProductDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<MainStackParamList, "ProductDetail">>();
  const { productId } = route.params;

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery<ProductDetail>({
    queryKey: ["product", productId],
    queryFn: async () => {
      const res = await productsApi.getById(productId);
      return res.data as ProductDetail;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (isError || !product) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.muted} />
        <Text style={styles.errorText}>{t("common.error")}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>{t("common.back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{product.name}</Text>
        {product.nameUz ? (
          <Text style={styles.nameUz}>{product.nameUz}</Text>
        ) : null}
        <View style={styles.skuRow}>
          <Text style={styles.sku}>SKU: {product.sku}</Text>
          {product.barcode ? (
            <Text style={styles.sku}>
              {" "}
              | {t("product.barcode", "Штрихкод")}: {product.barcode}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Pricing */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("product.pricing", "Цены")}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>
            {t("product.sellingPrice", "Цена продажи")}
          </Text>
          <Text style={styles.value}>
            {Number(product.sellingPrice).toLocaleString("ru-RU")}{" "}
            {t("common.currency")}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>
            {t("product.costPrice", "Себестоимость")}
          </Text>
          <Text style={styles.value}>
            {Number(product.purchasePrice).toLocaleString("ru-RU")}{" "}
            {t("common.currency")}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("product.details", "Детали")}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>{t("product.category", "Категория")}</Text>
          <Text style={styles.value}>{product.category}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t("product.unit", "Единица")}</Text>
          <Text style={styles.value}>{product.unitOfMeasure}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t("product.status", "Статус")}</Text>
          <Text
            style={[
              styles.value,
              product.isActive ? styles.active : styles.inactive,
            ]}
          >
            {product.isActive
              ? t("product.active", "Активен")
              : t("product.inactive", "Неактивен")}
          </Text>
        </View>
      </View>

      {product.description ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t("product.description", "Описание")}
          </Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, gap: 12 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    padding: 32,
    gap: 12,
  },
  errorText: { fontSize: 16, color: COLORS.muted },
  backButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  backButtonText: { color: COLORS.white, fontSize: 16, fontWeight: "600" },
  header: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  name: { fontSize: 22, fontWeight: "700", color: COLORS.text },
  nameUz: { fontSize: 16, color: COLORS.muted },
  skuRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  sku: { fontSize: 13, color: COLORS.muted },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 14, color: COLORS.muted },
  value: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  active: { color: COLORS.green },
  inactive: { color: COLORS.muted },
  description: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
});
