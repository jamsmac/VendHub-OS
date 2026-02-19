/**
 * Order History Screen
 * Shows the user's past orders with status and details
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";

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

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  pending: { label: "Ожидает", color: COLORS.amber, icon: "time-outline" },
  processing: {
    label: "Готовится",
    color: COLORS.blue,
    icon: "hourglass-outline",
  },
  ready: { label: "Готов", color: COLORS.green, icon: "checkmark-circle" },
  completed: {
    label: "Завершён",
    color: COLORS.green,
    icon: "checkmark-done",
  },
  cancelled: { label: "Отменён", color: COLORS.red, icon: "close-circle" },
  failed: { label: "Ошибка", color: COLORS.red, icon: "alert-circle" },
};

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  items_count: number;
  payment_method: string;
  machine_name?: string;
  created_at: string;
}

export function OrderHistoryScreen() {
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["my-orders", page],
    queryFn: () =>
      api
        .get("/orders/my", { params: { page, limit: 20 } })
        .then((res) => res.data),
    staleTime: 2 * 60 * 1000,
  });

  const orders: Order[] = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const renderOrder = ({ item }: { item: Order }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const date = new Date(item.created_at);

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderNumberRow}>
            <Text style={styles.orderNumber}>#{item.order_number}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: status.color + "20" },
              ]}
            >
              <Ionicons
                name={status.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={status.color}
              />
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
          </View>
          <Text style={styles.orderDate}>
            {date.toLocaleDateString("ru-RU")}{" "}
            {date.toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>

        <View style={styles.orderDetails}>
          {item.machine_name && (
            <View style={styles.detailRow}>
              <Ionicons name="cafe-outline" size={16} color={COLORS.muted} />
              <Text style={styles.detailText}>{item.machine_name}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="cart-outline" size={16} color={COLORS.muted} />
            <Text style={styles.detailText}>
              {item.items_count} {item.items_count === 1 ? "товар" : "товаров"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={16} color={COLORS.muted} />
            <Text style={styles.detailText}>
              {(item.payment_method || "card").toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.totalLabel}>Итого</Text>
          <Text style={styles.totalAmount}>
            {item.total_amount.toLocaleString()} so'm
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Мои заказы</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="receipt-outline" size={64} color={COLORS.muted} />
          <Text style={styles.emptyText}>Заказов пока нет</Text>
          <Text style={styles.emptySubtext}>
            Ваши заказы появятся здесь после первой покупки
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
            />
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[
                    styles.pageButton,
                    page <= 1 && styles.pageButtonDisabled,
                  ]}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={page <= 1 ? COLORS.muted : COLORS.primary}
                  />
                </TouchableOpacity>
                <Text style={styles.pageText}>
                  {page} / {totalPages}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.pageButton,
                    page >= totalPages && styles.pageButtonDisabled,
                  ]}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={page >= totalPages ? COLORS.muted : COLORS.primary}
                  />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 8,
    textAlign: "center",
  },
  list: { padding: 16, gap: 12 },
  orderCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: { marginBottom: 12 },
  orderNumberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  orderNumber: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: { fontSize: 12, fontWeight: "600" },
  orderDate: { fontSize: 12, color: COLORS.muted },
  orderDetails: { gap: 8, marginBottom: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailText: { fontSize: 13, color: COLORS.muted },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
  },
  totalLabel: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  totalAmount: { fontSize: 16, fontWeight: "700", color: COLORS.primary },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
  },
  pageButtonDisabled: { opacity: 0.4 },
  pageText: { fontSize: 14, fontWeight: "600", color: COLORS.text },
});
