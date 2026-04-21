/**
 * VendHub Mobile App - React Native / Expo
 * Main entry point with offline-first persistence
 */

import "./src/i18n";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { NavigationContainer } from "@react-navigation/native";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { OfflineBanner } from "./src/components/OfflineBanner";
import { QueueBadge } from "./src/components/QueueBadge";
import { queryClient, persistOptions } from "./src/lib/offline";

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={persistOptions}
        >
          <NavigationContainer>
            <StatusBar style="auto" />
            <OfflineBanner />
            <QueueBadge />
            <RootNavigator />
          </NavigationContainer>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
