/**
 * Quests Screen
 * Daily, weekly, and monthly quests for earning loyalty points
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NavigationProp = NativeStackNavigationProp<any>;

interface Quest {
  id: string;
  title: string;
  description: string;
  icon: string;
  reward: number;
  progress: number;
  maxProgress: number;
  status: "active" | "completed" | "claimed";
  category: "daily" | "weekly" | "monthly";
  expiresAt: string;
}

type QuestTab = "daily" | "weekly" | "monthly";

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

export function QuestsScreen() {
  const { t } = useTranslation();
  useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<QuestTab>("daily");

  const { data: questsData, refetch: refetchQuests } = useQuery({
    queryKey: ["quests", activeTab],
    queryFn: () => api.get(`/quests?type=${activeTab}`).then((res) => res.data),
    staleTime: 2 * 60 * 1000,
  });

  const { data: streakData } = useQuery({
    queryKey: ["daily-streak"],
    queryFn: () => api.get("/quests/streak").then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const claimQuestMutation = useMutation({
    mutationFn: (questId: string) =>
      api.post(`/quests/${questId}/claim`).then((res) => res.data),
    onSuccess: () => {
      refetchQuests();
      Alert.alert(t("common.success"), t("client.quests.questClaimed"));
    },
    onError: () => {
      Alert.alert(t("common.error"), t("client.quests.claimFailed"));
    },
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetchQuests();
    setRefreshing(false);
  }, [refetchQuests]);

  const quests = questsData || [];
  const streak = streakData?.streak || 0;

  const handleClaimQuest = (questId: string) => {
    claimQuestMutation.mutate(questId);
  };

  const renderQuestCard = ({ item }: { item: Quest }) => (
    <View style={styles.questCard}>
      {/* Quest Icon and Title */}
      <View style={styles.questHeader}>
        <View
          style={[styles.questIcon, { backgroundColor: COLORS.primary + "20" }]}
        >
          <Text style={styles.questIconEmoji}>{getQuestEmoji(item.icon)}</Text>
        </View>

        <View style={styles.questInfo}>
          <Text style={styles.questTitle}>{item.title}</Text>
          <Text style={styles.questDescription} numberOfLines={1}>
            {item.description}
          </Text>
        </View>

        <View style={styles.rewardBadge}>
          <Ionicons name="gift" size={16} color={COLORS.amber} />
          <Text style={styles.rewardAmount}>+{item.reward}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.questProgress}>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${(item.progress / item.maxProgress) * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {item.progress} / {item.maxProgress}
        </Text>
      </View>

      {/* Status and Action */}
      <View style={styles.questFooter}>
        <View style={styles.statusContainer}>
          {item.status === "claimed" && (
            <View style={[styles.statusBadge, { backgroundColor: "#D1FAE5" }]}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={COLORS.green}
              />
              <Text style={[styles.statusText, { color: COLORS.green }]}>
                {t("client.quests.claimed")}
              </Text>
            </View>
          )}
          {item.status === "completed" && (
            <View style={[styles.statusBadge, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={COLORS.amber}
              />
              <Text style={[styles.statusText, { color: COLORS.amber }]}>
                {t("client.quests.completed")}
              </Text>
            </View>
          )}
          {item.status === "active" && (
            <View style={[styles.statusBadge, { backgroundColor: "#EEF2FF" }]}>
              <Ionicons name="timer-outline" size={14} color={COLORS.primary} />
              <Text style={[styles.statusText, { color: COLORS.primary }]}>
                {t("client.quests.inProgress")}
              </Text>
            </View>
          )}
        </View>

        {item.status === "completed" && (
          <TouchableOpacity
            style={styles.claimButton}
            onPress={() => handleClaimQuest(item.id)}
            disabled={claimQuestMutation.isPending}
          >
            <Text style={styles.claimButtonText}>
              {t("client.quests.claim")}
            </Text>
          </TouchableOpacity>
        )}

        {item.status === "claimed" && (
          <View style={[styles.claimButton, styles.claimButtonDisabled]}>
            <Text style={[styles.claimButtonText, { color: COLORS.green }]}>
              {t("client.quests.done")}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Streak */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t("client.quests.title")}</Text>
          <Text style={styles.headerSubtitle}>
            {t("client.quests.subtitle")}
          </Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View>
            <Text style={styles.streakText}>
              {streak} {t("client.quests.day")}
            </Text>
            <Text style={styles.streakLabel}>{t("client.quests.streak")}</Text>
          </View>
        </View>
      </View>

      {/* Tab Filters */}
      <View style={styles.tabs}>
        {(["daily", "weekly", "monthly"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {t(`client.quests.tabs.${tab}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quests List */}
      {quests.length > 0 ? (
        <View style={styles.questsContainer}>
          <FlatList
            data={quests}
            renderItem={renderQuestCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.questsList}
          />
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done" size={64} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>
            {t("client.quests.noQuests", {
              type: t(`client.quests.tabs.${activeTab}`),
            })}
          </Text>
          <Text style={styles.emptySubtitle}>
            {t("client.quests.allCompleted")}
          </Text>
        </View>
      )}

      {/* Quest Tips */}
      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>{t("client.quests.tips")}</Text>
        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={20} color={COLORS.amber} />
          <Text style={styles.tipText}>{t("client.quests.tip1")}</Text>
        </View>
        <View style={styles.tipCard}>
          <Ionicons name="star-outline" size={20} color={COLORS.primary} />
          <Text style={styles.tipText}>{t("client.quests.tip2")}</Text>
        </View>
        <View style={styles.tipCard}>
          <Ionicons name="rocket-outline" size={20} color={COLORS.green} />
          <Text style={styles.tipText}>{t("client.quests.tip3")}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// Helper function to get emoji for quest icon
function getQuestEmoji(icon: string): string {
  const emojiMap: Record<string, string> = {
    purchase: "🛒",
    referral: "👥",
    review: "⭐",
    share: "📤",
    collect: "🎁",
    daily_purchase: "☕",
    order: "🍵",
    invite: "📧",
    achievement: "🏆",
    special: "✨",
  };
  return emojiMap[icon] || "🎯";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  streakEmoji: {
    fontSize: 24,
  },
  streakText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  streakLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
  },
  tabTextActive: {
    color: COLORS.card,
  },
  questsContainer: {
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  questsList: {
    gap: 12,
  },
  questCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  questHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  questIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  questIconEmoji: {
    fontSize: 24,
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  questDescription: {
    fontSize: 12,
    color: COLORS.muted,
  },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  rewardAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.amber,
  },
  questProgress: {
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    marginBottom: 6,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "right",
    fontWeight: "600",
  },
  questFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusContainer: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  claimButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  claimButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  claimButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.card,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  tipsSection: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  tipText: {
    fontSize: 12,
    color: COLORS.muted,
    flex: 1,
    lineHeight: 18,
    fontWeight: "500",
  },
});
