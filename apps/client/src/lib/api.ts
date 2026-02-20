import axios, { AxiosError } from 'axios';
import { useUserStore } from './store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vendhub-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response error interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vendhub-token');
      useUserStore.getState().logout();
    }
    return Promise.reject(error);
  }
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
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  stockLevel?: number;
  model?: string;
  distance?: number;
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
  getAll: (params?: Record<string, any>) =>
    api.get<Machine[]>('/machines', { params }),
  getById: (id: string) =>
    api.get<Machine>(`/machines/${id}`),
  getNearby: (lat: number, lng: number, radius?: number) =>
    api.get<Machine[]>('/machines', { params: { lat, lng, radius } }),
};

export const productsApi = {
  getAll: (params?: Record<string, any>) =>
    api.get<Product[]>('/products', { params }),
  getByMachine: (machineId: string) =>
    api.get<Product[]>(`/machines/${machineId}/products`),
};

export const locationsApi = {
  getAll: () => api.get('/locations'),
  getNearby: (lat: number, lng: number, radius?: number) =>
    api.get('/locations/nearby', { params: { lat, lng, radius } }),
};

// Auth-required API
export const ordersApi = {
  create: (data: { machineId: string; items: { productId: string; quantity: number }[]; paymentMethod?: string; usePoints?: number }) =>
    api.post<Order>('/orders', data),
  getMy: (params?: Record<string, any>) =>
    api.get<Order[]>('/orders/my', { params }),
  getById: (id: string) =>
    api.get<Order>(`/orders/${id}`),
};

export const loyaltyApi = {
  getMe: () => api.get<LoyaltyInfo>('/loyalty/me'),
  getRewards: () => api.get('/loyalty/rewards'),
  getHistory: (params?: Record<string, any>) =>
    api.get<LoyaltyTransaction[]>('/loyalty/history', { params }),
  redeemReward: (rewardId: string) =>
    api.post('/loyalty/redeem', { rewardId }),
};

export const favoritesApi = {
  getMachines: () => api.get<Machine[]>('/favorites/machines'),
  getProducts: () => api.get<Product[]>('/favorites/products'),
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
  getMy: (params?: Record<string, any>) =>
    api.get<Transaction[]>('/transactions/my', { params }),
  getById: (id: string) =>
    api.get<Transaction>(`/transactions/${id}`),
  requestRefund: (id: string, reason: string) =>
    api.post(`/transactions/${id}/refund`, { reason }),
};

export const questsApi = {
  getAll: () => api.get<Quest[]>('/quests'),
  getStreak: () => api.get('/quests/streak'),
  claim: (questId: string) =>
    api.post(`/quests/${questId}/claim`),
};

export const referralsApi = {
  getStats: () => api.get<ReferralStats>('/referrals/stats'),
  getHistory: (params?: Record<string, any>) =>
    api.get('/referrals/history', { params }),
};

export const complaintsApi = {
  submit: (data: { machineId?: string; machineCode?: string; type: string; message: string; photoUrl?: string }) =>
    api.post('/complaints/public/submit', data),
};

export const authApi = {
  loginTelegram: (initData: string) =>
    api.post<{ accessToken: string; user: any }>('/auth/telegram', { initData }),
};
