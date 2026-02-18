/**
 * Barcode Scan Screen
 * Scan machine QR/barcode for quick identification
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BarCodeScanner, BarCodeScannerResult } from "expo-barcode-scanner";
import { api } from "../../services/api";

const COLORS = {
  primary: "#4F46E5",
  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
  text: "#1F2937",
  muted: "#6B7280",
};

const { width } = Dimensions.get("window");
const SCAN_SIZE = width * 0.7;

export function BarcodeScanScreen() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = async ({
    _type,
    data,
  }: BarCodeScannerResult) => {
    if (scanned || isLoading) return;
    setScanned(true);
    setIsLoading(true);

    try {
      // Try to find machine by scanned code
      let machineId: string | null = null;

      // Check if it's a VendHub URL (e.g., vendhub.uz/m/ABC123)
      const urlMatch = data.match(/vendhub\.uz\/m\/([A-Za-z0-9]+)/);
      if (urlMatch) {
        machineId = urlMatch[1];
      }

      // Try as machine code directly
      if (!machineId) {
        try {
          const res = await api.get("/machines", { params: { code: data } });
          const machines = res.data?.data || res.data;
          if (machines?.length > 0) {
            machineId = machines[0].id;
          }
        } catch {
          // Not found by code, try as direct ID
          machineId = data;
        }
      }

      if (machineId) {
        // Verify machine exists
        try {
          await api.get(`/machines/${machineId}`);
          navigation.navigate("MachineDetail", { machineId });
        } catch {
          Alert.alert("Не найдено", `Автомат с кодом "${data}" не найден`, [
            { text: "Сканировать ещё", onPress: () => setScanned(false) },
          ]);
        }
      } else {
        Alert.alert("Не найдено", "Не удалось распознать код автомата", [
          { text: "Сканировать ещё", onPress: () => setScanned(false) },
        ]);
      }
    } catch (_error) {
      Alert.alert("Ошибка", "Не удалось обработать код", [
        { text: "Повторить", onPress: () => setScanned(false) },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.permissionText}>Запрос доступа к камере...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={64} color={COLORS.muted} />
        <Text style={styles.permissionTitle}>Нет доступа к камере</Text>
        <Text style={styles.permissionText}>
          Разрешите доступ к камере в настройках устройства для сканирования
          QR-кодов
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        barCodeTypes={[
          BarCodeScanner.Constants.BarCodeType.qr,
          BarCodeScanner.Constants.BarCodeType.code128,
          BarCodeScanner.Constants.BarCodeType.ean13,
        ]}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top overlay */}
        <View style={styles.overlaySection} />

        {/* Middle row with scan window */}
        <View style={styles.middleRow}>
          <View style={styles.overlaySection} />
          <View style={styles.scanWindow}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.overlaySection} />
        </View>

        {/* Bottom overlay */}
        <View
          style={[
            styles.overlaySection,
            { alignItems: "center", paddingTop: 32 },
          ]}
        >
          <Text style={styles.instructionText}>
            {isLoading
              ? "Поиск автомата..."
              : "Наведите камеру на QR-код автомата"}
          </Text>

          {isLoading && (
            <ActivityIndicator
              size="small"
              color="#fff"
              style={{ marginTop: 12 }}
            />
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setFlashOn(!flashOn)}
            >
              <Ionicons
                name={flashOn ? "flash" : "flash-outline"}
                size={24}
                color="#fff"
              />
              <Text style={styles.actionText}>Вспышка</Text>
            </TouchableOpacity>

            {scanned && !isLoading && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setScanned(false)}
              >
                <Ionicons name="refresh" size={24} color="#fff" />
                <Text style={styles.actionText}>Повторить</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Close button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 16,
  },
  permissionText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  backButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  overlay: { ...StyleSheet.absoluteFillObject },
  overlaySection: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  middleRow: { flexDirection: "row", height: SCAN_SIZE },
  scanWindow: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    backgroundColor: "transparent",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: COLORS.primary,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  instructionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 32,
    marginTop: 24,
  },
  actionButton: { alignItems: "center", gap: 4 },
  actionText: { color: "#fff", fontSize: 12 },
  closeButton: {
    position: "absolute",
    top: 56,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
});
