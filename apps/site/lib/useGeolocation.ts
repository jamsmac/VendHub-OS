"use client";

import { useState, useCallback } from "react";

export type GeolocationErrorCode =
  | "permission_denied"
  | "unavailable"
  | "timeout"
  | "not_supported"
  | "unknown";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: GeolocationErrorCode | null;
}

interface UseGeolocationReturn extends GeolocationState {
  requestLocation: () => void;
}

const ERROR_CODE_MAP: Record<number, GeolocationErrorCode> = {
  1: "permission_denied",
  2: "unavailable",
  3: "timeout",
};

export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    loading: false,
    error: null,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "not_supported",
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (error) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: ERROR_CODE_MAP[error.code] ?? "unknown",
        }));
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }, []);

  return { ...state, requestLocation };
}
