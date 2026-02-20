/**
 * Settings Screen
 * User profile settings, language, notifications, app info
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { authApi } from "../services/api";
import { useAuthStore } from "../store/authStore";

interface UserProfile {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  username?: string;
  language: string;
  notificationsEnabled: boolean;
  role: string;
  organizationName?: string;
}

const languageLabels: Record<string, string> = {
  ru: "Русский",
  uz: "O'zbekcha",
  en: "English",
};

export function SettingsScreen() {
  const { t } = useTranslation();
  useNavigation();
  useQueryClient();
  const { logout } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => authApi.me().then((res) => res.data as UserProfile),
  });

  const [notificationsOn, setNotificationsOn] = useState(
    profile?.notificationsEnabled ?? true,
  );

  const handleToggleNotifications = (value: boolean) => {
    setNotificationsOn(value);
  };

  const handleLogout = () => {
    Alert.alert(t("settings.logoutTitle"), t("settings.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.logout"),
        style: "destructive",
        onPress: () => {
          logout();
        },
      },
    ]);
  };

  const handleLanguageSelect = () => {
    Alert.alert(
      t("settings.languageSelect"),
      t("settings.languageSelectSubtitle"),
      [
        { text: "Русский", onPress: () => {} },
        { text: "O'zbekcha", onPress: () => {} },
        { text: "English", onPress: () => {} },
        { text: t("common.cancel"), style: "cancel" },
      ],
    );
  };

  const handleSupport = () => {
    Linking.openURL("https://t.me/vendhub_support");
  };

  const renderSectionHeader = (title: string) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const renderMenuItem = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    value?: string,
    onPress?: () => void,
    rightElement?: React.ReactNode,
    color?: string,
  ) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View
        style={[
          styles.menuIconBg,
          { backgroundColor: (color || "#6B7280") + "15" },
        ]}
      >
        <Ionicons name={icon} size={20} color={color || "#6B7280"} />
      </View>
      <View style={styles.menuContent}>
        <Text
          style={[
            styles.menuLabel,
            color === "#EF4444" && { color: "#EF4444" },
          ]}
        >
          {label}
        </Text>
        {value && <Text style={styles.menuValue}>{value}</Text>}
      </View>
      {rightElement ||
        (onPress && (
          <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
        ))}
    </TouchableOpacity>
  );

  if (isLoading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="settings-outline" size={48} color="#D1D5DB" />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  const displayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    t("settings.user");
  const roleLabel = t(`roles.${profile.role}`);

  return (
    <ScrollView style={styles.container}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile.firstName?.[0] || "U").toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.profileName}>{displayName}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{roleLabel}</Text>
        </View>
        {profile.organizationName && (
          <Text style={styles.orgName}>{profile.organizationName}</Text>
        )}
      </View>

      {/* Account Section */}
      {renderSectionHeader(t("settings.account"))}
      <View style={styles.menuGroup}>
        {renderMenuItem("person-outline", t("settings.name"), displayName)}
        {renderMenuItem(
          "mail-outline",
          "Email",
          profile.email || t("settings.notSpecified"),
        )}
        {renderMenuItem(
          "call-outline",
          t("settings.phone"),
          profile.phone || t("settings.notSpecified"),
        )}
      </View>

      {/* Preferences Section */}
      {renderSectionHeader(t("settings.preferences"))}
      <View style={styles.menuGroup}>
        {renderMenuItem(
          "language-outline",
          t("settings.language"),
          languageLabels[profile.language] || profile.language,
          handleLanguageSelect,
          undefined,
          "#3B82F6",
        )}
        {renderMenuItem(
          "notifications-outline",
          t("settings.notifications"),
          undefined,
          undefined,
          <Switch
            value={notificationsOn}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: "#D1D5DB", true: "#43302b" }}
            thumbColor="#fff"
          />,
          "#F59E0B",
        )}
      </View>

      {/* Support Section */}
      {renderSectionHeader(t("settings.help"))}
      <View style={styles.menuGroup}>
        {renderMenuItem(
          "chatbubble-ellipses-outline",
          t("settings.support"),
          undefined,
          handleSupport,
          undefined,
          "#10B981",
        )}
        {renderMenuItem(
          "document-text-outline",
          t("settings.privacyPolicy"),
          undefined,
          () => Linking.openURL("https://vendhub.uz/privacy"),
          undefined,
          "#8B5CF6",
        )}
        {renderMenuItem(
          "information-circle-outline",
          t("settings.version"),
          "1.0.0",
          undefined,
          undefined,
          "#6B7280",
        )}
      </View>

      {/* Logout */}
      <View style={[styles.menuGroup, { marginTop: 24 }]}>
        {renderMenuItem(
          "log-out-outline",
          t("settings.logout"),
          undefined,
          handleLogout,
          undefined,
          "#EF4444",
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, color: "#9CA3AF", marginTop: 12 },

  // Profile
  profileCard: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: { marginBottom: 12 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#43302b",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 28, fontWeight: "700", color: "#fff" },
  profileName: { fontSize: 20, fontWeight: "700", color: "#1F2937" },
  roleBadge: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#43302b15",
    borderRadius: 8,
  },
  roleText: { fontSize: 13, fontWeight: "600", color: "#43302b" },
  orgName: { fontSize: 13, color: "#6B7280", marginTop: 6 },

  // Section
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 16,
  },

  // Menu
  menuGroup: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 15, color: "#1F2937", fontWeight: "500" },
  menuValue: { fontSize: 13, color: "#9CA3AF", marginTop: 1 },
});
