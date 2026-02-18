/**
 * API Service
 * Axios instance with interceptors for auth and error handling
 */

import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const API_URL = Constants.expoConfig?.extra?.apiUrl || "http://localhost:4000";

const TOKEN_KEY = "vendhub-access-token";
const REFRESH_TOKEN_KEY = "vendhub-refresh-token";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Token management helpers
export const tokenStorage = {
  getAccessToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  setTokens: async (accessToken: string, refreshToken?: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
  },
  clearTokens: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};

// Request interceptor — attach auth token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — handle errors and token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((prom) => {
    if (token) prom.resolve(token);
    else prom.reject(error);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Attempt token refresh on 401 (but not for auth endpoints)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
            refreshToken,
          });
          const newToken = data.accessToken || data.access_token;
          await tokenStorage.setTokens(
            newToken,
            data.refreshToken || data.refresh_token,
          );
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        await tokenStorage.clearTokens();
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// API methods
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (data: {
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string;
    password: string;
  }) => api.post("/auth/register", data),
  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),
  me: () => api.get("/auth/me"),
  refresh: (refreshToken: string) =>
    api.post("/auth/refresh", { refreshToken }),
};

export const tasksApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/tasks", { params }),
  getMy: () => api.get("/tasks/my"),
  getById: (id: string) => api.get(`/tasks/${id}`),
  start: (id: string) => api.post(`/tasks/${id}/start`),
  uploadPhotoBefore: (id: string, formData: FormData) =>
    api.post(`/tasks/${id}/photo-before`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  uploadPhotoAfter: (id: string, formData: FormData) =>
    api.post(`/tasks/${id}/photo-after`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  complete: (id: string, data: any) => api.post(`/tasks/${id}/complete`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateItems: (id: string, items: any[]) =>
    api.patch(`/tasks/${id}/items`, { items }),
};

export const machinesApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/machines", { params }),
  getMy: () => api.get("/machines/my"),
  getById: (id: string) => api.get(`/machines/${id}`),
  getInventory: (id: string) => api.get(`/machines/${id}/inventory`),
};

export const inventoryApi = {
  getOperator: () => api.get("/inventory/operator"),
  getMachine: (machineId: string) =>
    api.get("/inventory/machine", { params: { machineId } }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transfer: (data: any) => api.post("/inventory/transfer", data),
  createTransfer: (data: {
    fromMachineId: string;
    toMachineId: string;
    items: { productId: string; quantity: number }[];
    note?: string;
  }) => api.post("/inventory/transfer", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMovements: (params?: any) => api.get("/inventory/movements", { params }),
};

export const notificationsApi = {
  getAll: () => api.get("/notifications"),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post("/notifications/read-all"),
  registerPushToken: (token: string) =>
    api.post("/notifications/push-token", { token }),
};

export const reportsApi = {
  getDashboard: () => api.get("/reports/dashboard"),
  getMyStats: () => api.get("/reports/my-stats"),
};

// ============================================
// Client-facing API methods
// ============================================

export const ordersApi = {
  create: (data: {
    machineId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: { productId: string; quantity: number; customization?: any }[];
    paymentMethod?: string;
    usePoints?: number;
  }) => api.post("/orders", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMy: (params?: any) => api.get("/orders/my", { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
};

export const productsApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/products", { params }),
  getByMachine: (machineId: string) =>
    api.get(`/machines/${machineId}/products`),
  getById: (id: string) => api.get(`/products/${id}`),
  getRecipes: (productId: string) => api.get(`/products/${productId}/recipes`),
};

export const loyaltyApi = {
  getMe: () => api.get("/loyalty/me"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getHistory: (params?: any) => api.get("/loyalty/history", { params }),
  getRewards: () => api.get("/loyalty/rewards"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getLeaderboard: (params?: any) => api.get("/loyalty/leaderboard", { params }),
};

export const questsApi = {
  getAll: () => api.get("/quests"),
  getMy: () => api.get("/quests/my"),
  getStreak: () => api.get("/quests/streak"),
  claim: (questId: string) => api.post(`/quests/${questId}/claim`),
};

export const achievementsApi = {
  getMy: () => api.get("/achievements/my"),
  getMyAll: () => api.get("/achievements/my/all"),
  claim: (id: string) => api.post(`/achievements/my/${id}/claim`),
};

export const favoritesApi = {
  getMachines: () => api.get("/favorites/machines"),
  getProducts: () => api.get("/favorites/products"),
  addMachine: (machineId: string) =>
    api.post(`/favorites/machines/${machineId}`),
  removeMachine: (machineId: string) =>
    api.delete(`/favorites/machines/${machineId}`),
  addProduct: (productId: string) =>
    api.post(`/favorites/products/${productId}`),
  removeProduct: (productId: string) =>
    api.delete(`/favorites/products/${productId}`),
};

export const promoCodesApi = {
  validate: (code: string) => api.post("/promo-codes/validate", { code }),
  redeem: (code: string, orderId?: string) =>
    api.post("/promo-codes/redeem", { code, orderId }),
};

export const referralsApi = {
  getStats: () => api.get("/referrals/stats"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getHistory: (params?: any) => api.get("/referrals/history", { params }),
};
