/**
 * Task Photo Screen
 * Camera for capturing before/after photos
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../services/api';
import { MainStackParamList } from '../../navigation/MainNavigator';

type RouteType = RouteProp<MainStackParamList, 'TaskPhoto'>;

export function TaskPhotoScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const queryClient = useQueryClient();
  const { taskId, type } = route.params;

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const cameraRef = useRef<Camera>(null);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async (uri: string) => {
      const formData = new FormData();
      formData.append('photo', {
        uri,
        type: 'image/jpeg',
        name: `photo_${type}_${Date.now()}.jpg`,
      } as any);

      if (type === 'before') {
        return tasksApi.uploadPhotoBefore(taskId, formData);
      } else {
        return tasksApi.uploadPhotoAfter(taskId, formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      Alert.alert('Успешно', 'Фото загружено!');
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert('Ошибка', error.response?.data?.message || 'Не удалось загрузить фото');
    },
  });

  const takePhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
      });
      setPhoto(photo.uri);
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

  const confirmPhoto = () => {
    if (photo) {
      uploadMutation.mutate(photo);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Запрос доступа к камере...</Text></View>;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Нет доступа к камере</Text>
        <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
          <Text style={styles.galleryButtonText}>Выбрать из галереи</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo }} style={styles.preview} />
        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.retakeButton} onPress={() => setPhoto(null)}>
            <Ionicons name="refresh" size={24} color="#fff" />
            <Text style={styles.retakeText}>Переснять</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={confirmPhoto}>
            <Ionicons name="checkmark" size={24} color="#fff" />
            <Text style={styles.confirmText}>Подтвердить</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} type={CameraType.back} ref={cameraRef}>
        <View style={styles.cameraOverlay}>
          <Text style={styles.cameraTitle}>
            {type === 'before' ? 'Фото ДО выполнения' : 'Фото ПОСЛЕ выполнения'}
          </Text>
        </View>
      </Camera>
      <View style={styles.controls}>
        <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
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
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 50,
  },
  cameraTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#000',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#000',
  },
  galleryButton: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '500',
  },
  preview: {
    flex: 1,
  },
  previewActions: {
    flexDirection: 'row',
    padding: 24,
    backgroundColor: '#000',
    gap: 16,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B7280',
    padding: 16,
    borderRadius: 12,
  },
  retakeText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
});
