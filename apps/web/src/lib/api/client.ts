/**
 * API Client for VendHub Web Application
 * Axios-based HTTP client with interceptors for auth and error handling
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';

// ============================================
// Types
// ============================================

interface ApiErrorResponse {
  message: string;
  error?: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================
// Configuration
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const TOKEN_KEY = 'vendhub_access_token';
const REFRESH_TOKEN_KEY = 'vendhub_refresh_token';

// ============================================
// Token Management
// ============================================

export const tokenManager = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens(accessToken: string, refreshToken?: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },
};

// ============================================
// Create Axios Instance
// ============================================

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
  });

  // Request interceptor - add auth token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = tokenManager.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors and token refresh
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError<ApiErrorResponse>) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // Handle 401 Unauthorized - attempt token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const refreshToken = tokenManager.getRefreshToken();
        if (refreshToken) {
          try {
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data;
            tokenManager.setTokens(accessToken, newRefreshToken);

            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }
            return client(originalRequest);
          } catch (refreshError) {
            // Refresh failed - clear tokens and redirect to login
            tokenManager.clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        } else {
          // No refresh token - redirect to login
          tokenManager.clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      }

      // Transform error to ApiError
      const apiError = new ApiError(
        error.response?.status || 500,
        error.response?.data?.message || error.message || 'Unknown error',
        error.response?.data?.details
      );

      return Promise.reject(apiError);
    }
  );

  return client;
};

// ============================================
// Singleton API Client
// ============================================

export const apiClient = createApiClient();

// ============================================
// Helper Functions
// ============================================

/**
 * Build query string from params object
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach((item) => searchParams.append(key, String(item)));
      } else if (value instanceof Date) {
        searchParams.append(key, value.toISOString());
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Download file from API
 */
export async function downloadFile(
  url: string,
  filename: string
): Promise<void> {
  const response = await apiClient.get(url, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data]);
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}

/**
 * Upload file to API
 */
export async function uploadFile(
  url: string,
  file: File,
  fieldName = 'file',
  additionalData?: Record<string, string>
): Promise<AxiosResponse> {
  const formData = new FormData();
  formData.append(fieldName, file);

  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  return apiClient.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

// ============================================
// Export Types
// ============================================

export type { ApiErrorResponse };
export default apiClient;
