/**
 * Root Navigator
 * Handles auth state, app mode (client/staff), and main navigation
 */

import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../store/authStore";
import { useAppModeStore } from "../store/appModeStore";
import { registerForPushNotifications } from "../services/push-notifications";
import {
  connect as connectSocket,
  disconnect as disconnectSocket,
} from "../services/socket";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import { ClientNavigator } from "./ClientNavigator";
import { SplashScreen } from "../screens/SplashScreen";

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
  Client: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { mode, isLoading: modeLoading, loadMode } = useAppModeStore();

  useEffect(() => {
    loadMode();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void registerForPushNotifications();
      void connectSocket();
      return () => {
        disconnectSocket();
      };
    }
    return undefined;
  }, [isAuthenticated]);

  if (authLoading || modeLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        mode === "staff" ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Client" component={ClientNavigator} />
        )
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
