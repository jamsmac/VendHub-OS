import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Navigation = NativeStackNavigationProp<any>;

interface Props {
  navigation: Navigation;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category: string;
  emoji?: string;
  stock: number;
}

interface Category {
  id: string;
  name: string;
  key: string;
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

const CATEGORIES: Category[] = [
  { id: "0", name: "all", key: "all" },
  { id: "1", name: "coffee", key: "coffee" },
  { id: "2", name: "drinks", key: "drinks" },
  { id: "3", name: "snacks", key: "snacks" },
];

export function MenuScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const route = useRoute();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const machineId = (route.params as any)?.machineId;
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const { data: machine } = useQuery({
    queryKey: ["machine", machineId],
    queryFn: () => api.get(`/machines/${machineId}`).then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: products,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["menu-products", machineId, selectedCategory],
    queryFn: () => {
      const url =
        selectedCategory === "all"
          ? `/machines/${machineId}/menu`
          : `/machines/${machineId}/menu?category=${selectedCategory}`;
      return api.get(url).then((res) => res.data);
    },
    staleTime: 3 * 60 * 1000,
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleProductPress = (product: Product) => {
    navigation.navigate("DrinkDetail", {
      machineId,
      productId: product.id,
      productName: product.name,
    });
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleProductPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.productImageContainer}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.productImage}
            defaultSource={require("../../assets/placeholder.png")}
          />
        ) : (
          <View style={styles.productEmojiContainer}>
            <Text style={styles.productEmoji}>{item.emoji || "☕"}</Text>
          </View>
        )}
        {item.stock === 0 && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>
              {t("client.menu.outOfStock")}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.description && (
          <Text style={styles.productDescription} numberOfLines={1}>
            {item.description}
          </Text>
        )}
        <Text style={styles.productPrice}>
          {item.price} {t("common.currency")}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.machineTitle}>
            {machine?.name || t("client.menu.title")}
          </Text>
          <Text style={styles.machineLocation}>
            {machine?.location || t("client.menu.selectItems")}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("Cart")}
          style={styles.cartButton}
        >
          <Ionicons name="cart" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
        >
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryPill,
                selectedCategory === category.key && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory(category.key)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.key &&
                    styles.categoryTextActive,
                ]}
              >
                {t(`client.menu.categories.${category.name}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products Grid */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.productGrid}
          scrollEnabled
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cafe-outline" size={48} color={COLORS.muted} />
              <Text style={styles.emptyText}>
                {t("client.menu.noProducts")}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
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
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
  },
  machineTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  machineLocation: {
    fontSize: 12,
    color: COLORS.muted,
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryContainer: {
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  categoryScroll: {
    paddingHorizontal: 16,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
  },
  categoryTextActive: {
    color: COLORS.card,
  },
  productGrid: {
    justifyContent: "space-between",
    paddingHorizontal: 12,
    gap: 8,
  },
  listContent: {
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.muted,
    fontWeight: "500",
  },
  productCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  productImageContainer: {
    height: 140,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  productEmojiContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
  },
  productEmoji: {
    fontSize: 56,
  },
  outOfStockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  outOfStockText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.card,
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
});
