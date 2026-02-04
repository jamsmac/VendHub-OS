/**
 * API Service
 * Axios instance with interceptors
 */

import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // No response received
      console.error('Network Error:', error.request);
    } else {
      // Request setup error
      console.error('Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// API methods
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: {
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string;
    password: string;
  }) => api.post('/auth/register', data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};

export const tasksApi = {
  getAll: (params?: any) => api.get('/tasks', { params }),
  getMy: () => api.get('/tasks/my'),
  getById: (id: string) => api.get(`/tasks/${id}`),
  start: (id: string) => api.post(`/tasks/${id}/start`),
  uploadPhotoBefore: (id: string, formData: FormData) =>
    api.post(`/tasks/${id}/photo-before`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadPhotoAfter: (id: string, formData: FormData) =>
    api.post(`/tasks/${id}/photo-after`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  complete: (id: string, data: any) => api.post(`/tasks/${id}/complete`, data),
  updateItems: (id: string, items: any[]) =>
    api.patch(`/tasks/${id}/items`, { items }),
};

export const machinesApi = {
  getAll: (params?: any) => api.get('/machines', { params }),
  getMy: () => api.get('/machines/my'),
  getById: (id: string) => api.get(`/machines/${id}`),
  getInventory: (id: string) => api.get(`/machines/${id}/inventory`),
};

export const inventoryApi = {
  getOperator: () => api.get('/inventory/operator'),
  getMachine: (machineId: string) =>
    api.get('/inventory/machine', { params: { machineId } }),
  transfer: (data: any) => api.post('/inventory/transfer', data),
  createTransfer: (data: {
    fromMachineId: string;
    toMachineId: string;
    items: { productId: string; quantity: number }[];
    note?: string;
  }) => api.post('/inventory/transfer', data),
  getMovements: (params?: any) => api.get('/inventory/movements', { params }),
};

export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  registerPushToken: (token: string) =>
    api.post('/notifications/push-token', { token }),
};

export const reportsApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  getMyStats: () => api.get('/reports/my-stats'),
};
