import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  // Physical device check: expo-device not installed; use Constants fallback.
  // On simulators/emulators Constants.isDevice is false (Expo SDK ≥ 46).
  const isDevice = (Constants as { isDevice?: boolean }).isDevice ?? true;
  if (!isDevice) {
    console.warn("Push notifications require a physical device");
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D3A066",
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse.data;

    const platformVersion =
      typeof Platform.Version === "string"
        ? Platform.Version
        : String(Platform.Version);

    await api.post("/notifications/register-device", {
      token,
      deviceType: Platform.OS === "ios" ? "ios" : "android",
      platformVersion,
      appVersion: Constants.expoConfig?.version ?? undefined,
    });

    return token;
  } catch (err) {
    console.warn("Failed to register push token:", err);
    return null;
  }
}
