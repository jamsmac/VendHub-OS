/**
 * Profile Screen
 * User profile and settings
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { useAppModeStore, AppMode } from "../store/appModeStore";
import { MainStackParamList } from "../navigation/MainNavigator";

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuthStore();
  const { mode, setMode } = useAppModeStore();
  const { t } = useTranslation();

  const handleModeSwitch = () => {
    const newMode: AppMode = mode === "staff" ? "client" : "staff";
    const label =
      newMode === "staff" ? t("profile.modeStaff") : t("profile.modeClient");
    Alert.alert(t("profile.switchMode"), t("profile.switchTo", { label }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("profile.switchBtn"), onPress: () => setMode(newMode) },
    ]);
  };

  const getRoleLabel = (role: string) => {
    return t(`roles.${role}`, { defaultValue: role });
  };

  const handleLogout = () => {
    Alert.alert(t("profile.logoutConfirm"), t("profile.logoutMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("profile.logoutBtn"), style: "destructive", onPress: logout },
    ]);
  };

  const menuItems = [
    {
      icon: "person-outline",
      label: t("profile.editProfile"),
      onPress: () =>
        Alert.alert(t("profile.editProfile"), t("profile.editProfileMessage")),
    },
    {
      icon: "notifications-outline",
      label: t("profile.notifications"),
      onPress: () => navigation.navigate("Notifications"),
    },
    {
      icon: "settings-outline",
      label: t("profile.settings"),
      onPress: () => navigation.navigate("Settings"),
    },
    {
      icon: "help-circle-outline",
      label: t("profile.help"),
      onPress: () => Linking.openURL("https://t.me/vendhub_support"),
    },
    {
      icon: "information-circle-outline",
      label: t("profile.about"),
      onPress: () =>
        Alert.alert(t("profile.aboutTitle"), t("profile.aboutMessage")),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0]}
            {user?.lastName?.[0] || ""}
          </Text>
        </View>
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark" size={14} color="#4F46E5" />
          <Text style={styles.roleText}>{getRoleLabel(user?.role || "")}</Text>
        </View>
      </View>

      {/* Contact Info */}
      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={20} color="#6B7280" />
          <Text style={styles.infoText}>{user?.email}</Text>
        </View>
        {user?.phone && (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{user.phone}</Text>
          </View>
        )}
      </View>

      {/* Menu */}
      <View style={styles.section}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Ionicons name={item.icon as any} size={22} color="#374151" />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Mode Switch */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={handleModeSwitch}>
          <Ionicons
            name={
              mode === "staff" ? "swap-horizontal" : "swap-horizontal-outline"
            }
            size={22}
            color="#4F46E5"
          />
          <Text style={[styles.menuLabel, { color: "#4F46E5" }]}>
            {mode === "staff"
              ? t("profile.switchToClient")
              : t("profile.switchToStaff")}
          </Text>
          <View style={styles.modeBadge}>
            <Text style={styles.modeBadgeText}>
              {mode === "staff" ? "Staff" : "Client"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>{t("profile.logoutBtn")}</Text>
        </TouchableOpacity>
      </View>

      {/* Version */}
      <Text style={styles.version}>{t("profile.version")}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "500",
    marginLeft: 6,
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 16,
    paddingHorizontal: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoText: {
    fontSize: 15,
    color: "#374151",
    marginLeft: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 15,
    color: "#EF4444",
    marginLeft: 12,
  },
  modeBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  modeBadgeText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "600",
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    marginVertical: 24,
  },
});
