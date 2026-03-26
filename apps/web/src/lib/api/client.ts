import axios from "axios";

/** Query parameters for GET requests (filters, pagination, sorting) */
export type QueryParams = Record<
  string,
  string | number | boolean | string[] | null | undefined
>;

/** Request body for POST/PUT/PATCH requests — accepts any object, rejects primitives */
export type RequestBody = object;

// Direct API URL (used for SSR / server-side calls if needed)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Use Next.js rewrite proxy in browser → avoids CORS & cookie issues.
// In SSR (no window), use direct API URL.
const baseURL = typeof window !== "undefined" ? "/api/v1" : `${API_URL}/api/v1`;

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================
// Token helpers — in-memory ONLY (no localStorage).
// httpOnly cookies handle persistence across page refreshes.
// In-memory token is used only for Socket.IO auth and direct-fetch callers
// that bypass the proxy (e.g., /docs-json).
// ============================================

let _accessToken: string | null = null;

function setTokens(accessToken: string, _refreshToken?: string) {
  _accessToken = accessToken;
}

function clearTokens() {
  _accessToken = null;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export { setTokens, clearTokens };

// Request interceptor — strip empty params (auth handled by httpOnly cookies).
api.interceptors.request.use((config) => {
  // Strip empty-string, null, and undefined query params.
  // Frontend selects/filters often send status="" which fails enum validation on the API.
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

// Response interceptor - handle token refresh with mutex/queue pattern
// Prevents race condition when multiple requests get 401 simultaneously
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
    // Unwrap the API's TransformInterceptor envelope { success, data, timestamp }.
    // After unwrap response.data holds the controller's actual return value, so
    // page-level code like `.then(r => r.data.data)` correctly reaches the inner
    // array of paginated responses { data: [...], total, page, limit }.
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
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh for non-401, SSR, already-retried, or auth endpoint requests.
    // Auth endpoints (login, register, etc.) return 401 for invalid credentials —
    // triggering a token refresh there would be wrong and cause redirect loops.
    if (
      typeof window === "undefined" ||
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/")
    ) {
      return Promise.reject(error);
    }

    // Queue concurrent 401s while a refresh is already in progress
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: () => resolve(api(originalRequest)),
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Refresh token is in httpOnly cookie — sent automatically via withCredentials.
      // Use proxy path (same-origin) to avoid CORS.
      const response = await axios.post(
        "/api/v1/auth/refresh",
        {},
        { withCredentials: true },
      );

      // Unwrap TransformInterceptor envelope: { success, data: { accessToken, ... }, timestamp }
      const payload = response.data?.data ?? response.data;
      // Store in memory for Socket.IO and non-proxy callers
      if (payload?.accessToken) {
        setTokens(payload.accessToken, payload.refreshToken);
      }

      // Resolve all queued requests — cookies carry the new token automatically
      processQueue(null, payload?.accessToken || "");

      // Retry the original request (cookie handles auth)
      return api(originalRequest);
    } catch (refreshError: unknown) {
      // Refresh failed — reject all queued requests and logout
      processQueue(refreshError, null);
      clearTokens();
      window.location.href = "/auth";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
