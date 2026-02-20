import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isLoading: true,
  });

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: t("geoNotSupported"),
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
        let message = t("geoError");
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = t("geoPermissionDenied");
            break;
          case error.POSITION_UNAVAILABLE:
            message = t("geoPositionUnavailable");
            break;
          case error.TIMEOUT:
            message = t("geoTimeout");
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
      },
    );
  }, [t]);

  useEffect(() => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  return {
    ...state,
    getCurrentPosition,
  };
}
