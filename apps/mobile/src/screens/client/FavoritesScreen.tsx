/**
 * Favorites Screen
 * Manage favorite machines and products
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
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NavigationProp = NativeStackNavigationProp<any>;

type FavoritesTab = "machines" | "products";

interface FavoriteMachine {
  id: string;
  name: string;
  address: string;
  distance?: string;
  status: "active" | "low_stock" | "offline";
  productCount: number;
}

interface FavoriteProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  emoji: string;
  machineCount: number;
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

const STATUS_CONFIG: Record<string, { color: string; key: string }> = {
  active: { color: COLORS.green, key: "client.favorites.statusActive" },
  low_stock: { color: COLORS.amber, key: "client.favorites.statusLowStock" },
  offline: { color: COLORS.red, key: "client.favorites.statusOffline" },
};

export function FavoritesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FavoritesTab>("machines");

  const { data: favoriteMachines, refetch: refetchMachines } = useQuery({
    queryKey: ["favorite-machines"],
    queryFn: () => api.get("/favorites/machines").then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: favoriteProducts, refetch: refetchProducts } = useQuery({
    queryKey: ["favorite-products"],
    queryFn: () => api.get("/favorites/products").then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const removeMachineMutation = useMutation({
    mutationFn: (machineId: string) =>
      api.delete(`/favorites/machines/${machineId}`).then((res) => res.data),
    onSuccess: () => {
      refetchMachines();
      Alert.alert(
        t("common.success"),
        t("client.favorites.removedFromFavorites"),
      );
    },
  });

  const removeProductMutation = useMutation({
    mutationFn: (productId: string) =>
      api.delete(`/favorites/products/${productId}`).then((res) => res.data),
    onSuccess: () => {
      refetchProducts();
      Alert.alert(
        t("common.success"),
        t("client.favorites.removedFromFavorites"),
      );
    },
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchMachines(), refetchProducts()]);
    setRefreshing(false);
  }, [refetchMachines, refetchProducts]);

  const handleRemoveMachine = (machineId: string) => {
    Alert.alert(
      t("client.favorites.removeFavorite"),
      t("client.favorites.removeMachineConfirm"),
      [
        { text: t("common.cancel"), onPress: () => {}, style: "cancel" },
        {
          text: t("common.remove"),
          onPress: () => removeMachineMutation.mutate(machineId),
          style: "destructive",
        },
      ],
    );
  };

  const handleRemoveProduct = (productId: string) => {
    Alert.alert(
      t("client.favorites.removeFavorite"),
      t("client.favorites.removeProductConfirm"),
      [
        { text: t("common.cancel"), onPress: () => {}, style: "cancel" },
        {
          text: t("common.remove"),
          onPress: () => removeProductMutation.mutate(productId),
          style: "destructive",
        },
      ],
    );
  };

  const machines = favoriteMachines || [];
  const products = favoriteProducts || [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("client.favorites.title")}</Text>
        <View style={styles.headerInfo}>
          <Ionicons name="heart" size={20} color={COLORS.red} />
          <Text style={styles.headerCount}>
            {machines.length + products.length}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "machines" && styles.tabActive]}
          onPress={() => setActiveTab("machines")}
        >
          <Ionicons
            name="location"
            size={18}
            color={activeTab === "machines" ? COLORS.primary : COLORS.muted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "machines" && styles.tabTextActive,
            ]}
          >
            {t("client.favorites.machines")}
          </Text>
          <View
            style={[
              styles.tabBadge,
              activeTab === "machines" && styles.tabBadgeActive,
            ]}
          >
            <Text
              style={[
                styles.tabBadgeText,
                activeTab === "machines" && styles.tabBadgeTextActive,
              ]}
            >
              {machines.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "products" && styles.tabActive]}
          onPress={() => setActiveTab("products")}
        >
          <Ionicons
            name="cafe"
            size={18}
            color={activeTab === "products" ? COLORS.primary : COLORS.muted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "products" && styles.tabTextActive,
            ]}
          >
            {t("client.favorites.products")}
          </Text>
          <View
            style={[
              styles.tabBadge,
              activeTab === "products" && styles.tabBadgeActive,
            ]}
          >
            <Text
              style={[
                styles.tabBadgeText,
                activeTab === "products" && styles.tabBadgeTextActive,
              ]}
            >
              {products.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Machines Tab */}
      {activeTab === "machines" && (
        <View style={styles.contentContainer}>
          {machines.length > 0 ? (
            <FlatList
              data={machines}
              renderItem={({ item }) => (
                <MachineCard
                  machine={item}
                  onRemove={handleRemoveMachine}
                  isLoading={removeMachineMutation.isPending}
                  onPress={() =>
                    navigation.navigate("Menu", { machineId: item.id })
                  }
                />
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.list}
            />
          ) : (
            <EmptyState
              icon="location-outline"
              title={t("client.favorites.noFavoriteMachines")}
              subtitle={t("client.favorites.addMachinesHint")}
              actionLabel={t("client.favorites.browseMachines")}
              onAction={() => navigation.navigate("ClientHome")}
            />
          )}
        </View>
      )}

      {/* Products Tab */}
      {activeTab === "products" && (
        <View style={styles.contentContainer}>
          {products.length > 0 ? (
            <FlatList
              data={products}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  onRemove={handleRemoveProduct}
                  isLoading={removeProductMutation.isPending}
                />
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.list}
              numColumns={2}
            />
          ) : (
            <EmptyState
              icon="cafe-outline"
              title={t("client.favorites.noFavoriteProducts")}
              subtitle={t("client.favorites.addProductsHint")}
              actionLabel={t("client.favorites.browseProducts")}
              onAction={() => navigation.navigate("ClientHome")}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

interface MachineCardProps {
  machine: FavoriteMachine;
  onRemove: (id: string) => void;
  isLoading: boolean;
  onPress: () => void;
}

function MachineCard({
  machine,
  onRemove,
  isLoading,
  onPress,
}: MachineCardProps) {
  const { t } = useTranslation();
  const statusConfig = STATUS_CONFIG[machine.status];

  return (
    <TouchableOpacity
      style={styles.machineCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.machineHeader}>
        <View style={styles.machineLeft}>
          <View
            style={[
              styles.machineIcon,
              { backgroundColor: COLORS.primary + "20" },
            ]}
          >
            <Ionicons name="location" size={24} color={COLORS.primary} />
          </View>

          <View style={styles.machineInfo}>
            <Text style={styles.machineName}>{machine.name}</Text>
            <View style={styles.machineAddress}>
              <Ionicons name="map-outline" size={12} color={COLORS.muted} />
              <Text style={styles.addressText} numberOfLines={1}>
                {machine.address}
              </Text>
            </View>
            <View style={styles.machineDetails}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusConfig.color + "20" },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: statusConfig.color },
                  ]}
                />
                <Text
                  style={[styles.statusLabel, { color: statusConfig.color }]}
                >
                  {t(statusConfig.key)}
                </Text>
              </View>
              <Text style={styles.productCount}>
                {machine.productCount} {t("client.favorites.productsCount")}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(machine.id)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.red} size="small" />
          ) : (
            <Ionicons name="close-circle" size={24} color={COLORS.red} />
          )}
        </TouchableOpacity>
      </View>

      {machine.distance && (
        <View style={styles.machineFooter}>
          <Ionicons name="navigate" size={14} color={COLORS.primary} />
          <Text style={styles.distanceText}>
            {machine.distance} {t("client.favorites.away")}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface ProductCardProps {
  product: FavoriteProduct;
  onRemove: (id: string) => void;
  isLoading: boolean;
}

function ProductCard({ product, onRemove, isLoading }: ProductCardProps) {
  return (
    <View style={styles.productCardContainer}>
      <View style={styles.productCard}>
        {/* Product Image/Emoji */}
        <View style={styles.productImageContainer}>
          <Text style={styles.productEmoji}>{product.emoji}</Text>
        </View>

        {/* Remove Button */}
        <TouchableOpacity
          style={styles.productRemoveButton}
          onPress={() => onRemove(product.id)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.card} size="small" />
          ) : (
            <Ionicons name="close-circle-sharp" size={20} color={COLORS.card} />
          )}
        </TouchableOpacity>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.productCategory}>{product.category}</Text>

          <View style={styles.productFooter}>
            <Text style={styles.productPrice}>
              {product.price.toLocaleString()} so'm
            </Text>
            <View style={styles.availableBadge}>
              <Text style={styles.availableText}>{product.machineCount}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}

function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Ionicons name={icon as any} size={64} color={COLORS.muted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
      <TouchableOpacity style={styles.actionButton} onPress={onAction}>
        <Ionicons name="arrow-forward" size={18} color={COLORS.card} />
        <Text style={styles.actionButtonText}>{actionLabel}</Text>
      </TouchableOpacity>
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
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE8E8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  headerCount: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.red,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  tabActive: {
    backgroundColor: "#EEF2FF",
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
    flex: 1,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
  },
  tabBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.muted,
  },
  tabBadgeTextActive: {
    color: COLORS.card,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  list: {
    gap: 12,
  },
  machineCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 0,
  },
  machineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  machineLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  machineIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  machineInfo: {
    flex: 1,
  },
  machineName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  machineAddress: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
  },
  addressText: {
    fontSize: 12,
    color: COLORS.muted,
    flex: 1,
  },
  machineDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  productCount: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removeButton: {
    padding: 8,
  },
  machineFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },
  productCardContainer: {
    flex: 1,
    paddingHorizontal: 6,
  },
  productCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    overflow: "hidden",
  },
  productImageContainer: {
    width: "100%",
    height: 100,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  productEmoji: {
    fontSize: 48,
  },
  productRemoveButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: COLORS.red,
    borderRadius: 10,
    padding: 4,
  },
  productInfo: {
    gap: 6,
  },
  productName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 16,
  },
  productCategory: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "600",
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  productPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  availableBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#D1FAE5",
    borderRadius: 4,
  },
  availableText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.green,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.card,
  },
});
