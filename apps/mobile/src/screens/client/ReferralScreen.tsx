/**
 * Referral Screen
 * Referral program: invite friends, earn points
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
  ActivityIndicator,
  Share,
  Alert,
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

const STATUS_CONFIG: Record<string, { key: string; color: string }> = {
  pending: { key: "client.referral.status.pending", color: COLORS.amber },
  activated: { key: "client.referral.status.activated", color: COLORS.green },
  expired: { key: "client.referral.status.expired", color: COLORS.red },
  rewarded: { key: "client.referral.status.rewarded", color: COLORS.blue },
};

interface ReferralInfo {
  id: string;
  referredName: string;
  referredAvatar?: string;
  status: string;
  referrerRewardPoints: number;
  referrerRewardPaid: boolean;
  createdAt: string;
  activatedAt?: string;
}

interface ReferralStats {
  referral_code: string;
  total_invited: number;
  total_activated: number;
  total_earned: number;
}

export function ReferralScreen() {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ["referral-stats"],
    queryFn: () => api.get("/referrals/stats").then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: referralsData,
    isLoading,
    refetch: refetchReferrals,
  } = useQuery({
    queryKey: ["my-referrals"],
    queryFn: () =>
      api
        .get("/referrals/my", { params: { limit: 50 } })
        .then((res) => res.data),
    staleTime: 2 * 60 * 1000,
  });

  const stats: ReferralStats = statsData || {
    referral_code: "---",
    total_invited: 0,
    total_activated: 0,
    total_earned: 0,
  };

  const referrals: ReferralInfo[] = referralsData?.items || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchReferrals()]);
    setRefreshing(false);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: t("client.referral.shareMessage", {
          code: stats.referral_code,
        }),
      });
    } catch {
      Alert.alert(t("common.error"), t("client.referral.shareFailed"));
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Referral Code Card */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>{t("client.referral.codeLabel")}</Text>
        <Text style={styles.codeValue}>{stats.referral_code}</Text>
        <Text style={styles.codeHint}>{t("client.referral.codeHint")}</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-social" size={20} color={COLORS.card} />
          <Text style={styles.shareButtonText}>
            {t("client.referral.share")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard
          icon="people"
          label={t("client.referral.invited")}
          value={stats.total_invited}
          color={COLORS.blue}
        />
        <StatCard
          icon="checkmark-circle"
          label={t("client.referral.activated")}
          value={stats.total_activated}
          color={COLORS.green}
        />
        <StatCard
          icon="star"
          label={t("client.referral.earned")}
          value={stats.total_earned}
          color={COLORS.amber}
        />
      </View>

      {/* How it works */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t("client.referral.howItWorks")}
        </Text>
        <View style={styles.stepsCard}>
          <StepItem
            step={1}
            title={t("client.referral.step1Title")}
            desc={t("client.referral.step1Desc")}
          />
          <StepItem
            step={2}
            title={t("client.referral.step2Title")}
            desc={t("client.referral.step2Desc")}
          />
          <StepItem
            step={3}
            title={t("client.referral.step3Title")}
            desc={t("client.referral.step3Desc")}
          />
        </View>
      </View>

      {/* Referral List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t("client.referral.myReferrals")}
        </Text>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : referrals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color={COLORS.muted} />
            <Text style={styles.emptyText}>
              {t("client.referral.noReferrals")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={referrals}
            renderItem={({ item }) => <ReferralItem item={item} />}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={color}
        />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StepItem({
  step,
  title,
  desc,
}: {
  step: number;
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.stepItem}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{step}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function ReferralItem({ item }: { item: ReferralInfo }) {
  const { t } = useTranslation();
  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

  return (
    <View style={styles.referralItem}>
      <View style={styles.referralAvatar}>
        <Ionicons name="person" size={20} color={COLORS.muted} />
      </View>
      <View style={styles.referralInfo}>
        <Text style={styles.referralName}>{item.referredName}</Text>
        <Text style={styles.referralDate}>
          {new Date(item.createdAt).toLocaleDateString("ru-RU")}
        </Text>
      </View>
      <View style={styles.referralRight}>
        <View
          style={[styles.statusBadge, { backgroundColor: status.color + "20" }]}
        >
          <Text style={[styles.statusText, { color: status.color }]}>
            {t(status.key)}
          </Text>
        </View>
        {item.referrerRewardPaid && (
          <Text style={styles.rewardText}>+{item.referrerRewardPoints}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  codeCard: {
    margin: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  codeLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
  },
  codeValue: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.card,
    letterSpacing: 4,
    marginVertical: 8,
  },
  codeHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginBottom: 16,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareButtonText: { fontSize: 14, fontWeight: "700", color: COLORS.card },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
    marginTop: 2,
  },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  stepsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    gap: 16,
  },
  stepItem: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: { fontSize: 13, fontWeight: "700", color: COLORS.card },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  stepDesc: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  centered: { padding: 40, alignItems: "center" },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: "600",
    marginTop: 12,
  },
  referralItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  referralAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  referralInfo: { flex: 1 },
  referralName: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  referralDate: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  referralRight: { alignItems: "flex-end", gap: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: "600" },
  rewardText: { fontSize: 13, fontWeight: "700", color: COLORS.green },
});
