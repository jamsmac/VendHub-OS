/**
 * Points History Screen
 * Full loyalty points transaction history
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

type FilterType = "all" | "earn" | "redeem";

const SOURCE_ICONS: Record<string, string> = {
  purchase: "cart",
  referral: "people",
  quest: "flame",
  achievement: "trophy",
  promo: "ticket",
  cashback: "trending-up",
  manual: "create",
  redeem: "gift",
};

interface PointsTransaction {
  id: string;
  type: "earn" | "redeem";
  source: string;
  points: number;
  description: string;
  created_at: string;
  balance_before: number;
  balance_after: number;
}

export function PointsHistoryScreen() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["points-history-full", filter, page],
    queryFn: () =>
      api
        .get("/loyalty/history", {
          params: {
            type: filter === "all" ? undefined : filter,
            page,
            limit: 30,
          },
        })
        .then((res) => res.data),
    staleTime: 2 * 60 * 1000,
  });

  const transactions: PointsTransaction[] = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const renderTransaction = ({ item }: { item: PointsTransaction }) => {
    const isEarn = item.type === "earn";
    const iconName = SOURCE_ICONS[item.source] || "ellipse";
    const date = new Date(item.created_at);

    return (
      <View style={styles.transactionItem}>
        <View
          style={[
            styles.txIcon,
            { backgroundColor: isEarn ? "#D1FAE5" : "#FEE2E2" },
          ]}
        >
          <Ionicons
            name={iconName as keyof typeof Ionicons.glyphMap}
            size={20}
            color={isEarn ? COLORS.green : COLORS.red}
          />
        </View>

        <View style={styles.txContent}>
          <Text style={styles.txDescription}>{item.description}</Text>
          <Text style={styles.txDate}>
            {date.toLocaleDateString("ru-RU")}{" "}
            {date.toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          <Text style={styles.txBalance}>
            Баланс: {item.balance_after.toLocaleString()}
          </Text>
        </View>

        <Text
          style={[
            styles.txAmount,
            { color: isEarn ? COLORS.green : COLORS.red },
          ]}
        >
          {isEarn ? "+" : "-"}
          {item.points.toLocaleString()}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filters}>
        {(
          [
            { key: "all", label: "Все" },
            { key: "earn", label: "Начисления" },
            { key: "redeem", label: "Списания" },
          ] as const
        ).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterTab, filter === key && styles.filterTabActive]}
            onPress={() => {
              setFilter(key);
              setPage(1);
            }}
          >
            <Text
              style={[
                styles.filterText,
                filter === key && styles.filterTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="time-outline" size={64} color={COLORS.muted} />
          <Text style={styles.emptyText}>Нет операций</Text>
          <Text style={styles.emptySubtext}>
            {filter === "earn"
              ? "Зарабатывайте баллы за покупки и квесты"
              : filter === "redeem"
                ? "Вы ещё не использовали баллы"
                : "История операций появится после первой транзакции"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
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
  filters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  filterTabActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: "600", color: COLORS.muted },
  filterTextActive: { color: COLORS.card },
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
  list: { padding: 16 },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  txContent: { flex: 1 },
  txDescription: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  txDate: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  txBalance: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: "700" },
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
