/**
 * Client Navigator
 * Bottom tabs + stack navigation for client mode
 */

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

// Tab Screens
import { ClientHomeScreen } from "../screens/client/ClientHomeScreen";
import { MapScreen } from "../screens/client/MapScreen";
import { LoyaltyScreen } from "../screens/client/LoyaltyScreen";
import { FavoritesScreen } from "../screens/client/FavoritesScreen";

// Stack Screens
import { MenuScreen } from "../screens/client/MenuScreen";
import { DrinkDetailScreen } from "../screens/client/DrinkDetailScreen";
import { CartScreen } from "../screens/client/CartScreen";
import { CheckoutScreen } from "../screens/client/CheckoutScreen";
import { OrderSuccessScreen } from "../screens/client/OrderSuccessScreen";
import { QuestsScreen } from "../screens/client/QuestsScreen";
import { OrderHistoryScreen } from "../screens/client/OrderHistoryScreen";
import { AchievementsScreen } from "../screens/client/AchievementsScreen";
import { PromoCodeScreen } from "../screens/client/PromoCodeScreen";
import { ReferralScreen } from "../screens/client/ReferralScreen";
import { PointsHistoryScreen } from "../screens/client/PointsHistoryScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { useRealtimeNotifications } from "../hooks/useRealtimeNotifications";

export type ClientTabParamList = {
  HomeTab: undefined;
  MapTab: undefined;
  LoyaltyTab: undefined;
  FavoritesTab: undefined;
};

export type ClientStackParamList = {
  ClientTabs: undefined;
  Menu: { machineId: string };
  DrinkDetail: { machineId: string; productId: string };
  Cart: undefined;
  Checkout: undefined;
  OrderSuccess: { orderId: string; total?: number; points?: number };
  Quests: undefined;
  OrderHistory: undefined;
  Achievements: undefined;
  PromoCode: undefined;
  Referrals: undefined;
  FullHistory: undefined;
  Profile: undefined;
  Notifications: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<ClientTabParamList>();
const Stack = createNativeStackNavigator<ClientStackParamList>();

function ClientTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case "HomeTab":
              iconName = focused ? "home" : "home-outline";
              break;
            case "MapTab":
              iconName = focused ? "map" : "map-outline";
              break;
            case "LoyaltyTab":
              iconName = focused ? "gift" : "gift-outline";
              break;
            case "FavoritesTab":
              iconName = focused ? "heart" : "heart-outline";
              break;
            default:
              iconName = "help-circle-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#4F46E5",
        tabBarInactiveTintColor: "#6B7280",
        headerShown: true,
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={ClientHomeScreen}
        options={{ title: t("tabs.home") }}
      />
      <Tab.Screen
        name="MapTab"
        component={MapScreen}
        options={{ title: t("tabs.map"), headerShown: false }}
      />
      <Tab.Screen
        name="LoyaltyTab"
        component={LoyaltyScreen}
        options={{ title: t("tabs.loyalty") }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{ title: t("tabs.favorites") }}
      />
    </Tab.Navigator>
  );
}

export function ClientNavigator() {
  const { t } = useTranslation();
  useRealtimeNotifications();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ClientTabs"
        component={ClientTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Menu"
        component={MenuScreen}
        options={{ title: t("nav.menu") }}
      />
      <Stack.Screen
        name="DrinkDetail"
        component={DrinkDetailScreen}
        options={{ title: t("nav.customizeDrink") }}
      />
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{ title: t("nav.cart") }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: t("nav.checkout") }}
      />
      <Stack.Screen
        name="OrderSuccess"
        component={OrderSuccessScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Quests"
        component={QuestsScreen}
        options={{ title: t("nav.quests") }}
      />
      <Stack.Screen
        name="OrderHistory"
        component={OrderHistoryScreen}
        options={{ title: t("nav.orders") }}
      />
      <Stack.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{ title: t("nav.achievements") }}
      />
      <Stack.Screen
        name="PromoCode"
        component={PromoCodeScreen}
        options={{ title: t("nav.promoCode") }}
      />
      <Stack.Screen
        name="Referrals"
        component={ReferralScreen}
        options={{ title: t("nav.referrals") }}
      />
      <Stack.Screen
        name="FullHistory"
        component={PointsHistoryScreen}
        options={{ title: t("nav.pointsHistory") }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t("tabs.profile") }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: t("nav.notifications") }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t("nav.settings") }}
      />
    </Stack.Navigator>
  );
}
