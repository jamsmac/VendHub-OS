/**
 * Offline Banner
 * Shows a persistent banner when the device is offline
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();

  if (isConnected) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Нет подключения к интернету</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F59E0B",
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
