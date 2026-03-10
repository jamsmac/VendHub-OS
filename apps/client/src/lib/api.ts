import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useUserStore } from "./store";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================
// Token helpers — in-memory only (no localStorage)
// ============================================

let _accessToken: string | null = null;

function setTokens(accessToken: string, _refreshToken?: string) {
  _accessToken = accessToken;
  // Refresh token is stored in httpOnly cookie by the server —
  // no client-side storage needed
}

function clearTokens() {
  _accessToken = null;
}

function getAccessToken(): string | null {
  return _accessToken;
}

export { setTokens, clearTokens, getAccessToken };

// ============================================
// Request interceptor — attach auth token
// ============================================

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Strip empty-string, null, and undefined query params
  if (config.params) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      config.params as Record<string, unknown>,
    )) {
      if (value !== "" && value !== null && value !== undefined) {
        cleaned[key] = value;
      }
    }
    config.params = cleaned;
  }

  return config;
});

// ============================================
// Response interceptor — token refresh on 401
// ============================================

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
  (response) => {
    // Unwrap API TransformInterceptor envelope { success, data, timestamp }
    const d = response.data;
    if (
      d &&
      typeof d === "object" &&
      !Array.isArray(d) &&
      "success" in d &&
      "data" in d
    ) {
      response.data = d.data;
    }
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh on 401 responses, and never retry a request
    // that already failed after a refresh attempt.
    // Skip auth endpoints — login/register 401s mean invalid credentials,
    // not an expired token.
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/")
    ) {
      return Promise.reject(error);
    }

    // If a refresh is already in progress, queue this request and wait
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
      // Refresh token is in httpOnly cookie — sent automatically
      // via withCredentials. Body can be empty.
      const response = await axios.post(
        `${API_URL}/api/v1/auth/refresh`,
        {},
        { withCredentials: true },
      );

      const { accessToken: newAccessToken } = response.data;

      setTokens(newAccessToken);
      processQueue(null, newAccessToken);

      // Retry the original request with the new token
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearTokens();
      useUserStore.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// ============================================
// Types
// ============================================

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
}

export interface Machine {
  id: string;
  machineNumber: string;
  name: string;
  status: string;
  type?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  stockLevel?: number;
  model?: string;
  distance?: number;
  location?: {
    address?: string;
  };
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category: string;
  isAvailable: boolean;
  stock?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  machineId?: string;
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface LoyaltyInfo {
  points: number;
  tier: {
    id: string;
    name: string;
    level: number;
    minPoints: number;
    maxPoints: number;
    cashbackPercent: number;
    bonusMultiplier: number;
    color: string;
  };
  history: LoyaltyTransaction[];
}

export interface LoyaltyTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: string;
  reward: number;
  progress: number;
  target: number;
  status: string;
  expiresAt?: string;
}

export interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  totalEarned: number;
}

export interface Transaction {
  id: string;
  orderNumber: string;
  amount: number;
  type: string;
  status: string;
  machineName?: string;
  items?: { name: string; quantity: number; price: number }[];
  createdAt: string;
}

// ============================================
// API Methods
// ============================================

// Public API
export const machinesApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<Machine[]>("/machines", { params }),
  getById: (id: string) => api.get<Machine>(`/machines/${id}`),
  getNearby: (lat: number, lng: number, radius?: number) =>
    api.get<Machine[]>("/machines", { params: { lat, lng, radius } }),
};

export const productsApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<Product[]>("/products", { params }),
  getByMachine: (machineId: string) =>
    api.get<Product[]>(`/machines/${machineId}/products`),
};

export const locationsApi = {
  getAll: () => api.get("/locations"),
  getNearby: (lat: number, lng: number, radius?: number) =>
    api.get("/locations/nearby", { params: { lat, lng, radius } }),
};

// Auth-required API
export const ordersApi = {
  create: (data: {
    machineId: string;
    items: { productId: string; quantity: number }[];
    paymentMethod?: string;
    usePoints?: number;
  }) => api.post<Order>("/orders", data),
  getMy: (params?: Record<string, unknown>) =>
    api.get<Order[]>("/orders/my", { params }),
  getById: (id: string) => api.get<Order>(`/orders/${id}`),
};

export const loyaltyApi = {
  getMe: () => api.get<LoyaltyInfo>("/loyalty/me"),
  getRewards: () => api.get("/loyalty/rewards"),
  getHistory: (params?: Record<string, unknown>) =>
    api.get<LoyaltyTransaction[]>("/loyalty/history", { params }),
  redeemReward: (rewardId: string) => api.post("/loyalty/redeem", { rewardId }),
};

export const favoritesApi = {
  getMachines: () => api.get<Machine[]>("/favorites/machines"),
  getProducts: () => api.get<Product[]>("/favorites/products"),
  addMachine: (machineId: string) =>
    api.post(`/favorites/machines/${machineId}`),
  removeMachine: (machineId: string) =>
    api.delete(`/favorites/machines/${machineId}`),
  addProduct: (productId: string) =>
    api.post(`/favorites/products/${productId}`),
  removeProduct: (productId: string) =>
    api.delete(`/favorites/products/${productId}`),
};

export const transactionsApi = {
  getMy: (params?: Record<string, unknown>) =>
    api.get<Transaction[]>("/transactions/my", { params }),
  getById: (id: string) => api.get<Transaction>(`/transactions/${id}`),
  requestRefund: (id: string, reason: string) =>
    api.post(`/transactions/${id}/refund`, { reason }),
};

export const questsApi = {
  getAll: () => api.get<Quest[]>("/quests"),
  getStreak: () => api.get("/quests/streak"),
  claim: (questId: string) => api.post(`/quests/${questId}/claim`),
};

export const referralsApi = {
  getStats: () => api.get<ReferralStats>("/referrals/stats"),
  getHistory: (params?: Record<string, unknown>) =>
    api.get("/referrals/history", { params }),
};

export const complaintsApi = {
  submit: (data: {
    machineId?: string;
    qrCode?: string;
    category: string;
    subject: string;
    description: string;
    customerPhone?: string;
    customerEmail?: string;
    attachments?: string[];
  }) => api.post("/complaints/public", data),
};

export const authApi = {
  loginTelegram: (initData: string) =>
    api.post<{
      accessToken: string;
      refreshToken: string;
      user: Record<string, unknown>;
    }>("/auth/telegram", { initData }),
};

// Achievements
export interface Achievement {
  id: string;
  title: string;
  titleUz: string;
  description: string;
  descriptionUz: string;
  icon: string;
  category: string;
  conditionType: string;
  conditionValue: number;
  pointsReward: number;
  rarity: string;
  isActive: boolean;
}

export interface UserAchievement {
  id: string;
  achievementId: string;
  achievement: Achievement;
  progress: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
  isClaimed: boolean;
  claimedAt: string | null;
}

export const achievementsApi = {
  getMy: () =>
    api.get<{
      total: number;
      unlocked: number;
      claimed: number;
      achievements: UserAchievement[];
    }>("/achievements/my"),
  getMyAll: () => api.get<UserAchievement[]>("/achievements/my/all"),
  claim: (userAchievementId: string) =>
    api.post(`/achievements/my/${userAchievementId}/claim`),
  claimAll: () => api.post("/achievements/my/claim-all"),
};

// Promo codes
export const promoCodesApi = {
  validate: (code: string) =>
    api.post<{
      valid: boolean;
      type: string;
      value: number;
      description: string;
    }>("/promo-codes/validate", { code }),
  redeem: (code: string, orderId?: string) =>
    api.post("/promo-codes/redeem", { code, orderId }),
};

// Leaderboard
export const leaderboardApi = {
  get: (params?: Record<string, unknown>) =>
    api.get("/loyalty/leaderboard", { params }),
};

// Recipes
export const recipesApi = {
  getByProduct: (productId: string) =>
    api.get(`/products/${productId}/recipes`),
};

// Notifications settings
export const notificationsApi = {
  getSettings: () => api.get("/notifications/settings"),
  updateSettings: (data: Record<string, boolean>) =>
    api.patch("/notifications/settings", data),
  subscribePush: (data: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }) => api.post("/notifications/push/subscribe", data),
  unsubscribePush: () => api.delete("/notifications/push/unsubscribe"),
};
