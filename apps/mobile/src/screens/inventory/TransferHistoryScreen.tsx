/**
 * Transfer History Screen
 * Shows past inventory movements (transfers) for the operator's organisation.
 * Paginated list with pull-to-refresh.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { inventoryApi } from "../../services/api";
import { MainStackParamList } from "../../navigation/MainNavigator";

type RouteType = RouteProp<MainStackParamList, "TransferHistory">;

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

const PAGE_SIZE = 20;

interface InventoryMovement {
  id: string;
  movementType: string;
  productId: string;
  product?: { name: string; unit?: string };
  quantity: number;
  fromLevel?: string;
  toLevel?: string;
  machineId?: string;
  machine?: { name: string };
  operatorId?: string;
  notes?: string;
  createdAt: string;
}

function movementIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "transfer_in":
    case "operator_to_machine":
    case "warehouse_to_operator":
      return "arrow-down-circle-outline";
    case "transfer_out":
    case "machine_to_operator":
    case "operator_to_warehouse":
      return "arrow-up-circle-outline";
    default:
      return "swap-horizontal-outline";
  }
}

function movementColor(type: string): string {
  if (type.includes("to_machine") || type === "transfer_in")
    return COLORS.green;
  if (type.includes("to_warehouse") || type === "transfer_out")
    return COLORS.amber;
  return COLORS.blue;
}

function formatMovementType(type: string, t: (k: string) => string): string {
  const from = t("inventory.from");
  const warehouse = t("inventory.warehouse");
  const operator = t("inventory.operator");
  const machine = t("inventory.machine");
  switch (type) {
    case "warehouse_to_operator":
      return `${from} ${warehouse} → ${operator}`;
    case "operator_to_warehouse":
      return `${from} ${operator} → ${warehouse}`;
    case "operator_to_machine":
      return `${from} ${operator} → ${machine}`;
    case "machine_to_operator":
      return `${from} ${machine} → ${operator}`;
    default:
      return type.replace(/_/g, " ");
  }
}

export function TransferHistoryScreen() {
  const { t } = useTranslation();
  const route = useRoute<RouteType>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params = (route.params as any) ?? {};
  const machineId: string | undefined = params.machineId;

  const [refreshKey, setRefreshKey] = useState(0);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ["transfer-history", machineId, refreshKey],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await inventoryApi.getTransfers({
        ...(machineId !== undefined && { machineId }),
        limit: PAGE_SIZE,
      });
      const raw = res.data;
      const movements: InventoryMovement[] = Array.isArray(raw)
        ? raw
        : (raw?.movements ?? raw?.data ?? raw?.items ?? []);
      // Simulate offset-based pagination from a flat list response.
      // Backend returns full list; we slice client-side until pagination is native.
      const page = pageParam as number;
      return {
        items: movements.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
        total: movements.length,
        page,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const fetched = (lastPage.page + 1) * PAGE_SIZE;
      return fetched < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];

  const onRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    refetch();
  }, [refetch]);

  const renderItem = ({ item }: { item: InventoryMovement }) => {
    const productName = item.product?.name ?? item.productId;
    const unit = item.product?.unit ?? t("common.pcs");
    const machineName = item.machine?.name;
    const typeLabel = formatMovementType(item.movementType, t);
    const color = movementColor(item.movementType);
    const icon = movementIcon(item.movementType);
    const date = new Date(item.createdAt).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrapper, { backgroundColor: color + "15" }]}>
            <Ionicons name={icon} size={22} color={color} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.productName} numberOfLines={1}>
              {productName}
            </Text>
            <Text style={styles.typeLabel}>{typeLabel}</Text>
          </View>
          <View style={styles.qtyWrapper}>
            <Text style={[styles.qty, { color }]}>
              {item.quantity > 0 ? "+" : ""}
              {item.quantity}
            </Text>
            <Text style={styles.unit}>{unit}</Text>
          </View>
        </View>

        <View style={styles.cardMeta}>
          {machineName ? (
            <View style={styles.metaRow}>
              <Ionicons name="cafe-outline" size={12} color={COLORS.muted} />
              <Text style={styles.metaText}>{machineName}</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={12} color={COLORS.muted} />
            <Text style={styles.metaText}>{date}</Text>
          </View>
          {item.notes ? (
            <View style={styles.metaRow}>
              <Ionicons
                name="chatbubble-outline"
                size={12}
                color={COLORS.muted}
              />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.notes}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.red} />
        <Text style={styles.errorText}>{t("common.error")}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={allItems}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={
        allItems.length === 0 ? styles.emptyContainer : styles.listContent
      }
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading && !isFetchingNextPage}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator style={{ padding: 16 }} color={COLORS.primary} />
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyInner}>
          <Ionicons
            name="swap-horizontal-outline"
            size={64}
            color={COLORS.muted}
          />
          <Text style={styles.emptyTitle}>
            {t("inventory.emptyHistory", "Нет переводов")}
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  listContent: { padding: 16, gap: 10 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  errorText: { fontSize: 16, color: COLORS.text, textAlign: "center" },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "600" },
  emptyContainer: { flex: 1 },
  emptyInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: { fontSize: 16, color: COLORS.muted, textAlign: "center" },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  productName: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  typeLabel: { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  qtyWrapper: { alignItems: "flex-end" },
  qty: { fontSize: 16, fontWeight: "700" },
  unit: { fontSize: 11, color: COLORS.muted },
  cardMeta: { marginTop: 8, gap: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: COLORS.muted, flex: 1 },
});
