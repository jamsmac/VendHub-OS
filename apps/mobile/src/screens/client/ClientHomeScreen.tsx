import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../../services/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Navigation = NativeStackNavigationProp<any>;

interface Props {
  navigation: Navigation;
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

export function ClientHomeScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);

  const { data: nearbyMachines, refetch: refetchMachines } = useQuery({
    queryKey: ["nearby-machines"],
    queryFn: () => api.get("/machines/nearby").then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: recentOrders, refetch: refetchOrders } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: () => api.get("/orders/recent?limit=3").then((res) => res.data),
    staleTime: 2 * 60 * 1000,
  });

  const { data: loyaltyData } = useQuery({
    queryKey: ["loyalty-points"],
    queryFn: () => api.get("/loyalty/balance").then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchMachines(), refetchOrders()]);
    setRefreshing(false);
  }, [refetchMachines, refetchOrders]);

  const closestMachine = nearbyMachines?.[0];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with greeting */}
      <View style={styles.header}>
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.subGreeting}>Ready for a refresh?</Text>
        </View>
        <View style={styles.avatar}>
          <Ionicons name="person-circle" size={40} color={COLORS.primary} />
        </View>
      </View>

      {/* Closest Machine Card */}
      {closestMachine && (
        <TouchableOpacity
          style={styles.machineCard}
          onPress={() =>
            navigation.navigate("Menu", { machineId: closestMachine.id })
          }
        >
          <View style={styles.machineHeader}>
            <Text style={styles.machineTitle}>{closestMachine.name}</Text>
            <View
              style={[
                styles.statusBadge,
                closestMachine.status === "active" && styles.statusActive,
                closestMachine.status === "low_stock" && styles.statusWarning,
                closestMachine.status === "error" && styles.statusError,
              ]}
            >
              <Text style={styles.statusText}>{closestMachine.status}</Text>
            </View>
          </View>
          <View style={styles.machineFooter}>
            <Ionicons name="location" size={16} color={COLORS.muted} />
            <Text style={styles.distance}>
              {closestMachine.distance || "0.5"} km away
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickActionButton
            icon="map"
            label="Map"
            onPress={() => navigation.navigate("MapTab")}
          />
          <QuickActionButton
            icon="qr-code"
            label="QR Scan"
            onPress={() => Alert.alert("QR Scanner", "Coming soon!")}
          />
          <QuickActionButton
            icon="heart"
            label="Favorites"
            onPress={() => navigation.navigate("FavoritesTab")}
          />
          <QuickActionButton
            icon="help-circle"
            label="Help"
            onPress={() => Alert.alert("Help", "Coming soon!")}
          />
        </View>
      </View>

      {/* Loyalty Points Card */}
      {loyaltyData && (
        <View style={styles.loyaltyCard}>
          <View style={styles.loyaltyHeader}>
            <Ionicons name="gift" size={24} color={COLORS.primary} />
            <Text style={styles.loyaltyTitle}>Your Points</Text>
          </View>
          <Text style={styles.pointsAmount}>{loyaltyData.points || 0}</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>
              {loyaltyData.tier || "Bronze"} Member
            </Text>
          </View>
        </View>
      )}

      {/* Promo Banner */}
      <View style={styles.promoBanner}>
        <View style={styles.promoContent}>
          <Ionicons name="megaphone" size={28} color={COLORS.card} />
          <View style={styles.promoText}>
            <Text style={styles.promoTitle}>Get 20% off today</Text>
            <Text style={styles.promoSubtitle}>Use code SAVE20</Text>
          </View>
        </View>
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <TouchableOpacity
            onPress={() => Alert.alert("Orders", "Coming soon!")}
          >
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {recentOrders?.length ? (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recentOrders.map((order: any) => (
            <View key={order.id} style={styles.orderItem}>
              <View style={styles.orderInfo}>
                <Text style={styles.orderProduct}>{order.product_name}</Text>
                <Text style={styles.orderTime}>
                  {new Date(order.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.orderPrice}>{order.total_price} UZS</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noOrders}>No orders yet. Start exploring!</Text>
        )}
      </View>
    </ScrollView>
  );
}

interface QuickActionProps {
  icon: string;
  label: string;
  onPress: () => void;
}

function QuickActionButton({ icon, label, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <View style={styles.actionIcon}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Ionicons name={icon as any} size={24} color={COLORS.primary} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
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
    paddingTop: 24,
    paddingBottom: 16,
  },
  greetingSection: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 14,
    color: COLORS.muted,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
  },
  machineCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  machineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  machineTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
  },
  statusActive: {
    backgroundColor: "#D1FAE5",
  },
  statusWarning: {
    backgroundColor: "#FEF3C7",
  },
  statusError: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    textTransform: "capitalize",
  },
  machineFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  distance: {
    marginLeft: 6,
    fontSize: 14,
    color: COLORS.muted,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  viewAll: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
  actionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "600",
  },
  loyaltyCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
  },
  loyaltyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  loyaltyTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.card,
  },
  pointsAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.card,
    marginBottom: 8,
  },
  tierBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
  },
  tierText: {
    fontSize: 12,
    color: COLORS.card,
    fontWeight: "600",
  },
  promoBanner: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    backgroundColor: COLORS.amber,
    borderRadius: 14,
  },
  promoContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  promoText: {
    marginLeft: 12,
    flex: 1,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.card,
  },
  promoSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg,
  },
  orderInfo: {
    flex: 1,
  },
  orderProduct: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  orderTime: {
    fontSize: 12,
    color: COLORS.muted,
  },
  orderPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  noOrders: {
    fontSize: 14,
    color: COLORS.muted,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 16,
  },
});
