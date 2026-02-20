/**
 * Achievements Screen
 * Shows loyalty achievements / badges for the user
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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

const RARITY_CONFIG: Record<string, { key: string; color: string }> = {
  common: { key: "client.achievements.rarity.common", color: COLORS.muted },
  rare: { key: "client.achievements.rarity.rare", color: COLORS.blue },
  epic: { key: "client.achievements.rarity.epic", color: "#8B5CF6" },
  legendary: {
    key: "client.achievements.rarity.legendary",
    color: COLORS.amber,
  },
};

const CATEGORY_ICONS: Record<string, string> = {
  purchase: "cart",
  loyalty: "gift",
  social: "people",
  streak: "flame",
  exploration: "compass",
};

interface UserAchievement {
  id: string;
  achievement: {
    id: string;
    name: string;
    name_uz?: string;
    description: string;
    description_uz?: string;
    icon?: string;
    category: string;
    rarity: string;
    bonus_points: number;
    condition_value: number;
  };
  current_value: number;
  target_value: number;
  progress_percent: number;
  is_unlocked: boolean;
  unlocked_at?: string;
  is_claimed: boolean;
}

export function AchievementsScreen() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");

  const {
    data: achievements,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["my-achievements"],
    queryFn: () => api.get("/achievements/my/all").then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const items: UserAchievement[] = achievements || [];
  const filtered = items.filter((a) => {
    if (filter === "unlocked") return a.is_unlocked;
    if (filter === "locked") return !a.is_unlocked;
    return true;
  });

  const unlockedCount = items.filter((a) => a.is_unlocked).length;

  const renderAchievement = ({ item }: { item: UserAchievement }) => {
    const { achievement } = item;
    const rarity = RARITY_CONFIG[achievement.rarity] || RARITY_CONFIG.common;
    const iconName = CATEGORY_ICONS[achievement.category] || "trophy";

    return (
      <View
        style={[
          styles.achievementCard,
          !item.is_unlocked && styles.achievementLocked,
        ]}
      >
        <View style={styles.achievementHeader}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: item.is_unlocked
                  ? rarity.color + "20"
                  : "#F3F4F6",
              },
            ]}
          >
            <Ionicons
              name={iconName as keyof typeof Ionicons.glyphMap}
              size={28}
              color={item.is_unlocked ? rarity.color : COLORS.muted}
            />
          </View>
          <View style={styles.achievementInfo}>
            <Text
              style={[
                styles.achievementName,
                !item.is_unlocked && styles.textLocked,
              ]}
            >
              {achievement.name}
            </Text>
            <Text style={styles.achievementDesc}>
              {achievement.description}
            </Text>
            <View style={styles.rarityRow}>
              <View
                style={[
                  styles.rarityBadge,
                  { backgroundColor: rarity.color + "20" },
                ]}
              >
                <Text style={[styles.rarityText, { color: rarity.color }]}>
                  {t(rarity.key)}
                </Text>
              </View>
              {achievement.bonus_points > 0 && (
                <View style={styles.pointsBadge}>
                  <Ionicons name="star" size={12} color={COLORS.amber} />
                  <Text style={styles.pointsText}>
                    +{achievement.bonus_points}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(item.progress_percent, 100)}%`,
                  backgroundColor: item.is_unlocked
                    ? COLORS.green
                    : COLORS.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {item.is_unlocked
              ? t("client.achievements.earned")
              : `${item.current_value} / ${item.target_value}`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("client.achievements.title")}</Text>
        <Text style={styles.headerSubtitle}>
          {unlockedCount} / {items.length}{" "}
          {t("client.achievements.earned").toLowerCase()}
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {(["all", "unlocked", "locked"] as const).map((f) => (
          <FilterTab
            key={f}
            label={
              f === "all"
                ? t("client.achievements.all")
                : f === "unlocked"
                  ? t("client.achievements.earned")
                  : t("client.achievements.inProgress")
            }
            active={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="trophy-outline" size={64} color={COLORS.muted} />
          <Text style={styles.emptyText}>{t("client.achievements.empty")}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderAchievement}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
            />
          }
        />
      )}
    </View>
  );
}

function FilterTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <View
      style={[styles.filterTab, active && styles.filterTabActive]}
      onTouchEnd={onPress}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>
        {label}
      </Text>
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
  headerSubtitle: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
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
  list: { padding: 16, gap: 12 },
  achievementCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  achievementLocked: { opacity: 0.7 },
  achievementHeader: { flexDirection: "row", gap: 12, marginBottom: 12 },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  achievementInfo: { flex: 1 },
  achievementName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  textLocked: { color: COLORS.muted },
  achievementDesc: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
    lineHeight: 18,
  },
  rarityRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  rarityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  rarityText: { fontSize: 11, fontWeight: "600" },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#FEF3C7",
    borderRadius: 6,
  },
  pointsText: { fontSize: 11, fontWeight: "700", color: COLORS.amber },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
    minWidth: 70,
    textAlign: "right",
  },
});
