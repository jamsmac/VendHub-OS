/**
 * Order Success Screen
 * Success confirmation after placing an order
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NavigationProp = NativeStackNavigationProp<any>;

interface OrderSuccessRouteParams {
  orderId: string;
  orderNumber: string;
  estimatedTime: number;
  pointsEarned: number;
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

export function OrderSuccessScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const params = (route.params as OrderSuccessRouteParams) || {
    orderId: "ORD-12345",
    orderNumber: "#12345",
    estimatedTime: 3,
    pointsEarned: 250,
  };

  const [timeRemaining, setTimeRemaining] = useState(params.estimatedTime * 60);
  const [scaleAnim] = useState(new Animated.Value(0));

  // Animate checkmark
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [scaleAnim]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const handleViewReceipt = () => {
    navigation.navigate("Orders", {
      orderId: params.orderId,
    });
  };

  const handleBackHome = () => {
    navigation.navigate("ClientHome");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Checkmark Animation */}
      <Animated.View
        style={[
          styles.checkmarkContainer,
          {
            transform: [
              {
                scale: scaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.checkmarkCircle}>
          <Ionicons name="checkmark" size={80} color={COLORS.green} />
        </View>
      </Animated.View>

      {/* Success Title */}
      <Text style={styles.successTitle}>Order Confirmed!</Text>

      {/* Order Number */}
      <View style={styles.orderNumberCard}>
        <Text style={styles.orderNumberLabel}>Order Number</Text>
        <Text style={styles.orderNumber}>{params.orderNumber}</Text>
        <TouchableOpacity style={styles.copyButton}>
          <Ionicons name="copy" size={16} color={COLORS.primary} />
          <Text style={styles.copyText}>Copy</Text>
        </TouchableOpacity>
      </View>

      {/* Status Message */}
      <View style={styles.statusSection}>
        <View style={styles.statusIcon}>
          <Ionicons name="hourglass" size={32} color={COLORS.amber} />
        </View>
        <Text style={styles.statusTitle}>Your drink is being prepared</Text>
        <Text style={styles.statusSubtitle}>
          The barista is making your perfect beverage right now
        </Text>
      </View>

      {/* Estimated Time */}
      <View style={styles.timerCard}>
        <Text style={styles.timerLabel}>Estimated Ready Time</Text>
        <View style={styles.timerDisplay}>
          <Ionicons name="timer" size={28} color={COLORS.primary} />
          <Text style={styles.timerValue}>
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </Text>
          <Text style={styles.timerUnit}>min</Text>
        </View>
        <Text style={styles.timerHint}>We'll notify you when it's ready</Text>
      </View>

      {/* Points Earned */}
      <View style={styles.pointsSection}>
        <View style={styles.pointsEarnedCard}>
          <View style={styles.pointsIconContainer}>
            <Ionicons name="gift" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.pointsInfo}>
            <Text style={styles.pointsEarnedLabel}>Points Earned</Text>
            <Text style={styles.pointsEarnedAmount}>
              +{params.pointsEarned}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </View>
      </View>

      {/* Order Details Summary */}
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons
              name="location-outline"
              size={20}
              color={COLORS.primary}
            />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Machine Location</Text>
            <Text style={styles.detailValue}>Downtown Coffee Stand #1</Text>
          </View>
        </View>

        <View style={styles.detailDivider} />

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="card-outline" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>Payme</Text>
          </View>
        </View>

        <View style={styles.detailDivider} />

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Order Time</Text>
            <Text style={styles.detailValue}>
              {new Date().toLocaleTimeString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleViewReceipt}
        >
          <Ionicons name="receipt" size={20} color={COLORS.card} />
          <Text style={styles.primaryButtonText}>View Receipt</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleBackHome}
        >
          <Ionicons name="home" size={20} color={COLORS.primary} />
          <Text style={styles.secondaryButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>

      {/* Support Info */}
      <View style={styles.supportSection}>
        <Ionicons name="help-circle-outline" size={20} color={COLORS.muted} />
        <Text style={styles.supportText}>
          Need help? Contact support for any issues with your order
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: "center",
  },
  checkmarkContainer: {
    marginBottom: 24,
  },
  checkmarkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 24,
    textAlign: "center",
  },
  orderNumberCard: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  orderNumberLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 8,
    fontWeight: "600",
  },
  orderNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 12,
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    gap: 4,
  },
  copyText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },
  statusSection: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
  },
  statusIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },
  statusSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  timerCard: {
    width: "100%",
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  timerLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 12,
    fontWeight: "600",
  },
  timerDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 42,
    fontWeight: "700",
    color: COLORS.primary,
    fontFamily: "Courier New",
  },
  timerUnit: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
  timerHint: {
    fontSize: 12,
    color: COLORS.muted,
  },
  pointsSection: {
    width: "100%",
    marginBottom: 24,
  },
  pointsEarnedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  pointsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  pointsInfo: {
    flex: 1,
  },
  pointsEarnedLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 2,
    fontWeight: "600",
  },
  pointsEarnedAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.green,
  },
  detailsCard: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 2,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "600",
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },
  actionSection: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.card,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  supportSection: {
    marginTop: 24,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  supportText: {
    fontSize: 12,
    color: COLORS.muted,
    flex: 1,
    textAlign: "center",
    lineHeight: 18,
  },
});
