/**
 * Main Navigator
 * Bottom tabs navigation for authenticated users
 */

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

// Tab Screens
import { HomeScreen } from "../screens/HomeScreen";
import { TasksScreen } from "../screens/tasks/TasksScreen";
import { MachinesScreen } from "../screens/machines/MachinesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";

// Stack Screens
import { TaskDetailScreen } from "../screens/tasks/TaskDetailScreen";
import { TaskPhotoScreen } from "../screens/tasks/TaskPhotoScreen";
import { MachineDetailScreen } from "../screens/machines/MachineDetailScreen";
import { InventoryScreen } from "../screens/inventory/InventoryScreen";
import { TransferScreen } from "../screens/inventory/TransferScreen";
import { TransferHistoryScreen } from "../screens/inventory/TransferHistoryScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { RouteScreen } from "../screens/staff/RouteScreen";
import { MaintenanceScreen } from "../screens/staff/MaintenanceScreen";
import { MaintenanceDetailScreen } from "../screens/staff/MaintenanceDetailScreen";
import { BarcodeScanScreen } from "../screens/staff/BarcodeScanScreen";
import { ProductDetailScreen } from "../screens/products/ProductDetailScreen";
import { useRealtimeNotifications } from "../hooks/useRealtimeNotifications";

export type MainTabParamList = {
  HomeTab: undefined;
  TasksTab: undefined;
  MachinesTab: undefined;
  ProfileTab: undefined;
};

export type MainStackParamList = {
  HomeTabs: undefined;
  TaskDetail: { taskId: string };
  TaskPhoto: { taskId: string; type: "before" | "after" };
  MachineDetail: { machineId: string };
  ProductDetail: { productId: string };
  Inventory: { machineId?: string };
  Transfer: { type: "warehouse" | "operator" | "machine" };
  TransferHistory: { machineId?: string } | undefined;
  Notifications: undefined;
  Settings: undefined;
  Route: undefined;
  Maintenance: { machineId?: string } | undefined;
  MaintenanceDetail: { taskId: string };
  BarcodeScan: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

function HomeTabs() {
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
            case "TasksTab":
              iconName = focused ? "clipboard" : "clipboard-outline";
              break;
            case "MachinesTab":
              iconName = focused ? "cafe" : "cafe-outline";
              break;
            case "ProfileTab":
              iconName = focused ? "person" : "person-outline";
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
        component={HomeScreen}
        options={{ title: t("tabs.home") }}
      />
      <Tab.Screen
        name="TasksTab"
        component={TasksScreen}
        options={{ title: t("tabs.tasks") }}
      />
      <Tab.Screen
        name="MachinesTab"
        component={MachinesScreen}
        options={{ title: t("tabs.machines") }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: t("tabs.profile") }}
      />
    </Tab.Navigator>
  );
}

export function MainNavigator() {
  const { t } = useTranslation();
  useRealtimeNotifications();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeTabs"
        component={HomeTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ title: t("nav.taskDetail") }}
      />
      <Stack.Screen
        name="TaskPhoto"
        component={TaskPhotoScreen}
        options={{ title: t("nav.taskPhoto") }}
      />
      <Stack.Screen
        name="MachineDetail"
        component={MachineDetailScreen}
        options={{ title: t("nav.machineDetail") }}
      />
      <Stack.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ title: t("nav.inventory") }}
      />
      <Stack.Screen
        name="Transfer"
        component={TransferScreen}
        options={{ title: t("nav.transfer") }}
      />
      <Stack.Screen
        name="TransferHistory"
        component={TransferHistoryScreen}
        options={{ title: t("inventory.history", "История переводов") }}
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
      <Stack.Screen
        name="Route"
        component={RouteScreen}
        options={{ title: t("nav.route") }}
      />
      <Stack.Screen
        name="Maintenance"
        component={MaintenanceScreen}
        options={{ title: t("nav.maintenance") }}
      />
      <Stack.Screen
        name="MaintenanceDetail"
        component={MaintenanceDetailScreen}
        options={{ title: t("maintenance.title", "Техобслуживание") }}
      />
      <Stack.Screen
        name="BarcodeScan"
        component={BarcodeScanScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: t("nav.productDetail", "Товар") }}
      />
    </Stack.Navigator>
  );
}
