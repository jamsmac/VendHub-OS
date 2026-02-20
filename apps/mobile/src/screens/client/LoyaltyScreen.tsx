/**
 * Loyalty Screen
 * Loyalty program and rewards management
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NavigationProp = NativeStackNavigationProp<any>;

interface _LoyaltyData {
  points: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  cashback_rate: number;
  multiplier: number;
  total_earned: number;
  points_to_next_tier: number;
  progress: number;
}

interface PointsHistory {
  id: string;
  amount: number;
  type: "earn" | "redeem";
  description: string;
  date: string;
}

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

const TIER_CONFIG = {
  bronze: {
    color: "#92400E",
    lightColor: "#FEF3C7",
    nextAt: 1000,
    cashback: 2,
    multiplier: 1,
  },
  silver: {
    color: "#71717A",
    lightColor: "#F3F4F6",
    nextAt: 5000,
    cashback: 3,
    multiplier: 1.5,
  },
  gold: {
    color: "#B8860B",
    lightColor: "#FFFACD",
    nextAt: 15000,
    cashback: 5,
    multiplier: 2,
  },
  platinum: {
    color: "#E0E0E0",
    lightColor: "#F8F8FF",
    nextAt: null,
    cashback: 10,
    multiplier: 3,
  },
};

export function LoyaltyScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);

  const { data: loyaltyData, refetch: refetchLoyalty } = useQuery({
    queryKey: ["loyalty-data"],
    queryFn: () => api.get("/loyalty/profile").then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: pointsHistory } = useQuery({
    queryKey: ["points-history"],
    queryFn: () => api.get("/loyalty/history?limit=5").then((res) => res.data),
    staleTime: 2 * 60 * 1000,
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetchLoyalty();
    setRefreshing(false);
  }, [refetchLoyalty]);

  const tierConfig = loyaltyData?.tier
    ? TIER_CONFIG[loyaltyData.tier as keyof typeof TIER_CONFIG] ||
      TIER_CONFIG.bronze
    : TIER_CONFIG.bronze;
  const mockData = loyaltyData || {
    points: 2450,
    tier: "silver",
    cashback_rate: 3,
    multiplier: 1.5,
    total_earned: 12500,
    points_to_next_tier: 2550,
    progress: 66,
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("client.loyalty.title")}</Text>
        <TouchableOpacity>
          <Ionicons name="help-circle-outline" size={24} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      {/* Points Card */}
      <LinearGradient
        colors={[tierConfig.color, tierConfig.lightColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pointsCard}
      >
        <View style={styles.pointsCardContent}>
          <View style={styles.pointsTop}>
            <Text style={styles.pointsLabel}>
              {t("client.loyalty.totalPoints")}
            </Text>
            <View style={styles.tierBadge}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.tierBadgeText}>
                {mockData.tier.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.pointsAmount}>
            {mockData.points.toLocaleString()}
          </Text>

          <View style={styles.pointsFooter}>
            <View style={styles.pointsStat}>
              <Text style={styles.pointsStatLabel}>
                {t("client.loyalty.cashback")}
              </Text>
              <Text style={styles.pointsStatValue}>
                {mockData.cashback_rate}%
              </Text>
            </View>
            <View style={styles.pointsStatDivider} />
            <View style={styles.pointsStat}>
              <Text style={styles.pointsStatLabel}>
                {t("client.loyalty.multiplier")}
              </Text>
              <Text style={styles.pointsStatValue}>{mockData.multiplier}x</Text>
            </View>
            <View style={styles.pointsStatDivider} />
            <View style={styles.pointsStat}>
              <Text style={styles.pointsStatLabel}>
                {t("client.loyalty.earnedTotal")}
              </Text>
              <Text style={styles.pointsStatValue}>
                {mockData.total_earned.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Progress to Next Tier */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            {t("client.loyalty.progressToNextTier")}
          </Text>
          <Text style={styles.progressPoints}>
            {mockData.points_to_next_tier.toLocaleString()}{" "}
            {t("client.loyalty.pointsNeeded")}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${mockData.progress}%` }]}
          />
        </View>
      </View>

      {/* Quick Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t("client.loyalty.quickLinks")}
        </Text>
        <View style={styles.quickLinksGrid}>
          <QuickLinkButton
            icon="flame"
            label={t("client.loyalty.quests")}
            color={COLORS.red}
            onPress={() => navigation.navigate("Quests")}
          />
          <QuickLinkButton
            icon="trophy"
            label={t("client.loyalty.achievements")}
            color={COLORS.amber}
            onPress={() => navigation.navigate("Achievements")}
          />
          <QuickLinkButton
            icon="share-social"
            label={t("client.loyalty.referrals")}
            color={COLORS.blue}
            onPress={() => navigation.navigate("Referrals")}
          />
          <QuickLinkButton
            icon="ticket"
            label={t("client.loyalty.promoCodes")}
            color={COLORS.primary}
            onPress={() => navigation.navigate("PromoCode")}
          />
        </View>
      </View>

      {/* Recent Points History */}
      <View style={styles.section}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>
            {t("client.loyalty.recentActivity")}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("FullHistory")}>
            <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
          </TouchableOpacity>
        </View>

        {pointsHistory && pointsHistory.length > 0 ? (
          <View style={styles.historyCard}>
            <FlatList
              data={pointsHistory.slice(0, 5)}
              renderItem={({ item, index }) => (
                <View>
                  <HistoryItem item={item} />
                  {index < Math.min(pointsHistory.length - 1, 4) && (
                    <View style={styles.historyDivider} />
                  )}
                </View>
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        ) : (
          <View style={styles.emptyHistory}>
            <Ionicons name="time-outline" size={48} color={COLORS.muted} />
            <Text style={styles.emptyText}>
              {t("client.loyalty.noActivity")}
            </Text>
          </View>
        )}
      </View>

      {/* Tier Levels Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t("client.loyalty.tierLevels")}
        </Text>
        <View style={styles.tiersContainer}>
          {Object.entries(TIER_CONFIG).map(([tierName, config]) => (
            <TierLevelCard
              key={tierName}
              tier={tierName}
              config={config}
              isCurrent={mockData.tier === tierName}
            />
          ))}
        </View>
      </View>

      {/* Terms Info */}
      <View style={styles.termsSection}>
        <View style={styles.termsIcon}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={COLORS.primary}
          />
        </View>
        <Text style={styles.termsText}>
          {t("client.loyalty.pointsNeverExpire")}
        </Text>
      </View>
    </ScrollView>
  );
}

interface QuickLinkButtonProps {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

function QuickLinkButton({
  icon,
  label,
  color,
  onPress,
}: QuickLinkButtonProps) {
  return (
    <TouchableOpacity style={styles.quickLink} onPress={onPress}>
      <View style={[styles.quickLinkIcon, { backgroundColor: color + "20" }]}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.quickLinkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

interface HistoryItemProps {
  item: PointsHistory;
}

function HistoryItem({ item }: HistoryItemProps) {
  const isEarn = item.type === "earn";

  return (
    <View style={styles.historyItem}>
      <View
        style={[
          styles.historyIcon,
          { backgroundColor: isEarn ? "#D1FAE5" : "#FEE2E2" },
        ]}
      >
        <Ionicons
          name={isEarn ? "add-circle" : "remove-circle"}
          size={20}
          color={isEarn ? COLORS.green : COLORS.red}
        />
      </View>
      <View style={styles.historyContent}>
        <Text style={styles.historyDescription}>{item.description}</Text>
        <Text style={styles.historyDate}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
      </View>
      <Text
        style={[
          styles.historyAmount,
          { color: isEarn ? COLORS.green : COLORS.red },
        ]}
      >
        {isEarn ? "+" : "-"}
        {item.amount}
      </Text>
    </View>
  );
}

interface TierLevelCardProps {
  tier: string;
  config: {
    color: string;
    cashback: number;
    multiplier: number;
  };
  isCurrent: boolean;
}

function TierLevelCard({ tier, config, isCurrent }: TierLevelCardProps) {
  const { t } = useTranslation();
  return (
    <View style={[styles.tierCard, isCurrent && styles.tierCardCurrent]}>
      <View style={styles.tierHeader}>
        <View
          style={[styles.tierIcon, { backgroundColor: config.color + "20" }]}
        >
          <Ionicons name="star" size={24} color={config.color} />
        </View>
        <View style={styles.tierInfo}>
          <Text style={styles.tierName}>{tier.toUpperCase()}</Text>
          {isCurrent && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>
                {t("client.loyalty.current")}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.tierBenefits}>
        <View style={styles.tierBenefit}>
          <Text style={styles.tierBenefitLabel}>
            {t("client.loyalty.cashback")}
          </Text>
          <Text style={styles.tierBenefitValue}>{config.cashback}%</Text>
        </View>
        <View style={styles.tierBenefit}>
          <Text style={styles.tierBenefitLabel}>
            {t("client.loyalty.multiplier")}
          </Text>
          <Text style={styles.tierBenefitValue}>{config.multiplier}x</Text>
        </View>
      </View>
    </View>
  );
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
  },
  pointsCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    padding: 24,
    overflow: "hidden",
  },
  pointsCardContent: {
    gap: 16,
  },
  pointsTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pointsLabel: {
    fontSize: 14,
    color: COLORS.card,
    fontWeight: "600",
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.card,
  },
  pointsAmount: {
    fontSize: 42,
    fontWeight: "700",
    color: COLORS.card,
  },
  pointsFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pointsStat: {
    flex: 1,
    alignItems: "center",
  },
  pointsStatLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 2,
    fontWeight: "600",
  },
  pointsStatValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.card,
  },
  pointsStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  progressSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  progressPoints: {
    fontSize: 12,
    color: COLORS.muted,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  quickLinksGrid: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  quickLink: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
  },
  quickLinkIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickLinkLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
  },
  historyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  historyContent: {
    flex: 1,
  },
  historyDescription: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: COLORS.muted,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  historyDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  emptyHistory: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 12,
    fontWeight: "600",
  },
  tiersContainer: {
    gap: 12,
  },
  tierCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  tierCardCurrent: {
    borderColor: COLORS.primary,
    backgroundColor: "#EEF2FF",
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  tierIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  currentBadge: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  currentBadgeText: {
    fontSize: 10,
    color: COLORS.card,
    fontWeight: "700",
  },
  tierBenefits: {
    flexDirection: "row",
    gap: 16,
  },
  tierBenefit: {
    flex: 1,
  },
  tierBenefitLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 2,
    fontWeight: "600",
  },
  tierBenefitValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  termsSection: {
    marginHorizontal: 16,
    marginBottom: 32,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  termsIcon: {
    marginRight: 4,
  },
  termsText: {
    fontSize: 12,
    color: COLORS.primary,
    flex: 1,
    lineHeight: 18,
    fontWeight: "500",
  },
});
