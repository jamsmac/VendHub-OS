/**
 * Checkout Screen
 * Payment flow for customer orders
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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../../services/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NavigationProp = NativeStackNavigationProp<any>;

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
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

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "payme", name: "Payme", icon: "card", enabled: true },
  { id: "click", name: "Click", icon: "wallet", enabled: true },
  { id: "uzum", name: "Uzum Bank", icon: "briefcase", enabled: true },
  { id: "cash", name: "Cash", icon: "cash", enabled: true },
];

interface CheckoutScreenProps {
  route?: {
    params?: {
      machineId: string;
      items: CartItem[];
    };
  };
}

export function CheckoutScreen({ route }: CheckoutScreenProps) {
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string>("payme");
  const [usePoints, setUsePoints] = useState(false);
  const [pointsAmount, setPointsAmount] = useState(0);
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">(
    "pickup",
  );

  const machineId = route?.params?.machineId || "";
  const cartItems = route?.params?.items || [];

  const { data: loyaltyData, refetch: refetchLoyalty } = useQuery({
    queryKey: ["loyalty-balance"],
    queryFn: () => api.get("/loyalty/balance").then((res) => res.data),
    staleTime: 2 * 60 * 1000,
  });

  const { data: machineData } = useQuery({
    queryKey: ["machine-detail", machineId],
    queryFn: () => api.get(`/machines/${machineId}`).then((res) => res.data),
    enabled: !!machineId,
  });

  const createOrderMutation = useMutation({
    mutationFn: (orderData) =>
      api.post("/orders", orderData).then((res) => res.data),
    onSuccess: (data) => {
      navigation.navigate("OrderSuccess", {
        orderId: data.id,
        orderNumber: data.order_number,
        estimatedTime: 3,
        pointsEarned: Math.floor(subtotal * 0.05),
      });
    },
    onError: () => {
      Alert.alert("Error", "Failed to place order. Please try again.");
    },
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetchLoyalty();
    setRefreshing(false);
  }, [refetchLoyalty]);

  // Calculations
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const maxPointsDiscount = subtotal * 0.5;
  const pointsDiscount = usePoints
    ? Math.min(pointsAmount, maxPointsDiscount)
    : 0;
  const tax = (subtotal - pointsDiscount) * 0.12;
  const total = subtotal - pointsDiscount + tax;
  const availablePoints = loyaltyData?.balance || 0;

  const handlePlaceOrder = async () => {
    if (!selectedPayment) {
      Alert.alert("Error", "Please select a payment method");
      return;
    }

    const orderData = {
      machine_id: machineId,
      items: cartItems.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      })),
      payment_method: selectedPayment,
      delivery_method: deliveryMethod,
      points_used: pointsDiscount,
      total_amount: total,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createOrderMutation.mutate(orderData as any);
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryCard}>
          <FlatList
            data={cartItems}
            renderItem={({ item }) => (
              <View style={styles.summaryItem}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  {(item.price * item.quantity).toLocaleString()} so'm
                </Text>
              </View>
            )}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              {subtotal.toLocaleString()} so'm
            </Text>
          </View>

          {pointsDiscount > 0 && (
            <View style={styles.discountRow}>
              <Text style={styles.discountLabel}>Points Discount</Text>
              <Text style={styles.discountValue}>
                -{pointsDiscount.toLocaleString()} so'm
              </Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text style={styles.totalValue}>{tax.toLocaleString()} so'm</Text>
          </View>

          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              {total.toLocaleString()} so'm
            </Text>
          </View>
        </View>
      </View>

      {/* Loyalty Points */}
      {loyaltyData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Use Bonus Points</Text>
          <View style={styles.pointsCard}>
            <View style={styles.pointsHeader}>
              <Ionicons name="gift" size={24} color={COLORS.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.pointsLabel}>Available Points</Text>
                <Text style={styles.pointsAmount}>
                  {availablePoints.toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.pointsToggle,
                  usePoints && styles.pointsToggleActive,
                ]}
                onPress={() => setUsePoints(!usePoints)}
              >
                <Ionicons
                  name={usePoints ? "checkbox" : "square-outline"}
                  size={24}
                  color={usePoints ? COLORS.green : COLORS.muted}
                />
              </TouchableOpacity>
            </View>

            {usePoints && (
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>
                  Use {pointsAmount.toLocaleString()} (max{" "}
                  {Math.floor(maxPointsDiscount).toLocaleString()})
                </Text>
                <View style={styles.sliderControls}>
                  <TouchableOpacity
                    onPress={() =>
                      setPointsAmount(Math.max(0, pointsAmount - 10000))
                    }
                    style={styles.sliderButton}
                  >
                    <Ionicons name="remove" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  <View style={styles.sliderValue}>
                    <Text style={styles.sliderValueText}>
                      {pointsAmount.toLocaleString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      setPointsAmount(
                        Math.min(
                          Math.floor(maxPointsDiscount),
                          availablePoints,
                          pointsAmount + 10000,
                        ),
                      )
                    }
                    style={styles.sliderButton}
                  >
                    <Ionicons name="add" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Delivery Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Method</Text>
        <View style={styles.deliveryOptions}>
          <TouchableOpacity
            style={[
              styles.deliveryButton,
              deliveryMethod === "pickup" && styles.deliveryActive,
            ]}
            onPress={() => setDeliveryMethod("pickup")}
          >
            <Ionicons
              name="location"
              size={20}
              color={
                deliveryMethod === "pickup" ? COLORS.primary : COLORS.muted
              }
            />
            <Text
              style={[
                styles.deliveryText,
                deliveryMethod === "pickup" && styles.deliveryTextActive,
              ]}
            >
              Pickup at Machine
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deliveryButton,
              deliveryMethod === "delivery" && styles.deliveryActive,
            ]}
            onPress={() => setDeliveryMethod("delivery")}
          >
            <Ionicons
              name="car"
              size={20}
              color={
                deliveryMethod === "delivery" ? COLORS.primary : COLORS.muted
              }
            />
            <Text
              style={[
                styles.deliveryText,
                deliveryMethod === "delivery" && styles.deliveryTextActive,
              ]}
            >
              Delivery
            </Text>
          </TouchableOpacity>
        </View>

        {machineData && (
          <View style={styles.machineInfo}>
            <Ionicons name="location-outline" size={16} color={COLORS.muted} />
            <Text style={styles.machineAddress} numberOfLines={2}>
              {machineData.name} • {machineData.address}
            </Text>
          </View>
        )}
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentOptions}>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentButton,
                selectedPayment === method.id && styles.paymentButtonActive,
                !method.enabled && styles.paymentButtonDisabled,
              ]}
              onPress={() => method.enabled && setSelectedPayment(method.id)}
              disabled={!method.enabled}
            >
              <Ionicons
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                name={method.icon as any}
                size={24}
                color={
                  selectedPayment === method.id ? COLORS.primary : COLORS.muted
                }
              />
              <Text
                style={[
                  styles.paymentLabel,
                  selectedPayment === method.id && styles.paymentLabelActive,
                ]}
              >
                {method.name}
              </Text>
              {selectedPayment === method.id && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={COLORS.primary}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Place Order Button */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={[
            styles.placeOrderButton,
            createOrderMutation.isPending && styles.buttonDisabled,
          ]}
          onPress={handlePlaceOrder}
          disabled={createOrderMutation.isPending}
        >
          {createOrderMutation.isPending ? (
            <ActivityIndicator color={COLORS.card} size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color={COLORS.card} />
              <Text style={styles.placeOrderText}>Place Order</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: COLORS.muted,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.muted,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  discountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  discountLabel: {
    fontSize: 14,
    color: COLORS.green,
    fontWeight: "600",
  },
  discountValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.green,
  },
  grandTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  pointsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
  },
  pointsHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  pointsLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },
  pointsAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 2,
  },
  pointsToggle: {
    padding: 8,
  },
  pointsToggleActive: {
    backgroundColor: "#D1FAE5",
    borderRadius: 8,
  },
  sliderContainer: {
    marginTop: 16,
  },
  sliderLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 12,
  },
  sliderControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sliderButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  sliderValue: {
    flex: 1,
    marginHorizontal: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    alignItems: "center",
  },
  sliderValueText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  deliveryOptions: {
    flexDirection: "row",
    gap: 12,
  },
  deliveryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  deliveryActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#EEF2FF",
  },
  deliveryText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
    marginLeft: 8,
    flex: 1,
  },
  deliveryTextActive: {
    color: COLORS.primary,
  },
  machineInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.card,
    borderRadius: 12,
  },
  machineAddress: {
    fontSize: 12,
    color: COLORS.muted,
    marginLeft: 8,
    flex: 1,
  },
  paymentOptions: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  paymentButton: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  paymentButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#EEF2FF",
  },
  paymentButtonDisabled: {
    opacity: 0.5,
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
    marginTop: 6,
  },
  paymentLabelActive: {
    color: COLORS.primary,
  },
  actionSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  placeOrderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  placeOrderText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.card,
  },
});
