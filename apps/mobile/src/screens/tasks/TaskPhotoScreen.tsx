/**
 * Task Photo Screen
 * Camera for capturing before/after photos
 */

import React, { useState, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { tasksApi } from "../../services/api";
import { MainStackParamList } from "../../navigation/MainNavigator";
import { RetryableAction } from "../../components";

type RouteType = RouteProp<MainStackParamList, "TaskPhoto">;

export function TaskPhotoScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { taskId, type } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  React.useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const uploadAction = useCallback(async () => {
    if (!photo) return;
    const formData = new FormData();
    formData.append("photo", {
      uri: photo,
      type: "image/jpeg",
      name: `photo_${type}_${Date.now()}.jpg`,
    } as unknown as Blob);

    if (type === "before") {
      await tasksApi.uploadPhotoBefore(taskId, formData);
    } else {
      await tasksApi.uploadPhotoAfter(taskId, formData);
    }
    queryClient.invalidateQueries({ queryKey: ["task", taskId] });
  }, [photo, type, taskId, queryClient]);

  const handleUploadSuccess = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const takePhoto = async () => {
    if (cameraRef.current) {
      const result = await cameraRef.current.takePictureAsync({
        quality: 0.7,
      });
      if (result) {
        setPhoto(result.uri);
      }
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>{t("taskPhoto.requestingAccess")}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{t("taskPhoto.noAccess")}</Text>
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={pickFromGallery}
        >
          <Text style={styles.galleryButtonText}>
            {t("taskPhoto.pickFromGallery")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo }} style={styles.preview} />
        <View style={styles.previewActions}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => setPhoto(null)}
          >
            <Ionicons name="refresh" size={24} color="#fff" />
            <Text style={styles.retakeText}>{t("taskPhoto.retake")}</Text>
          </TouchableOpacity>
          <View style={styles.uploadWrapper}>
            <RetryableAction
              label={t("tasks.uploadPhoto", "Загрузить фото")}
              action={uploadAction}
              maxAttempts={3}
              onSuccess={handleUploadSuccess}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef}>
        <View style={styles.cameraOverlay}>
          <Text style={styles.cameraTitle}>
            {type === "before"
              ? t("taskPhoto.photoBefore")
              : t("taskPhoto.photoAfter")}
          </Text>
        </View>
      </CameraView>
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={pickFromGallery}
        >
          <Ionicons name="images" size={28} color="#4F46E5" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
          <View style={styles.captureInner} />
        </TouchableOpacity>
        <View style={{ width: 60 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 50,
  },
  cameraTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#000",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#000",
  },
  galleryButton: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  galleryButtonText: {
    color: "#4F46E5",
    fontSize: 16,
    fontWeight: "500",
  },
  preview: {
    flex: 1,
  },
  previewActions: {
    flexDirection: "row",
    padding: 24,
    backgroundColor: "#000",
    gap: 16,
  },
  retakeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6B7280",
    padding: 16,
    borderRadius: 12,
  },
  retakeText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 8,
  },
  uploadWrapper: {
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 16,
  },
});
