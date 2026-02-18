/**
 * Client Navigator
 * Bottom tabs + stack navigation for client mode
 */

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

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
import { ProfileScreen } from "../screens/ProfileScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

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
  Profile: undefined;
  Notifications: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<ClientTabParamList>();
const Stack = createNativeStackNavigator<ClientStackParamList>();

function ClientTabs() {
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
        options={{ title: "Главная" }}
      />
      <Tab.Screen
        name="MapTab"
        component={MapScreen}
        options={{ title: "Карта", headerShown: false }}
      />
      <Tab.Screen
        name="LoyaltyTab"
        component={LoyaltyScreen}
        options={{ title: "Бонусы" }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{ title: "Избранное" }}
      />
    </Tab.Navigator>
  );
}

export function ClientNavigator() {
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
        options={{ title: "Меню" }}
      />
      <Stack.Screen
        name="DrinkDetail"
        component={DrinkDetailScreen}
        options={{ title: "Настроить напиток" }}
      />
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{ title: "Корзина" }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: "Оформление" }}
      />
      <Stack.Screen
        name="OrderSuccess"
        component={OrderSuccessScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Quests"
        component={QuestsScreen}
        options={{ title: "Квесты" }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Профиль" }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Уведомления" }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Настройки" }}
      />
    </Stack.Navigator>
  );
}
