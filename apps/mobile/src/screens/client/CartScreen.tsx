import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Navigation = NativeStackNavigationProp<any>;

interface Props {
  navigation: Navigation;
}

interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price_per_unit: number;
  total_price: number;
  customization?: {
    volume?: string;
    sugar?: number;
    milk?: string;
  };
}

interface _CartData {
  items: CartItem[];
  subtotal: number;
  bonus_points?: number;
  total: number;
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

export function CartScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [useBonusPoints, setUseBonusPoints] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const swipeAnimations = useRef<Record<string, Animated.Value>>({});

  const {
    data: cartData,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["cart"],
    queryFn: () => api.get("/cart").then((res) => res.data),
    staleTime: 1 * 60 * 1000,
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) =>
      api.delete(`/cart/items/${itemId}`).then((res) => res.data),
    onSuccess: () => refetch(),
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      api
        .post("/orders", {
          use_bonus_points: useBonusPoints,
        })
        .then((res) => res.data),
    onSuccess: () => {
      navigation.replace("OrderSuccess");
    },
  });

  const getSwipeAnimation = (itemId: string) => {
    if (!swipeAnimations.current[itemId]) {
      swipeAnimations.current[itemId] = new Animated.Value(0);
    }
    return swipeAnimations.current[itemId];
  };

  const handleRemoveItem = (itemId: string) => {
    const anim = getSwipeAnimation(itemId);
    Animated.timing(anim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      removeItemMutation.mutate(itemId);
    });
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    await checkoutMutation.mutateAsync();
    setIsProcessing(false);
  };

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    await api.patch(`/cart/items/${itemId}`, { quantity: newQuantity });
    refetch();
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isEmpty = !cartData?.items || cartData.items.length === 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("client.cart.title")}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{cartData?.items?.length || 0}</Text>
        </View>
      </View>

      {isEmpty ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cafe-outline" size={64} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>{t("client.cart.empty")}</Text>
          <Text style={styles.emptySubtitle}>
            {t("client.cart.emptySubtitle")}
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate("Map")}
          >
            <Text style={styles.browseButtonText}>
              {t("client.cart.browseMachines")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Cart Items */}
          <FlatList
            data={cartData.items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CartItemRow
                item={item}
                onRemove={() => handleRemoveItem(item.id)}
                onQuantityChange={(qty) => handleQuantityChange(item.id, qty)}
                getSwipeAnimation={() => getSwipeAnimation(item.id)}
              />
            )}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />

          {/* Bonus Points Section */}
          <View style={styles.bonusPointsSection}>
            <View style={styles.bonusPointsHeader}>
              <View style={styles.bonusPointsInfo}>
                <Ionicons name="gift" size={20} color={COLORS.primary} />
                <Text style={styles.bonusPointsLabel}>
                  {t("client.cart.useBonusPoints")}
                </Text>
              </View>
              <Switch
                value={useBonusPoints}
                onValueChange={setUseBonusPoints}
                trackColor={{ false: "#E5E7EB", true: "#D1FAE5" }}
                thumbColor={useBonusPoints ? COLORS.green : COLORS.muted}
              />
            </View>
            {useBonusPoints && (
              <Text style={styles.bonusPointsDiscount}>
                -{cartData.bonus_points || 0} UZS
              </Text>
            )}
          </View>

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t("client.cart.subtotal")}</Text>
              <Text style={styles.totalValue}>{cartData.subtotal} UZS</Text>
            </View>

            {useBonusPoints && cartData.bonus_points && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  {t("client.cart.bonusPoints")}
                </Text>
                <Text style={[styles.totalValue, styles.discountValue]}>
                  -{cartData.bonus_points} UZS
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.grandTotal}>{t("client.cart.total")}</Text>
              <Text style={styles.grandTotalValue}>
                {useBonusPoints
                  ? cartData.total - (cartData.bonus_points || 0)
                  : cartData.total}{" "}
                UZS
              </Text>
            </View>
          </View>

          {/* Checkout Button */}
          <View style={styles.checkoutSection}>
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleCheckout}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={COLORS.card} />
              ) : (
                <>
                  <Text style={styles.checkoutButtonText}>
                    {t("client.cart.proceedToCheckout")}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={COLORS.card}
                  />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueShoppingButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.continueShoppingText}>
                {t("client.cart.continueShopping")}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

interface CartItemRowProps {
  item: CartItem;
  onRemove: () => void;
  onQuantityChange: (quantity: number) => void;
  getSwipeAnimation: () => Animated.Value;
}

function CartItemRow({
  item,
  onRemove,
  onQuantityChange,
  getSwipeAnimation,
}: CartItemRowProps) {
  const swipeAnim = getSwipeAnimation();
  const opacity = swipeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const translateX = swipeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100],
  });

  return (
    <Animated.View
      style={[
        styles.cartItemContainer,
        { opacity, transform: [{ translateX }] },
      ]}
    >
      <View style={styles.cartItemContent}>
        <View style={styles.cartItemInfo}>
          <View style={styles.productIcon}>
            <Ionicons name="cafe" size={24} color={COLORS.primary} />
          </View>

          <View style={styles.productDetails}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.product_name}
            </Text>
            {item.customization && (
              <Text style={styles.customization} numberOfLines={1}>
                {item.customization.volume || ""}{" "}
                {item.customization.milk ? `• ${item.customization.milk}` : ""}
              </Text>
            )}
            <Text style={styles.pricePerUnit}>
              {item.price_per_unit} UZS each
            </Text>
          </View>
        </View>

        <View style={styles.cartItemRight}>
          <Text style={styles.itemTotal}>{item.total_price} UZS</Text>

          <View style={styles.quantitySelector}>
            <TouchableOpacity
              style={styles.quantityBtnSmall}
              onPress={() => onQuantityChange(item.quantity - 1)}
            >
              <Ionicons name="remove" size={16} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.quantityBtnSmall}
              onPress={() => onQuantityChange(item.quantity + 1)}
            >
              <Ionicons name="add" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
        <Ionicons name="trash" size={18} color={COLORS.card} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.card,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
  },
  browseButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.card,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  cartItemContainer: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: "hidden",
  },
  cartItemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cartItemInfo: {
    flexDirection: "row",
    flex: 1,
    marginRight: 12,
  },
  productIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  productDetails: {
    flex: 1,
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  customization: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 2,
  },
  pricePerUnit: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.primary,
  },
  cartItemRight: {
    alignItems: "flex-end",
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 8,
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  quantityBtnSmall: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityValue: {
    marginHorizontal: 8,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  removeButton: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.red,
    borderRadius: 8,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  bonusPointsSection: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bonusPointsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bonusPointsInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  bonusPointsLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  bonusPointsDiscount: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.green,
    fontWeight: "600",
  },
  totalsSection: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: "500",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  discountValue: {
    color: COLORS.green,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },
  grandTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  checkoutSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  checkoutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.card,
    marginRight: 8,
  },
  continueShoppingButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  continueShoppingText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    textAlign: "center",
  },
});
