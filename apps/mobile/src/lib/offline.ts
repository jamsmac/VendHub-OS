/**
 * Offline Persistence Configuration
 * Uses AsyncStorage to persist React Query cache for offline support.
 * Only safe/public query keys are persisted — sensitive data (orders,
 * profile, notifications, cart, financial) stays in-memory only.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

const CACHE_TIME = 1000 * 60 * 60 * 24; // 24 hours

/** Query key prefixes safe to persist to AsyncStorage */
const SAFE_QUERY_PREFIXES = [
  "machine",
  "machines-map",
  "my-machines",
  "machine-inventory",
  "product",
  "menu-products",
  "nearby-machines",
  "quests",
  "daily-streak",
  "my-achievements",
];

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: CACHE_TIME,
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

export const persistOptions = {
  persister: createAsyncStoragePersister({
    storage: AsyncStorage,
    key: "vendhub-query-cache",
    throttleTime: 1000,
  }),
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { queryKey: readonly unknown[] }) => {
      const key = String(query.queryKey[0] ?? "");
      return SAFE_QUERY_PREFIXES.some((prefix) => key.startsWith(prefix));
    },
  },
};
