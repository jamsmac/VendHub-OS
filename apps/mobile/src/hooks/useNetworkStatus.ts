/**
 * Network Status Hook
 * Monitors online/offline connectivity for offline-first UX
 */

import { useEffect, useState } from "react";
import * as Network from "expo-network";

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
  });

  useEffect(() => {
    let mounted = true;

    const checkNetwork = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (mounted) {
          setStatus({
            isConnected: state.isConnected ?? false,
            isInternetReachable: state.isInternetReachable ?? false,
          });
        }
      } catch {
        // Assume online if check fails
      }
    };

    // Initial check
    checkNetwork();

    // Poll every 10 seconds (expo-network doesn't have addEventListener)
    const interval = setInterval(checkNetwork, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return status;
}
