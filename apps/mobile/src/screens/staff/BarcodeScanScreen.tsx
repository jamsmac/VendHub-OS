/**
 * Barcode Scan Screen
 * Scan machine QR/barcode for quick identification
 */

import React, { useState } from "react";
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
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTranslation } from "react-i18next";
import { api, productsApi } from "../../services/api";
import { MainStackParamList } from "../../navigation/MainNavigator";

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
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  React.useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = async ({
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (scanned || isLoading) return;
    setScanned(true);
    setIsLoading(true);

    try {
      // 1. Try to find machine by scanned code first
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
          if (Array.isArray(machines) && machines.length > 0) {
            machineId = (machines[0] as { id: string }).id;
          }
        } catch {
          // Not a machine code
        }
      }

      if (machineId) {
        // Verify machine exists and navigate
        try {
          await api.get(`/machines/${machineId}`);
          navigation.navigate("MachineDetail", { machineId });
          return;
        } catch {
          // Machine not found by that ID — fall through to product lookup
        }
      }

      // 2. Try product lookup by barcode or SKU
      try {
        const res = await productsApi.getByBarcode(data);
        const product = res.data as { id: string };
        navigation.navigate("ProductDetail", { productId: product.id });
        return;
      } catch {
        // Not a product either
      }

      // 3. Nothing matched
      Alert.alert(
        t("barcode.notFound", "Товар не найден"),
        t(
          "barcode.notFoundDesc",
          "По этому штрихкоду товар не найден. Проверьте штрихкод или добавьте товар вручную.",
        ),
        [{ text: t("common.ok", "OK"), onPress: () => setScanned(false) }],
      );
    } catch (_error) {
      Alert.alert(t("common.error"), t("barcodeScan.processFailed"), [
        { text: t("common.retry"), onPress: () => setScanned(false) },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.permissionText}>
          {t("barcodeScan.requestingAccess")}
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={64} color={COLORS.muted} />
        <Text style={styles.permissionTitle}>{t("barcodeScan.noAccess")}</Text>
        <Text style={styles.permissionText}>{t("barcodeScan.accessHint")}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>{t("common.back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        facing="back"
        enableTorch={flashOn}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "code128", "ean13"],
        }}
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
              ? t("barcodeScan.searching")
              : t("barcodeScan.instruction")}
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
              <Text style={styles.actionText}>{t("barcodeScan.flash")}</Text>
            </TouchableOpacity>

            {scanned && !isLoading && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setScanned(false)}
              >
                <Ionicons name="refresh" size={24} color="#fff" />
                <Text style={styles.actionText}>{t("common.retry")}</Text>
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
