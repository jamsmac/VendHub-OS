import { useState, useEffect, useCallback } from 'react';

interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface GeolocationState {
  position: Position | null;
  error: string | null;
  isLoading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isLoading: true,
  });

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Геолокация не поддерживается',
        isLoading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          position: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          error: null,
          isLoading: false,
        });
      },
      (error) => {
        let message = 'Ошибка получения геолокации';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Доступ к геолокации запрещён';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Местоположение недоступно';
            break;
          case error.TIMEOUT:
            message = 'Время ожидания истекло';
            break;
        }
        setState((prev) => ({
          ...prev,
          error: message,
          isLoading: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  useEffect(() => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  return {
    ...state,
    getCurrentPosition,
  };
}
