/**
 * Main Navigator
 * Bottom tabs navigation for authenticated users
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Tab Screens
import { HomeScreen } from '../screens/HomeScreen';
import { TasksScreen } from '../screens/tasks/TasksScreen';
import { MachinesScreen } from '../screens/machines/MachinesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

// Stack Screens
import { TaskDetailScreen } from '../screens/tasks/TaskDetailScreen';
import { TaskPhotoScreen } from '../screens/tasks/TaskPhotoScreen';
import { MachineDetailScreen } from '../screens/machines/MachineDetailScreen';
import { InventoryScreen } from '../screens/inventory/InventoryScreen';
import { TransferScreen } from '../screens/inventory/TransferScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type MainTabParamList = {
  HomeTab: undefined;
  TasksTab: undefined;
  MachinesTab: undefined;
  ProfileTab: undefined;
};

export type MainStackParamList = {
  HomeTabs: undefined;
  TaskDetail: { taskId: string };
  TaskPhoto: { taskId: string; type: 'before' | 'after' };
  MachineDetail: { machineId: string };
  Inventory: { machineId?: string };
  Transfer: { type: 'warehouse' | 'operator' | 'machine' };
  Notifications: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'TasksTab':
              iconName = focused ? 'clipboard' : 'clipboard-outline';
              break;
            case 'MachinesTab':
              iconName = focused ? 'cafe' : 'cafe-outline';
              break;
            case 'ProfileTab':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: true,
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: 'Главная' }}
      />
      <Tab.Screen
        name="TasksTab"
        component={TasksScreen}
        options={{ title: 'Задачи' }}
      />
      <Tab.Screen
        name="MachinesTab"
        component={MachinesScreen}
        options={{ title: 'Автоматы' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Профиль' }}
      />
    </Tab.Navigator>
  );
}

export function MainNavigator() {
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
        options={{ title: 'Задача' }}
      />
      <Stack.Screen
        name="TaskPhoto"
        component={TaskPhotoScreen}
        options={{ title: 'Фото' }}
      />
      <Stack.Screen
        name="MachineDetail"
        component={MachineDetailScreen}
        options={{ title: 'Автомат' }}
      />
      <Stack.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ title: 'Товары' }}
      />
      <Stack.Screen
        name="Transfer"
        component={TransferScreen}
        options={{ title: 'Перемещение' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Уведомления' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Настройки' }}
      />
    </Stack.Navigator>
  );
}
