import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Token helpers — keep localStorage and cookie in sync for middleware
function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  // Sync to cookie so server-side middleware can read it
  document.cookie = `accessToken=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  document.cookie = "accessToken=; path=/; max-age=0";
}

export { setTokens, clearTokens };

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh for non-401, SSR, or already-retried requests
    if (
      typeof window === "undefined" ||
      error.response?.status !== 401 ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    // Queue concurrent 401s while a refresh is already in progress
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
      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        // No refresh token available — reject all queued requests and logout
        processQueue(error, null);
        clearTokens();
        window.location.href = "/auth";
        return Promise.reject(error);
      }

      const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
        refreshToken,
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data;
      setTokens(accessToken, newRefreshToken);

      // Resolve all queued requests with the new token
      processQueue(null, accessToken);

      // Retry the original request with the new token
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
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

// API methods
export const authApi = {
  login: (email: string, password: string, twoFactorCode?: string) =>
    api.post("/auth/login", { email, password, twoFactorCode }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: (data: any) => api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
  enable2FA: () => api.post("/auth/2fa/enable"),
  verify2FA: (code: string) => api.post("/auth/2fa/verify", { code }),
  forgotPassword: (email: string) =>
    api.post("/auth/password/forgot", { email }),
  resetPassword: (token: string, password: string) =>
    api.post("/auth/password/reset", { token, password }),
  getPasswordRequirements: () => api.get("/auth/password/requirements"),
};

export const machinesApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/machines", { params }),
  getById: (id: string) => api.get(`/machines/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/machines", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.patch(`/machines/${id}`, data),
  delete: (id: string) => api.delete(`/machines/${id}`),
  getStats: () => api.get("/machines/stats"),
  getMap: () => api.get("/machines/map"),
  getSlots: (id: string) => api.get(`/machines/${id}/slots`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createSlot: (id: string, data: any) =>
    api.post(`/machines/${id}/slots`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateSlot: (id: string, slotId: string, data: any) =>
    api.patch(`/machines/${id}/slots/${slotId}`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  refillSlot: (id: string, slotId: string, data: any) =>
    api.post(`/machines/${id}/slots/${slotId}/refill`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  moveToLocation: (id: string, data: any) =>
    api.post(`/machines/${id}/move`, data),
  getLocationHistory: (id: string) =>
    api.get(`/machines/${id}/location-history`),
  getComponents: (id: string) => api.get(`/machines/${id}/components`),
  getErrors: (id: string) => api.get(`/machines/${id}/errors`),
};

export const productsApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/products", { params }),
  getById: (id: string) => api.get(`/products/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/products", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.patch(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  getRecipes: (productId: string) => api.get(`/products/${productId}/recipes`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createRecipe: (productId: string, data: any) =>
    api.post(`/products/${productId}/recipes`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateRecipe: (productId: string, recipeId: string, data: any) =>
    api.patch(`/products/${productId}/recipes/${recipeId}`, data),
  deleteRecipe: (productId: string, recipeId: string) =>
    api.delete(`/products/${productId}/recipes/${recipeId}`),
  getBatches: (productId: string) => api.get(`/products/${productId}/batches`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createBatch: (productId: string, data: any) =>
    api.post(`/products/${productId}/batches`, data),
  getPriceHistory: (productId: string) =>
    api.get(`/products/${productId}/price-history`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updatePrice: (productId: string, data: any) =>
    api.post(`/products/${productId}/update-price`, data),
};

export const inventoryApi = {
  getWarehouse: () => api.get("/inventory/warehouse"),
  getOperator: (operatorId?: string) =>
    api.get("/inventory/operator", { params: { operatorId } }),
  getMachine: (machineId: string) =>
    api.get("/inventory/machine", { params: { machineId } }),
  getLowStock: () => api.get("/inventory/low-stock"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transfer: (data: any) => api.post("/inventory/transfer", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMovements: (params?: any) => api.get("/inventory/movements", { params }),
};

export const tasksApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/tasks", { params }),
  getMy: () => api.get("/tasks/my"),
  getById: (id: string) => api.get(`/tasks/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/tasks", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.patch(`/tasks/${id}`, data),
  start: (id: string) => api.post(`/tasks/${id}/start`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uploadPhotoBefore: (id: string, data: any) =>
    api.post(`/tasks/${id}/photo-before`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uploadPhotoAfter: (id: string, data: any) =>
    api.post(`/tasks/${id}/photo-after`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  complete: (id: string, data: any) => api.post(`/tasks/${id}/complete`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  getKanban: () => api.get("/tasks/kanban"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assign: (id: string, data: any) => api.post(`/tasks/${id}/assign`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postpone: (id: string, data: any) => api.post(`/tasks/${id}/postpone`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reject: (id: string, data: any) => api.post(`/tasks/${id}/reject`, data),
  cancel: (id: string) => api.post(`/tasks/${id}/cancel`),
  getItems: (id: string) => api.get(`/tasks/${id}/items`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addItem: (id: string, data: any) => api.post(`/tasks/${id}/items`, data),
  getComments: (id: string) => api.get(`/tasks/${id}/comments`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addComment: (id: string, data: any) =>
    api.post(`/tasks/${id}/comments`, data),
  getPhotos: (id: string) => api.get(`/tasks/${id}/photos`),
};

export const usersApi = {
  getAll: () => api.get("/users"),
  getById: (id: string) => api.get(`/users/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/users", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const locationsApi = {
  getAll: () => api.get("/locations"),
  getById: (id: string) => api.get(`/locations/${id}`),
  getNearby: (lat: number, lng: number, radius?: number) =>
    api.get("/locations/nearby", { params: { lat, lng, radius } }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/locations", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.patch(`/locations/${id}`, data),
  delete: (id: string) => api.delete(`/locations/${id}`),
};

export const integrationsApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get("/integrations", { params }),
  getById: (id: string) => api.get(`/integrations/${id}`),
  getTemplates: () => api.get("/integrations/templates/all"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/integrations", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.put(`/integrations/${id}`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateConfig: (id: string, config: any) =>
    api.patch(`/integrations/${id}/config`, config),
  updateStatus: (id: string, status: string) =>
    api.patch(`/integrations/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/integrations/${id}`),
  test: (id: string) => api.post(`/integrations/${id}/test`),
};

export const reportsApi = {
  getDashboard: () => api.get("/reports/dashboard"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSales: (params?: any) => api.get("/reports/sales", { params }),
  getInventory: () => api.get("/reports/inventory"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTasks: (params?: any) => api.get("/reports/tasks", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getFinancial: (params?: any) => api.get("/reports/financial", { params }),
};

export const equipmentApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/equipment", { params }),
  getById: (id: string) => api.get(`/equipment/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/equipment", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.put(`/equipment/${id}`, data),
  delete: (id: string) => api.delete(`/equipment/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addMaintenance: (data: any) => api.post("/equipment/maintenance", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMaintenanceHistory: (params?: any) =>
    api.get("/equipment/maintenance/history", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addMovement: (data: any) => api.post("/equipment/movements", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMovements: (params?: any) =>
    api.get("/equipment/movements/history", { params }),
};

export const hopperTypesApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/hopper-types", { params }),
  getById: (id: string) => api.get(`/hopper-types/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/hopper-types", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.put(`/hopper-types/${id}`, data),
  delete: (id: string) => api.delete(`/hopper-types/${id}`),
};

export const sparePartsApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/spare-parts", { params }),
  getById: (id: string) => api.get(`/spare-parts/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/spare-parts", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.put(`/spare-parts/${id}`, data),
  delete: (id: string) => api.delete(`/spare-parts/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adjustQuantity: (id: string, data: any) =>
    api.patch(`/spare-parts/${id}/quantity`, data),
};

export const washingSchedulesApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/washing-schedules", { params }),
  getById: (id: string) => api.get(`/washing-schedules/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/washing-schedules", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.put(`/washing-schedules/${id}`, data),
  delete: (id: string) => api.delete(`/washing-schedules/${id}`),
  complete: (id: string) => api.post(`/washing-schedules/${id}/complete`),
};

export const warehouseApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/warehouses", { params }),
  getById: (id: string) => api.get(`/warehouses/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/warehouses", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.patch(`/warehouses/${id}`, data),
  delete: (id: string) => api.delete(`/warehouses/${id}`),
  getStock: (id: string) => api.get(`/warehouses/${id}/stock`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMovements: (id: string, params?: any) =>
    api.get(`/warehouses/${id}/movements`, { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createMovement: (id: string, data: any) =>
    api.post(`/warehouses/${id}/movements`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transfer: (id: string, data: any) =>
    api.post(`/warehouses/${id}/transfer`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getBatches: (id: string, params?: any) =>
    api.get(`/warehouses/${id}/batches`, { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createBatch: (id: string, data: any) =>
    api.post(`/warehouses/${id}/batches`, data),
};

export const tripsApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/trips", { params }),
  getById: (id: string) => api.get(`/trips/${id}`),
  getActive: () => api.get("/trips/active"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  start: (data: any) => api.post("/trips/start", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  end: (id: string, data?: any) => api.post(`/trips/${id}/end`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cancel: (id: string, data?: any) => api.post(`/trips/${id}/cancel`, data),
  getRoute: (id: string) => api.get(`/trips/${id}/route`),
  getStops: (id: string) => api.get(`/trips/${id}/stops`),
  getAnomalies: (id: string) => api.get(`/trips/${id}/anomalies`),
  getTasks: (id: string) => api.get(`/trips/${id}/tasks`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  linkTask: (id: string, data: any) => api.post(`/trips/${id}/tasks`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  completeTask: (tripId: string, taskId: string, data?: any) =>
    api.post(`/trips/${tripId}/tasks/${taskId}/complete`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getUnresolvedAnomalies: (params?: any) =>
    api.get("/trips/anomalies/unresolved", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolveAnomaly: (id: string, data: any) =>
    api.post(`/trips/anomalies/${id}/resolve`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getEmployeeAnalytics: (params?: any) =>
    api.get("/trips/analytics/employee", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMachineAnalytics: (params?: any) =>
    api.get("/trips/analytics/machines", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSummaryAnalytics: (params?: any) =>
    api.get("/trips/analytics/summary", { params }),
};

export const routesApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/routes", { params }),
  getById: (id: string) => api.get(`/routes/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/routes", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.patch(`/routes/${id}`, data),
  delete: (id: string) => api.delete(`/routes/${id}`),
  start: (id: string) => api.post(`/routes/${id}/start`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  complete: (id: string, data?: any) =>
    api.post(`/routes/${id}/complete`, data),
  optimize: (id: string) => api.post(`/routes/${id}/optimize`),
  getStops: (id: string) => api.get(`/routes/${id}/stops`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addStop: (id: string, data: any) => api.post(`/routes/${id}/stops`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateStop: (id: string, stopId: string, data: any) =>
    api.patch(`/routes/${id}/stops/${stopId}`, data),
  removeStop: (id: string, stopId: string) =>
    api.delete(`/routes/${id}/stops/${stopId}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reorderStops: (id: string, data: any) =>
    api.post(`/routes/${id}/stops/reorder`, data),
};

export const incidentsApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/incidents", { params }),
  getById: (id: string) => api.get(`/incidents/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/incidents", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.patch(`/incidents/${id}`, data),
  delete: (id: string) => api.delete(`/incidents/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assign: (id: string, data: any) => api.post(`/incidents/${id}/assign`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve: (id: string, data: any) =>
    api.post(`/incidents/${id}/resolve`, data),
  close: (id: string) => api.post(`/incidents/${id}/close`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getStatistics: (params?: any) => api.get("/incidents/statistics", { params }),
  getByMachine: (machineId: string) =>
    api.get(`/incidents/machine/${machineId}`),
};

export const alertsApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRules: (params?: any) => api.get("/alerts/rules", { params }),
  getRuleById: (id: string) => api.get(`/alerts/rules/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createRule: (data: any) => api.post("/alerts/rules", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateRule: (id: string, data: any) => api.put(`/alerts/rules/${id}`, data),
  deleteRule: (id: string) => api.delete(`/alerts/rules/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getHistory: (params?: any) => api.get("/alerts/history", { params }),
  getActive: () => api.get("/alerts/active"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  acknowledge: (id: string, data?: any) =>
    api.post(`/alerts/${id}/acknowledge`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve: (id: string, data?: any) => api.post(`/alerts/${id}/resolve`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dismiss: (id: string, data?: any) => api.post(`/alerts/${id}/dismiss`, data),
};

export const machineAccessApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/machine-access", { params }),
  getById: (id: string) => api.get(`/machine-access/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  grant: (data: any) => api.post("/machine-access", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  revoke: (data: any) => api.post("/machine-access/revoke", data),
  delete: (id: string) => api.delete(`/machine-access/${id}`),
  getByMachine: (machineId: string) =>
    api.get(`/machine-access/machine/${machineId}`),
  getByUser: (userId: string) => api.get(`/machine-access/user/${userId}`),
  getTemplates: () => api.get("/machine-access/templates/list"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createTemplate: (data: any) => api.post("/machine-access/templates", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyTemplate: (data: any) =>
    api.post("/machine-access/templates/apply", data),
};

export const operatorRatingsApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/operator-ratings", { params }),
  getById: (id: string) => api.get(`/operator-ratings/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  calculate: (data: any) => api.post("/operator-ratings/calculate", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recalculate: (id: string, data: any) =>
    api.post(`/operator-ratings/recalculate/${id}`, data),
  delete: (id: string) => api.delete(`/operator-ratings/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getLeaderboard: (params: any) =>
    api.get("/operator-ratings/leaderboard", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSummary: (params: any) => api.get("/operator-ratings/summary", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getOperatorHistory: (userId: string, params?: any) =>
    api.get(`/operator-ratings/operator/${userId}`, { params }),
};

// === Phase 3: Transactions & Finance ===

export const transactionsApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/transactions", { params }),
  getById: (id: string) => api.get(`/transactions/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCollections: (params?: any) =>
    api.get("/transactions/collections", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createCollection: (data: any) => api.post("/transactions/collections", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verifyCollection: (id: string, data: any) =>
    api.patch(`/transactions/collections/${id}/verify`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDailySummaries: (params?: any) =>
    api.get("/transactions/daily-summaries", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rebuildDailySummary: (data: any) =>
    api.post("/transactions/daily-summaries/rebuild", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCommissions: (params?: any) =>
    api.get("/transactions/commissions", { params }),
};

export const reconciliationApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRuns: (params?: any) => api.get("/reconciliation/runs", { params }),
  getRunById: (id: string) => api.get(`/reconciliation/runs/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createRun: (data: any) => api.post("/reconciliation/runs", data),
  deleteRun: (id: string) => api.delete(`/reconciliation/runs/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMismatches: (runId: string, params?: any) =>
    api.get(`/reconciliation/runs/${runId}/mismatches`, { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolveMismatch: (id: string, data: any) =>
    api.patch(`/reconciliation/mismatches/${id}/resolve`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  importHwSales: (data: any) => api.post("/reconciliation/import", data),
};

export const billingApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getInvoices: (params?: any) => api.get("/billing/invoices", { params }),
  getInvoiceById: (id: string) => api.get(`/billing/invoices/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createInvoice: (data: any) => api.post("/billing/invoices", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateInvoice: (id: string, data: any) =>
    api.patch(`/billing/invoices/${id}`, data),
  sendInvoice: (id: string) => api.post(`/billing/invoices/${id}/send`),
  cancelInvoice: (id: string) => api.post(`/billing/invoices/${id}/cancel`),
  deleteInvoice: (id: string) => api.delete(`/billing/invoices/${id}`),
  getInvoiceStats: () => api.get("/billing/invoices/stats"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recordPayment: (invoiceId: string, data: any) =>
    api.post(`/billing/invoices/${invoiceId}/payments`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPayments: (params?: any) => api.get("/billing/payments", { params }),
};

export const openingBalancesApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/opening-balances", { params }),
  getById: (id: string) => api.get(`/opening-balances/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/opening-balances", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bulkCreate: (data: any) => api.post("/opening-balances/bulk", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.patch(`/opening-balances/${id}`, data),
  apply: (id: string) => api.post(`/opening-balances/${id}/apply`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyAll: (data: any) => api.post("/opening-balances/apply-all", data),
  delete: (id: string) => api.delete(`/opening-balances/${id}`),
  getStats: () => api.get("/opening-balances/stats"),
};

export const purchaseHistoryApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/purchase-history", { params }),
  getById: (id: string) => api.get(`/purchase-history/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/purchase-history", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bulkCreate: (data: any) => api.post("/purchase-history/bulk", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.patch(`/purchase-history/${id}`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  receive: (id: string, data?: any) =>
    api.post(`/purchase-history/${id}/receive`, data),
  cancel: (id: string) => api.post(`/purchase-history/${id}/cancel`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  returnPurchase: (id: string, data: any) =>
    api.post(`/purchase-history/${id}/return`, data),
  delete: (id: string) => api.delete(`/purchase-history/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getStats: (params?: any) => api.get("/purchase-history/stats", { params }),
};

export const salesImportApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/sales-import", { params }),
  getById: (id: string) => api.get(`/sales-import/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/sales-import", data),
  delete: (id: string) => api.delete(`/sales-import/${id}`),
  getStats: () => api.get("/sales-import/stats"),
};

export const auditApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getLogs: (params?: any) => api.get("/audit/logs", { params }),
  getLogById: (id: string) => api.get(`/audit/logs/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createLog: (data: any) => api.post("/audit/logs", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getEntityHistory: (entityType: string, entityId: string, params?: any) =>
    api.get(`/audit/history/${entityType}/${entityId}`, { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getStatistics: (params: any) => api.get("/audit/statistics", { params }),
  getSnapshots: (entityType: string, entityId: string) =>
    api.get(`/audit/snapshots/${entityType}/${entityId}`),
  getSnapshotById: (id: string) => api.get(`/audit/snapshots/detail/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createSnapshot: (data: any) => api.post("/audit/snapshots", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getUserSessions: (userId: string, params?: any) =>
    api.get(`/audit/sessions/user/${userId}`, { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  endSession: (sessionId: string, data?: any) =>
    api.post(`/audit/sessions/${sessionId}/end`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  terminateAllSessions: (userId: string, data?: any) =>
    api.post(`/audit/sessions/user/${userId}/terminate-all`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  markSuspicious: (sessionId: string, data: any) =>
    api.post(`/audit/sessions/${sessionId}/suspicious`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getReports: (params: any) => api.get("/audit/reports", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateReport: (data: any) => api.post("/audit/reports/generate", data),
  cleanupLogs: () => api.post("/audit/cleanup/logs"),
  cleanupSnapshots: () => api.post("/audit/cleanup/snapshots"),
};

export const analyticsApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSnapshots: (params?: any) => api.get("/analytics/snapshots", { params }),
  getSnapshotById: (id: string) => api.get(`/analytics/snapshots/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rebuildSnapshot: (data: any) =>
    api.post("/analytics/snapshots/rebuild", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDailyStats: (params?: any) =>
    api.get("/analytics/daily-stats", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rebuildDailyStats: (data: any) =>
    api.post("/analytics/daily-stats/rebuild", data),
  getDashboard: () => api.get("/analytics/dashboard"),
};

export const contractsApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/contractors/contracts", { params }),
  getById: (id: string) => api.get(`/contractors/contracts/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/contractors/contracts", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) =>
    api.patch(`/contractors/contracts/${id}`, data),
  activate: (id: string) => api.post(`/contractors/contracts/${id}/activate`),
  suspend: (id: string) => api.post(`/contractors/contracts/${id}/suspend`),
  terminate: (id: string) => api.post(`/contractors/contracts/${id}/terminate`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  calculateCommission: (id: string, data: any) =>
    api.post(`/contractors/contracts/${id}/commissions/calculate`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCommissions: (id: string, params?: any) =>
    api.get(`/contractors/contracts/${id}/commissions`, { params }),
  markCommissionPaid: (commissionId: string) =>
    api.post(`/contractors/contracts/commissions/${commissionId}/paid`),
};

// === Phase 4: Payments ===

export const paymentsApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTransactions: (params?: any) =>
    api.get("/payments/transactions", { params }),
  getTransaction: (id: string) => api.get(`/payments/transactions/${id}`),
  getTransactionStats: () => api.get("/payments/transactions/stats"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initiateRefund: (data: any) => api.post("/payments/refund", data),
};

// === Phase 4: Import ===

export const importApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSessions: (params?: any) => api.get("/import/sessions", { params }),
  getSession: (id: string) => api.get(`/import/sessions/${id}`),
  createSession: (data: FormData) =>
    api.post("/import/sessions", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  classifySession: (id: string) => api.post(`/import/sessions/${id}/classify`),
  validateSession: (id: string) => api.post(`/import/sessions/${id}/validate`),
  approveSession: (id: string) => api.post(`/import/sessions/${id}/approve`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rejectSession: (id: string, data: any) =>
    api.post(`/import/sessions/${id}/reject`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAuditLog: (id: string, params?: any) =>
    api.get(`/import/sessions/${id}/audit-log`, { params }),
  getSchemas: () => api.get("/import/schemas"),
  getValidationRules: () => api.get("/import/validation-rules"),
};

// === Phase 4: Promo Codes ===

export const promoCodesApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/promo-codes", { params }),
  getById: (id: string) => api.get(`/promo-codes/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/promo-codes", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.patch(`/promo-codes/${id}`, data),
  deactivate: (id: string) => api.post(`/promo-codes/${id}/deactivate`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRedemptions: (id: string, params?: any) =>
    api.get(`/promo-codes/${id}/redemptions`, { params }),
  getStats: (id: string) => api.get(`/promo-codes/${id}/stats`),
};

// === Phase 4: Loyalty & Gamification ===

export const loyaltyApi = {
  // Admin endpoints
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getStats: (params?: any) => api.get("/loyalty/admin/stats", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adjustPoints: (data: any) => api.post("/loyalty/admin/adjust", data),
  getExpiringPoints: (days?: number) =>
    api.get("/loyalty/admin/expiring", { params: { days } }),
  // User-facing (admin viewing)
  getBalance: () => api.get("/loyalty/balance"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getHistory: (params?: any) => api.get("/loyalty/history", { params }),
  getLevels: () => api.get("/loyalty/levels"),
  getLevelsInfo: () => api.get("/loyalty/levels/info"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getLeaderboard: (params?: any) => api.get("/loyalty/leaderboard", { params }),
};

export const achievementsApi = {
  // Admin CRUD
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/achievements", { params }),
  getById: (id: string) => api.get(`/achievements/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/achievements", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.put(`/achievements/${id}`, data),
  delete: (id: string) => api.delete(`/achievements/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getStats: (params?: any) => api.get("/achievements/stats", { params }),
  seed: () => api.post("/achievements/seed"),
  // User-facing
  getMy: () => api.get("/achievements/my"),
  getMyAll: () => api.get("/achievements/my/all"),
  claim: (userAchievementId: string) =>
    api.post(`/achievements/my/${userAchievementId}/claim`),
  claimAll: () => api.post("/achievements/my/claim-all"),
};

export const questsApi = {
  // Admin CRUD
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/quests", { params }),
  getById: (id: string) => api.get(`/quests/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/quests", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.put(`/quests/${id}`, data),
  delete: (id: string) => api.delete(`/quests/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getStats: (params?: any) => api.get("/quests/stats", { params }),
  // User-facing
  getMy: () => api.get("/quests/my"),
  getMyQuest: (userQuestId: string) => api.get(`/quests/my/${userQuestId}`),
  claim: (userQuestId: string) => api.post(`/quests/my/${userQuestId}/claim`),
  claimAll: () => api.post("/quests/my/claim-all"),
};

// === Phase 4: Client B2C ===

export const clientApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getClients: (params?: any) => api.get("/client/admin/users", { params }),
  getClient: (id: string) => api.get(`/client/admin/users/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getOrders: (params?: any) => api.get("/client/admin/orders", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getWallets: (params?: any) => api.get("/client/admin/wallets", { params }),
};

// === Phase 4: HR ===

export const hrApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDepartments: (params?: any) =>
    api.get("/employees/departments", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createDepartment: (data: any) => api.post("/employees/departments", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateDepartment: (id: string, data: any) =>
    api.put(`/employees/departments/${id}`, data),
  deleteDepartment: (id: string) => api.delete(`/employees/departments/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPositions: (params?: any) => api.get("/employees/positions", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createPosition: (data: any) => api.post("/employees/positions", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updatePosition: (id: string, data: any) =>
    api.put(`/employees/positions/${id}`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAttendance: (params?: any) => api.get("/employees/attendance", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  checkIn: (data: any) => api.post("/employees/attendance/check-in", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  checkOut: (data: any) => api.post("/employees/attendance/check-out", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDailyReport: (params?: any) =>
    api.get("/employees/attendance/daily-report", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getLeaveRequests: (params?: any) => api.get("/employees/leave", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createLeaveRequest: (data: any) => api.post("/employees/leave", data),
  approveLeave: (id: string) => api.post(`/employees/leave/${id}/approve`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rejectLeave: (id: string, data: any) =>
    api.post(`/employees/leave/${id}/reject`, data),
  getLeaveBalance: (employeeId: string) =>
    api.get(`/employees/leave/balance/${employeeId}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPayrolls: (params?: any) => api.get("/employees/payroll", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  calculatePayroll: (data: any) =>
    api.post("/employees/payroll/calculate", data),
  approvePayroll: (id: string) => api.post(`/employees/payroll/${id}/approve`),
  payPayroll: (id: string) => api.post(`/employees/payroll/${id}/pay`),
  getPayroll: (id: string) => api.get(`/employees/payroll/${id}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getReviews: (params?: any) => api.get("/employees/reviews", { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createReview: (data: any) => api.post("/employees/reviews", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submitReview: (id: string, data: any) =>
    api.post(`/employees/reviews/${id}/submit`, data),
  getReview: (id: string) => api.get(`/employees/reviews/${id}`),
};

// === Phase 4: Notifications ===

export const notificationsApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/notifications", { params }),
  getById: (id: string) => api.get(`/notifications/${id}`),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post("/notifications/read-all"),
  getUnreadCount: () => api.get("/notifications/unread-count"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribePush: (data: any) => api.post("/notifications/push/subscribe", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unsubscribePush: (data: any) =>
    api.delete("/notifications/push/unsubscribe", { data }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerFcm: (data: any) => api.post("/notifications/fcm/register", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unregisterFcm: (data: any) =>
    api.delete("/notifications/fcm/unregister", { data }),
};

// === Master Data (Directories / Справочники) ===

// === Phase 4: Fiscal (MultiKassa) ===

export const fiscalApi = {
  getDevices: (): Promise<import("@/types/fiscal.types").FiscalDevice[]> =>
    api.get("/fiscal/devices").then((r) => r.data),
  getDevice: (
    deviceId: string,
  ): Promise<import("@/types/fiscal.types").FiscalDevice> =>
    api.get(`/fiscal/devices/${deviceId}`).then((r) => r.data),
  createDevice: (
    data: import("@/types/fiscal.types").CreateFiscalDeviceRequest,
  ): Promise<import("@/types/fiscal.types").FiscalDevice> =>
    api.post("/fiscal/devices", data).then((r) => r.data),
  updateDevice: (
    deviceId: string,
    data: import("@/types/fiscal.types").UpdateFiscalDeviceRequest,
  ): Promise<import("@/types/fiscal.types").FiscalDevice> =>
    api.put(`/fiscal/devices/${deviceId}`, data).then((r) => r.data),
  activateDevice: (
    deviceId: string,
  ): Promise<import("@/types/fiscal.types").FiscalDevice> =>
    api.post(`/fiscal/devices/${deviceId}/activate`).then((r) => r.data),
  deactivateDevice: (
    deviceId: string,
  ): Promise<import("@/types/fiscal.types").FiscalDevice> =>
    api.post(`/fiscal/devices/${deviceId}/deactivate`).then((r) => r.data),
  getDeviceStatistics: (
    deviceId: string,
  ): Promise<import("@/types/fiscal.types").DeviceStatistics> =>
    api.get(`/fiscal/devices/${deviceId}/stats`).then((r) => r.data),
  openShift: (
    deviceId: string,
    data: import("@/types/fiscal.types").OpenShiftRequest,
  ): Promise<import("@/types/fiscal.types").OpenShiftResponse> =>
    api
      .post(`/fiscal/devices/${deviceId}/shift/open`, data)
      .then((r) => r.data),
  closeShift: (
    deviceId: string,
  ): Promise<import("@/types/fiscal.types").CloseShiftResponse> =>
    api.post(`/fiscal/devices/${deviceId}/shift/close`).then((r) => r.data),
  getCurrentShift: (
    deviceId: string,
  ): Promise<import("@/types/fiscal.types").FiscalShift | null> =>
    api.get(`/fiscal/devices/${deviceId}/shift/current`).then((r) => r.data),
  getShiftHistory: (
    deviceId: string,
    limit = 30,
  ): Promise<import("@/types/fiscal.types").FiscalShift[]> =>
    api
      .get(`/fiscal/devices/${deviceId}/shift/history`, { params: { limit } })
      .then((r) => r.data),
  getXReport: (
    deviceId: string,
  ): Promise<import("@/types/fiscal.types").XReportResponse> =>
    api.get(`/fiscal/devices/${deviceId}/shift/x-report`).then((r) => r.data),
  createReceipt: (
    data: import("@/types/fiscal.types").CreateReceiptRequest,
  ): Promise<import("@/types/fiscal.types").FiscalReceipt> =>
    api.post("/fiscal/receipts", data).then((r) => r.data),
  getReceipt: (
    receiptId: string,
  ): Promise<import("@/types/fiscal.types").FiscalReceipt> =>
    api.get(`/fiscal/receipts/${receiptId}`).then((r) => r.data),
  getReceipts: (
    filters: import("@/types/fiscal.types").FiscalReceiptFilters,
  ): Promise<import("@/types/fiscal.types").FiscalReceiptsResponse> =>
    api.get("/fiscal/receipts", { params: filters }).then((r) => r.data),
  getQueueItems: (
    status?: import("@/types/fiscal.types").FiscalQueueStatus,
  ): Promise<import("@/types/fiscal.types").FiscalQueueItem[]> =>
    api
      .get("/fiscal/queue", { params: status ? { status } : undefined })
      .then((r) => r.data),
  retryQueueItem: (queueItemId: string): Promise<void> =>
    api.post(`/fiscal/queue/${queueItemId}/retry`).then(() => undefined),
};

export const directoriesApi = {
  // Directories CRUD
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAll: (params?: any) => api.get("/directories", { params }),
  getById: (id: string) => api.get(`/directories/${id}`),
  getBySlug: (slug: string) => api.get(`/directories/by-slug/${slug}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => api.post("/directories", data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (id: string, data: any) => api.patch(`/directories/${id}`, data),
  delete: (id: string) => api.delete(`/directories/${id}`),

  // Fields CRUD
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addField: (dirId: string, data: any) =>
    api.post(`/directories/${dirId}/fields`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateField: (dirId: string, fieldId: string, data: any) =>
    api.patch(`/directories/${dirId}/fields/${fieldId}`, data),
  removeField: (dirId: string, fieldId: string) =>
    api.delete(`/directories/${dirId}/fields/${fieldId}`),

  // Entries CRUD
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getEntries: (dirId: string, params?: any) =>
    api.get(`/directories/${dirId}/entries`, { params }),
  getEntry: (dirId: string, entryId: string) =>
    api.get(`/directories/${dirId}/entries/${entryId}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createEntry: (dirId: string, data: any) =>
    api.post(`/directories/${dirId}/entries`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateEntry: (dirId: string, entryId: string, data: any) =>
    api.patch(`/directories/${dirId}/entries/${entryId}`, data),
  deleteEntry: (dirId: string, entryId: string) =>
    api.delete(`/directories/${dirId}/entries/${entryId}`),
  searchEntries: (dirId: string, params: { q: string; limit?: number }) =>
    api.get(`/directories/${dirId}/entries/search`, { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inlineCreateEntry: (dirId: string, data: any) =>
    api.post(`/directories/${dirId}/entries/inline`, data),

  // Sources CRUD
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSources: (dirId: string, params?: any) =>
    api.get(`/directories/${dirId}/sources`, { params }),
  getSource: (dirId: string, sourceId: string) =>
    api.get(`/directories/${dirId}/sources/${sourceId}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createSource: (dirId: string, data: any) =>
    api.post(`/directories/${dirId}/sources`, data),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateSource: (dirId: string, sourceId: string, data: any) =>
    api.patch(`/directories/${dirId}/sources/${sourceId}`, data),
  deleteSource: (dirId: string, sourceId: string) =>
    api.delete(`/directories/${dirId}/sources/${sourceId}`),
  triggerSync: (dirId: string, sourceId: string) =>
    api.post(`/directories/${dirId}/sources/${sourceId}/sync`),

  // Sync Logs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSyncLogs: (dirId: string, params?: any) =>
    api.get(`/directories/${dirId}/sync-logs`, { params }),

  // Hierarchy
  getTree: (dirId: string) => api.get(`/directories/${dirId}/tree`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  moveEntry: (dirId: string, entryId: string, data: any) =>
    api.post(`/directories/${dirId}/entries/${entryId}/move`, data),

  // Audit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAuditLogs: (dirId: string, params?: any) =>
    api.get(`/directories/${dirId}/audit`, { params }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getEntryAudit: (dirId: string, entryId: string, params?: any) =>
    api.get(`/directories/${dirId}/entries/${entryId}/audit`, { params }),
};
