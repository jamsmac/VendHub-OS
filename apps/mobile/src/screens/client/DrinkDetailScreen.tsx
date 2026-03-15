import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { api } from "../../services/api";

type Navigation = NativeStackNavigationProp<Record<string, object | undefined>>;

interface Props {
  navigation: Navigation;
}

interface _Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  emoji?: string;
  category: string;
}

interface Customization {
  volume: "small" | "medium" | "large";
  sugar: 0 | 25 | 50 | 100;
  milk: "regular" | "oat" | "coconut" | "none";
  quantity: number;
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

const VOLUME_PRICES = {
  small: 0,
  medium: 2000,
  large: 4000,
};

const MILK_TYPE_KEYS = ["regular", "oat", "coconut", "none"];
const SUGAR_LEVELS: (0 | 25 | 50 | 100)[] = [0, 25, 50, 100];

export function DrinkDetailScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const route = useRoute();
  const { machineId, productId } = route.params as {
    machineId: string;
    productId: string;
  };

  const [customization, setCustomization] = useState<Customization>({
    volume: "medium",
    sugar: 50,
    milk: "regular",
    quantity: 1,
  });

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => api.get(`/products/${productId}`).then((res) => res.data),
    staleTime: 10 * 60 * 1000,
  });

  const calculateTotal = () => {
    const basePrice = product?.price || 0;
    const volumePrice = VOLUME_PRICES[customization.volume];
    const itemTotal = basePrice + volumePrice;
    return itemTotal * customization.quantity;
  };

  const handleAddToCart = async () => {
    try {
      await api.post("/cart/items", {
        machine_id: machineId,
        product_id: productId,
        quantity: customization.quantity,
        customization: {
          volume: customization.volume,
          sugar: customization.sugar,
          milk: customization.milk,
        },
      });

      // Show success feedback
      navigation.navigate("Cart");
    } catch (error: unknown) {
      console.error("Error adding to cart:", error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t("client.drinkDetail.customize")}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Product Image/Emoji */}
        <View style={styles.productImageContainer}>
          {product?.image_url ? (
            <Text style={styles.productEmoji}>{product?.emoji || "☕"}</Text>
          ) : (
            <Text style={styles.productEmoji}>{product?.emoji || "☕"}</Text>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product?.name}</Text>
          <Text style={styles.productDescription}>{product?.description}</Text>
        </View>

        {/* Volume Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("client.drinkDetail.size")}
          </Text>
          <View style={styles.optionsGrid}>
            {(["small", "medium", "large"] as const).map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.optionButton,
                  customization.volume === size && styles.optionButtonActive,
                ]}
                onPress={() =>
                  setCustomization({ ...customization, volume: size })
                }
              >
                <Text
                  style={[
                    styles.optionText,
                    customization.volume === size && styles.optionTextActive,
                  ]}
                >
                  {size === "small"
                    ? "200ml"
                    : size === "medium"
                      ? "300ml"
                      : "400ml"}
                </Text>
                {customization.volume === size && (
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

        {/* Sugar Level Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("client.drinkDetail.sugarLevel")}
          </Text>
          <View style={styles.sugarGrid}>
            {SUGAR_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.sugarButton,
                  customization.sugar === level && styles.sugarButtonActive,
                ]}
                onPress={() =>
                  setCustomization({ ...customization, sugar: level })
                }
              >
                <Text
                  style={[
                    styles.sugarText,
                    customization.sugar === level && styles.sugarTextActive,
                  ]}
                >
                  {level}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Milk Type Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("client.drinkDetail.milkType")}
          </Text>
          <View style={styles.milkContainer}>
            {MILK_TYPE_KEYS.map((milkKey) => {
              const key = milkKey as "regular" | "oat" | "coconut" | "none";
              return (
                <TouchableOpacity
                  key={milkKey}
                  style={[
                    styles.milkButton,
                    customization.milk === key && styles.milkButtonActive,
                  ]}
                  onPress={() =>
                    setCustomization({ ...customization, milk: key })
                  }
                >
                  <Ionicons
                    name={key === "none" ? "close-circle" : "checkmark-circle"}
                    size={20}
                    color={
                      customization.milk === key ? COLORS.primary : COLORS.muted
                    }
                  />
                  <Text
                    style={[
                      styles.milkText,
                      customization.milk === key && styles.milkTextActive,
                    ]}
                  >
                    {t(`client.drinkDetail.milk.${milkKey}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Ingredients/Recipe */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("client.drinkDetail.ingredients")}
          </Text>
          <View style={styles.ingredientsList}>
            <IngredientItem
              icon="leaf"
              label={t("client.drinkDetail.espresso")}
            />
            <IngredientItem
              icon="water"
              label={t("client.drinkDetail.water")}
            />
            <IngredientItem
              icon="nutrition"
              label={t("client.drinkDetail.milkIngredient")}
            />
            <IngredientItem
              icon="snow"
              label={t("client.drinkDetail.iceOptional")}
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {/* Quantity Picker */}
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() =>
              customization.quantity > 1 &&
              setCustomization({
                ...customization,
                quantity: customization.quantity - 1,
              })
            }
          >
            <Ionicons name="remove" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{customization.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() =>
              setCustomization({
                ...customization,
                quantity: customization.quantity + 1,
              })
            }
          >
            <Ionicons name="add" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Add to Cart Button */}
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={handleAddToCart}
        >
          <Text style={styles.addToCartText}>
            {t("client.drinkDetail.addToCart")}
          </Text>
          <Text style={styles.priceText}>
            {calculateTotal()} {t("common.currency")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface IngredientItemProps {
  icon: string;
  label: string;
}

function IngredientItem({ icon, label }: IngredientItemProps) {
  return (
    <View style={styles.ingredientItem}>
      <View style={styles.ingredientIconContainer}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Ionicons name={icon as any} size={18} color={COLORS.primary} />
      </View>
      <Text style={styles.ingredientLabel}>{label}</Text>
    </View>
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
  content: {
    flex: 1,
  },
  productImageContainer: {
    height: 200,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  productEmoji: {
    fontSize: 96,
  },
  productInfo: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  productName: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  optionButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: COLORS.card,
  },
  optionButtonActive: {
    backgroundColor: "#EEF2FF",
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  optionTextActive: {
    color: COLORS.primary,
  },
  sugarGrid: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  sugarButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: COLORS.card,
    alignItems: "center",
  },
  sugarButtonActive: {
    backgroundColor: "#EEF2FF",
    borderColor: COLORS.primary,
  },
  sugarText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  sugarTextActive: {
    color: COLORS.primary,
  },
  milkContainer: {
    flexDirection: "column",
    gap: 10,
  },
  milkButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: COLORS.card,
  },
  milkButtonActive: {
    backgroundColor: "#EEF2FF",
    borderColor: COLORS.primary,
  },
  milkText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  milkTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  ingredientsList: {
    flexDirection: "column",
    gap: 10,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  ingredientIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  ingredientLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  addToCartButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  addToCartText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.card,
  },
  priceText: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
});
