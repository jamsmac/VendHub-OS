import axios from "axios";

/** Query parameters for GET requests (filters, pagination, sorting) */
type QueryParams = Record<
  string,
  string | number | boolean | string[] | null | undefined
>;

/** Request body for POST/PUT/PATCH requests — accepts any object, rejects primitives */
type RequestBody = object;

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

// API methods
export const authApi = {
  login: (email: string, password: string, totpCode?: string) =>
    api.post("/auth/login", { email, password, ...(totpCode && { totpCode }) }),
  complete2FA: (challengeToken: string, totpCode: string) =>
    api.post("/auth/2fa/complete", { challengeToken, totpCode }),
  register: (data: RequestBody) => api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
  enable2FA: () => api.post("/auth/2fa/enable"),
  verify2FA: (code: string) => api.post("/auth/2fa/verify", { code }),
  forgotPassword: (email: string) =>
    api.post("/auth/password/forgot", { email }),
  resetPassword: (token: string, password: string) =>
    api.post("/auth/password/reset", { token, password }),
  getPasswordRequirements: () => api.get("/auth/password/requirements"),
  logout: () => api.post("/auth/logout"),
};

export const machinesApi = {
  getAll: (params?: QueryParams) => api.get("/machines", { params }),
  getById: (id: string) => api.get(`/machines/${id}`),
  create: (data: RequestBody) => api.post("/machines", data),
  update: (id: string, data: RequestBody) => api.patch(`/machines/${id}`, data),
  delete: (id: string) => api.delete(`/machines/${id}`),
  getStats: () => api.get("/machines/stats"),
  getMap: () => api.get("/machines/map"),
  getSlots: (id: string) => api.get(`/machines/${id}/slots`),
  createSlot: (id: string, data: RequestBody) =>
    api.post(`/machines/${id}/slots`, data),
  updateSlot: (id: string, slotId: string, data: RequestBody) =>
    api.patch(`/machines/${id}/slots/${slotId}`, data),
  refillSlot: (id: string, slotId: string, data: RequestBody) =>
    api.post(`/machines/${id}/slots/${slotId}/refill`, data),
  moveToLocation: (id: string, data: RequestBody) =>
    api.post(`/machines/${id}/move`, data),
  getLocationHistory: (id: string) =>
    api.get(`/machines/${id}/location-history`),
  getComponents: (id: string) => api.get(`/machines/${id}/components`),
  installComponent: (id: string, data: RequestBody) =>
    api.post(`/machines/${id}/components`, data),
  getSimUsage: (id: string) => api.get(`/machines/${id}/sim-usage`),
  addSimUsage: (id: string, data: RequestBody) =>
    api.post(`/machines/${id}/sim-usage`, data),
  // Connectivity (Связь)
  getConnectivity: (id: string) => api.get(`/machines/${id}/connectivity`),
  addConnectivity: (id: string, data: RequestBody) =>
    api.post(`/machines/${id}/connectivity`, data),
  updateConnectivity: (id: string, connId: string, data: RequestBody) =>
    api.patch(`/machines/${id}/connectivity/${connId}`, data),
  deleteConnectivity: (id: string, connId: string) =>
    api.delete(`/machines/${id}/connectivity/${connId}`),
  // Expenses (Расходы)
  getExpenses: (id: string) => api.get(`/machines/${id}/expenses`),
  addExpense: (id: string, data: RequestBody) =>
    api.post(`/machines/${id}/expenses`, data),
  updateExpense: (id: string, expenseId: string, data: RequestBody) =>
    api.patch(`/machines/${id}/expenses/${expenseId}`, data),
  deleteExpense: (id: string, expenseId: string) =>
    api.delete(`/machines/${id}/expenses/${expenseId}`),
  // TCO
  getTco: (id: string) => api.get(`/machines/${id}/tco`),
  getErrors: (id: string) => api.get(`/machines/${id}/errors`),
  getState: (id: string) => api.get(`/machines/${id}/state`),
  getPnL: (id: string, from: string, to: string) =>
    api.get(`/machines/${id}/pnl`, { params: { from, to } }),
};

export const entityEventsApi = {
  query: (params?: QueryParams) => api.get("/entity-events", { params }),
  getTimeline: (entityId: string, params?: QueryParams) =>
    api.get(`/entity-events/entity/${entityId}`, { params }),
  getRecent: (entityId: string, count?: number) =>
    api.get(`/entity-events/entity/${entityId}/recent`, { params: { count } }),
  create: (data: RequestBody) => api.post("/entity-events", data),
};

export const batchMovementsApi = {
  create: (data: RequestBody) => api.post("/batch-movements", data),
  getBatchHistory: (batchId: string) =>
    api.get(`/batch-movements/batch/${batchId}`),
  getContainerMovements: (containerId: string) =>
    api.get(`/batch-movements/container/${containerId}`),
};

export const customFieldsApi = {
  getTabs: (params?: QueryParams) => api.get("/custom-fields/tabs", { params }),
  createTab: (data: RequestBody) => api.post("/custom-fields/tabs", data),
  updateTab: (id: string, data: RequestBody) =>
    api.patch(`/custom-fields/tabs/${id}`, data),
  deleteTab: (id: string) => api.delete(`/custom-fields/tabs/${id}`),
  getFields: (params?: QueryParams) =>
    api.get("/custom-fields/fields", { params }),
  createField: (data: RequestBody) => api.post("/custom-fields/fields", data),
  updateField: (id: string, data: RequestBody) =>
    api.patch(`/custom-fields/fields/${id}`, data),
  deleteField: (id: string) => api.delete(`/custom-fields/fields/${id}`),
};

export const productsApi = {
  getAll: (params?: QueryParams) => api.get("/products", { params }),
  getById: (id: string) => api.get(`/products/${id}`),
  create: (data: RequestBody) => api.post("/products", data),
  update: (id: string, data: RequestBody) => api.patch(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  getRecipes: (productId: string) => api.get(`/products/${productId}/recipes`),
  createRecipe: (productId: string, data: RequestBody) =>
    api.post(`/products/${productId}/recipes`, data),
  updateRecipe: (productId: string, recipeId: string, data: RequestBody) =>
    api.patch(`/products/${productId}/recipes/${recipeId}`, data),
  deleteRecipe: (productId: string, recipeId: string) =>
    api.delete(`/products/${productId}/recipes/${recipeId}`),
  getBatches: (productId: string) => api.get(`/products/${productId}/batches`),
  createBatch: (productId: string, data: RequestBody) =>
    api.post(`/products/${productId}/batches`, data),
  getPriceHistory: (productId: string) =>
    api.get(`/products/${productId}/price-history`),
  updatePrice: (productId: string, data: RequestBody) =>
    api.post(`/products/${productId}/update-price`, data),
};

export const inventoryApi = {
  getWarehouse: () => api.get("/inventory/warehouse"),
  getOperator: (operatorId?: string) =>
    api.get("/inventory/operator", { params: { operatorId } }),
  getMachine: (machineId: string) =>
    api.get("/inventory/machine", { params: { machineId } }),
  getLowStock: () => api.get("/inventory/low-stock"),
  transfer: (data: RequestBody) => api.post("/inventory/transfer", data),
  getMovements: (params?: QueryParams) =>
    api.get("/inventory/movements", { params }),
};

export const warehousesApi = {
  getAll: (params?: QueryParams) => api.get("/warehouses", { params }),
  getById: (id: string) => api.get(`/warehouses/${id}`),
  create: (data: RequestBody) => api.post("/warehouses", data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/warehouses/${id}`, data),
  delete: (id: string) => api.delete(`/warehouses/${id}`),
  getStock: (id: string) => api.get(`/warehouses/${id}/stock`),
  getMovements: (id: string, params?: QueryParams) =>
    api.get(`/warehouses/${id}/movements`, { params }),
  createMovement: (id: string, data: RequestBody) =>
    api.post(`/warehouses/${id}/movements`, data),
  completeMovement: (movementId: string) =>
    api.patch(`/warehouses/movements/${movementId}/complete`),
  cancelMovement: (movementId: string) =>
    api.patch(`/warehouses/movements/${movementId}/cancel`),
};

export const ordersApi = {
  getAll: (params?: QueryParams) => api.get("/orders", { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  getStats: (params?: QueryParams) => api.get("/orders/stats", { params }),
  create: (data: RequestBody) => api.post("/orders", data),
  updateStatus: (id: string, data: RequestBody) =>
    api.put(`/orders/${id}/status`, data),
  updatePayment: (id: string, data: RequestBody) =>
    api.put(`/orders/${id}/payment`, data),
  confirm: (id: string) => api.post(`/orders/${id}/confirm`),
  cancel: (id: string, reason?: string) =>
    api.post(`/orders/${id}/cancel`, { reason }),
};

export const tasksApi = {
  getAll: (params?: QueryParams) => api.get("/tasks", { params }),
  getMy: () => api.get("/tasks/my"),
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (data: RequestBody) => api.post("/tasks", data),
  update: (id: string, data: RequestBody) => api.patch(`/tasks/${id}`, data),
  start: (id: string) => api.post(`/tasks/${id}/start`),
  uploadPhotoBefore: (id: string, data: RequestBody) =>
    api.post(`/tasks/${id}/photo-before`, data),
  uploadPhotoAfter: (id: string, data: RequestBody) =>
    api.post(`/tasks/${id}/photo-after`, data),
  complete: (id: string, data: RequestBody) =>
    api.post(`/tasks/${id}/complete`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  getKanban: () => api.get("/tasks/kanban"),
  assign: (id: string, data: RequestBody) =>
    api.post(`/tasks/${id}/assign`, data),
  postpone: (id: string, data: RequestBody) =>
    api.post(`/tasks/${id}/postpone`, data),
  reject: (id: string, data: RequestBody) =>
    api.post(`/tasks/${id}/reject`, data),
  cancel: (id: string) => api.post(`/tasks/${id}/cancel`),
  getItems: (id: string) => api.get(`/tasks/${id}/items`),
  addItem: (id: string, data: RequestBody) =>
    api.post(`/tasks/${id}/items`, data),
  getComments: (id: string) => api.get(`/tasks/${id}/comments`),
  addComment: (id: string, data: RequestBody) =>
    api.post(`/tasks/${id}/comments`, data),
  getPhotos: (id: string) => api.get(`/tasks/${id}/photos`),
};

export const usersApi = {
  getAll: (params?: QueryParams) => api.get("/users", { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: RequestBody) => api.post("/users", data),
  update: (id: string, data: RequestBody) => api.patch(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const locationsApi = {
  getAll: () => api.get("/locations"),
  getById: (id: string) => api.get(`/locations/${id}`),
  getNearby: (lat: number, lng: number, radius?: number) =>
    api.get("/locations/nearby", { params: { lat, lng, radius } }),
  create: (data: RequestBody) => api.post("/locations", data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/locations/${id}`, data),
  delete: (id: string) => api.delete(`/locations/${id}`),
};

export const integrationsApi = {
  getAll: (params?: Record<string, unknown>) =>
    api.get("/integrations", { params }),
  getById: (id: string) => api.get(`/integrations/${id}`),
  getTemplates: () => api.get("/integrations/templates/all"),
  create: (data: RequestBody) => api.post("/integrations", data),
  update: (id: string, data: RequestBody) =>
    api.put(`/integrations/${id}`, data),
  updateConfig: (id: string, config: RequestBody) =>
    api.patch(`/integrations/${id}/config`, config),
  updateStatus: (id: string, status: string) =>
    api.patch(`/integrations/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/integrations/${id}`),
  test: (id: string) => api.post(`/integrations/${id}/test`),
};

export const reportsApi = {
  getDashboard: () => api.get("/analytics/dashboard"),
  getSales: (params?: QueryParams) => api.get("/reports/sales", { params }),
  getInventory: () => api.get("/reports/inventory"),
  getTasks: (params?: QueryParams) => api.get("/reports/tasks", { params }),
  getFinancial: (params?: QueryParams) =>
    api.get("/reports/financial", { params }),
  getDefinitions: (params?: QueryParams) =>
    api.get("/reports/definitions", { params }),
};

export const equipmentApi = {
  getAll: (params?: QueryParams) => api.get("/equipment", { params }),
  getById: (id: string) => api.get(`/equipment/${id}`),
  create: (data: RequestBody) => api.post("/equipment", data),
  update: (id: string, data: RequestBody) => api.put(`/equipment/${id}`, data),
  delete: (id: string) => api.delete(`/equipment/${id}`),
  addMaintenance: (data: RequestBody) =>
    api.post("/equipment/maintenance", data),
  getMaintenanceHistory: (params?: QueryParams) =>
    api.get("/equipment/maintenance/history", { params }),
  addMovement: (data: RequestBody) => api.post("/equipment/movements", data),
  getMovements: (params?: QueryParams) =>
    api.get("/equipment/movements/history", { params }),
};

export const hopperTypesApi = {
  getAll: (params?: QueryParams) => api.get("/hopper-types", { params }),
  getById: (id: string) => api.get(`/hopper-types/${id}`),
  create: (data: RequestBody) => api.post("/hopper-types", data),
  update: (id: string, data: RequestBody) =>
    api.put(`/hopper-types/${id}`, data),
  delete: (id: string) => api.delete(`/hopper-types/${id}`),
};

export const sparePartsApi = {
  getAll: (params?: QueryParams) => api.get("/spare-parts", { params }),
  getById: (id: string) => api.get(`/spare-parts/${id}`),
  create: (data: RequestBody) => api.post("/spare-parts", data),
  update: (id: string, data: RequestBody) =>
    api.put(`/spare-parts/${id}`, data),
  delete: (id: string) => api.delete(`/spare-parts/${id}`),
  adjustQuantity: (id: string, data: RequestBody) =>
    api.patch(`/spare-parts/${id}/quantity`, data),
};

export const washingSchedulesApi = {
  getAll: (params?: QueryParams) => api.get("/washing-schedules", { params }),
  getById: (id: string) => api.get(`/washing-schedules/${id}`),
  create: (data: RequestBody) => api.post("/washing-schedules", data),
  update: (id: string, data: RequestBody) =>
    api.put(`/washing-schedules/${id}`, data),
  delete: (id: string) => api.delete(`/washing-schedules/${id}`),
  complete: (id: string) => api.post(`/washing-schedules/${id}/complete`),
};

export const warehouseApi = {
  getAll: (params?: QueryParams) => api.get("/warehouses", { params }),
  getById: (id: string) => api.get(`/warehouses/${id}`),
  create: (data: RequestBody) => api.post("/warehouses", data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/warehouses/${id}`, data),
  delete: (id: string) => api.delete(`/warehouses/${id}`),
  getStock: (id: string) => api.get(`/warehouses/${id}/stock`),
  getMovements: (id: string, params?: QueryParams) =>
    api.get(`/warehouses/${id}/movements`, { params }),
  createMovement: (id: string, data: RequestBody) =>
    api.post(`/warehouses/${id}/movements`, data),
  transfer: (id: string, data: RequestBody) =>
    api.post(`/warehouses/${id}/transfer`, data),
  getBatches: (id: string, params?: QueryParams) =>
    api.get(`/warehouses/${id}/batches`, { params }),
  createBatch: (id: string, data: RequestBody) =>
    api.post(`/warehouses/${id}/batches`, data),
};

/** @deprecated Use routesApi — trips merged into routes */
export const tripsApi = {
  getAll: (params?: QueryParams) => api.get("/routes", { params }),
  getById: (id: string) => api.get(`/routes/${id}`),
  getActive: () => api.get("/routes/active"),
  start: (id: string, data?: RequestBody) =>
    api.post(`/routes/${id}/start`, data),
  end: (id: string, data?: RequestBody) => api.post(`/routes/${id}/end`, data),
  cancel: (id: string, data?: RequestBody) =>
    api.post(`/routes/${id}/cancel`, data),
  getRoute: (id: string) => api.get(`/routes/${id}/track`),
  getStops: (id: string) => api.get(`/routes/${id}/stops`),
  getAnomalies: (id: string) => api.get(`/routes/${id}/anomalies`),
  getTasks: (id: string) => api.get(`/routes/${id}/tasks`),
  linkTask: (id: string, data: RequestBody) =>
    api.post(`/routes/${id}/tasks`, data),
  completeTask: (routeId: string, taskId: string, data?: RequestBody) =>
    api.post(`/routes/${routeId}/tasks/${taskId}/complete`, data),
  getUnresolvedAnomalies: (params?: QueryParams) =>
    api.get("/routes/anomalies/unresolved", { params }),
  resolveAnomaly: (id: string, data: RequestBody) =>
    api.post(`/routes/anomalies/${id}/resolve`, data),
  getEmployeeAnalytics: (params?: QueryParams) =>
    api.get("/routes/analytics/employees", { params }),
  getMachineAnalytics: (params?: QueryParams) =>
    api.get("/routes/analytics", { params }),
  getSummaryAnalytics: (params?: QueryParams) =>
    api.get("/routes/analytics", { params }),
};

export const routesApi = {
  getAll: (params?: QueryParams) => api.get("/routes", { params }),
  getById: (id: string) => api.get(`/routes/${id}`),
  create: (data: RequestBody) => api.post("/routes", data),
  update: (id: string, data: RequestBody) => api.patch(`/routes/${id}`, data),
  delete: (id: string) => api.delete(`/routes/${id}`),
  start: (id: string) => api.post(`/routes/${id}/start`),
  complete: (id: string, data?: RequestBody) =>
    api.post(`/routes/${id}/complete`, data),
  optimize: (id: string) => api.post(`/routes/${id}/optimize`),
  getStops: (id: string) => api.get(`/routes/${id}/stops`),
  addStop: (id: string, data: RequestBody) =>
    api.post(`/routes/${id}/stops`, data),
  updateStop: (id: string, stopId: string, data: RequestBody) =>
    api.patch(`/routes/${id}/stops/${stopId}`, data),
  removeStop: (id: string, stopId: string) =>
    api.delete(`/routes/${id}/stops/${stopId}`),
  reorderStops: (id: string, data: RequestBody) =>
    api.post(`/routes/${id}/stops/reorder`, data),
};

export const incidentsApi = {
  getAll: (params?: QueryParams) => api.get("/incidents", { params }),
  getById: (id: string) => api.get(`/incidents/${id}`),
  create: (data: RequestBody) => api.post("/incidents", data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/incidents/${id}`, data),
  delete: (id: string) => api.delete(`/incidents/${id}`),
  assign: (id: string, data: RequestBody) =>
    api.post(`/incidents/${id}/assign`, data),
  resolve: (id: string, data: RequestBody) =>
    api.post(`/incidents/${id}/resolve`, data),
  close: (id: string) => api.post(`/incidents/${id}/close`),
  getStatistics: (params?: QueryParams) =>
    api.get("/incidents/statistics", { params }),
  getByMachine: (machineId: string) =>
    api.get(`/incidents/machine/${machineId}`),
};

export const alertsApi = {
  getRules: (params?: QueryParams) => api.get("/alerts/rules", { params }),
  getRuleById: (id: string) => api.get(`/alerts/rules/${id}`),
  createRule: (data: RequestBody) => api.post("/alerts/rules", data),
  updateRule: (id: string, data: RequestBody) =>
    api.put(`/alerts/rules/${id}`, data),
  deleteRule: (id: string) => api.delete(`/alerts/rules/${id}`),
  getHistory: (params?: QueryParams) => api.get("/alerts/history", { params }),
  getActive: () => api.get("/alerts/active"),
  acknowledge: (id: string, data?: RequestBody) =>
    api.post(`/alerts/${id}/acknowledge`, data),
  resolve: (id: string, data?: RequestBody) =>
    api.post(`/alerts/${id}/resolve`, data),
  dismiss: (id: string, data?: RequestBody) =>
    api.post(`/alerts/${id}/dismiss`, data),
};

export const machineAccessApi = {
  getAll: (params?: QueryParams) => api.get("/machine-access", { params }),
  getById: (id: string) => api.get(`/machine-access/${id}`),
  grant: (data: RequestBody) => api.post("/machine-access", data),
  revoke: (data: RequestBody) => api.post("/machine-access/revoke", data),
  delete: (id: string) => api.delete(`/machine-access/${id}`),
  getByMachine: (machineId: string) =>
    api.get(`/machine-access/machine/${machineId}`),
  getByUser: (userId: string) => api.get(`/machine-access/user/${userId}`),
  getTemplates: () => api.get("/machine-access/templates/list"),
  getTemplate: (id: string) => api.get(`/machine-access/templates/${id}`),
  createTemplate: (data: RequestBody) =>
    api.post("/machine-access/templates", data),
  updateTemplate: (id: string, data: RequestBody) =>
    api.patch(`/machine-access/templates/${id}`, data),
  deleteTemplate: (id: string) => api.delete(`/machine-access/templates/${id}`),
  applyTemplate: (data: RequestBody) =>
    api.post("/machine-access/templates/apply", data),
};

export const operatorRatingsApi = {
  getAll: (params?: QueryParams) => api.get("/operator-ratings", { params }),
  getById: (id: string) => api.get(`/operator-ratings/${id}`),
  calculate: (data: RequestBody) =>
    api.post("/operator-ratings/calculate", data),
  recalculate: (id: string, data: RequestBody) =>
    api.post(`/operator-ratings/recalculate/${id}`, data),
  delete: (id: string) => api.delete(`/operator-ratings/${id}`),
  getLeaderboard: (params: QueryParams) =>
    api.get("/operator-ratings/leaderboard", { params }),
  getSummary: (params: QueryParams) =>
    api.get("/operator-ratings/summary", { params }),
  getOperatorHistory: (userId: string, params?: QueryParams) =>
    api.get(`/operator-ratings/operator/${userId}`, { params }),
};

// === Phase 3: Transactions & Finance ===

export const transactionsApi = {
  getAll: (params?: QueryParams) => api.get("/transactions", { params }),
  getById: (id: string) => api.get(`/transactions/${id}`),
  getCollections: (params?: QueryParams) =>
    api.get("/transactions/collections", { params }),
  createCollection: (data: RequestBody) =>
    api.post("/transactions/collections", data),
  verifyCollection: (id: string, data: RequestBody) =>
    api.patch(`/transactions/collections/${id}/verify`, data),
  getDailySummaries: (params?: QueryParams) =>
    api.get("/transactions/daily-summaries", { params }),
  rebuildDailySummary: (data: RequestBody) =>
    api.post("/transactions/daily-summaries/rebuild", data),
  getCommissions: (params?: QueryParams) =>
    api.get("/transactions/commissions", { params }),
};

export const collectionsApi = {
  getAll: (params?: QueryParams) => api.get("/collections", { params }),
  getPending: () => api.get("/collections/pending"),
  getMy: () => api.get("/collections/my"),
  getStats: () => api.get("/collections/stats"),
  getById: (id: string) => api.get(`/collections/${id}`),
  getHistory: (id: string) => api.get(`/collections/${id}/history`),
  create: (data: RequestBody) => api.post("/collections", data),
  receive: (id: string, data: RequestBody) =>
    api.patch(`/collections/${id}/receive`, data),
  edit: (id: string, data: RequestBody) =>
    api.patch(`/collections/${id}/edit`, data),
  cancel: (id: string, data: RequestBody) =>
    api.patch(`/collections/${id}/cancel`, data),
};

export const reconciliationApi = {
  getRuns: (params?: QueryParams) =>
    api.get("/reconciliation/runs", { params }),
  getRunById: (id: string) => api.get(`/reconciliation/runs/${id}`),
  createRun: (data: RequestBody) => api.post("/reconciliation/runs", data),
  deleteRun: (id: string) => api.delete(`/reconciliation/runs/${id}`),
  getMismatches: (runId: string, params?: QueryParams) =>
    api.get(`/reconciliation/runs/${runId}/mismatches`, { params }),
  resolveMismatch: (id: string, data: RequestBody) =>
    api.patch(`/reconciliation/mismatches/${id}/resolve`, data),
  importHwSales: (data: RequestBody) =>
    api.post("/reconciliation/import", data),
};

export const billingApi = {
  getInvoices: (params?: QueryParams) =>
    api.get("/billing/invoices", { params }),
  getInvoiceById: (id: string) => api.get(`/billing/invoices/${id}`),
  createInvoice: (data: RequestBody) => api.post("/billing/invoices", data),
  updateInvoice: (id: string, data: RequestBody) =>
    api.patch(`/billing/invoices/${id}`, data),
  sendInvoice: (id: string) => api.post(`/billing/invoices/${id}/send`),
  cancelInvoice: (id: string) => api.post(`/billing/invoices/${id}/cancel`),
  deleteInvoice: (id: string) => api.delete(`/billing/invoices/${id}`),
  getInvoiceStats: () => api.get("/billing/invoices/stats"),
  recordPayment: (invoiceId: string, data: RequestBody) =>
    api.post(`/billing/invoices/${invoiceId}/payments`, data),
  getPayments: (params?: QueryParams) =>
    api.get("/billing/payments", { params }),
};

export const openingBalancesApi = {
  getAll: (params?: QueryParams) => api.get("/opening-balances", { params }),
  getById: (id: string) => api.get(`/opening-balances/${id}`),
  create: (data: RequestBody) => api.post("/opening-balances", data),
  bulkCreate: (data: RequestBody) => api.post("/opening-balances/bulk", data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/opening-balances/${id}`, data),
  apply: (id: string) => api.post(`/opening-balances/${id}/apply`),
  applyAll: (data: RequestBody) =>
    api.post("/opening-balances/apply-all", data),
  delete: (id: string) => api.delete(`/opening-balances/${id}`),
  getStats: () => api.get("/opening-balances/stats"),
};

export const purchaseHistoryApi = {
  getAll: (params?: QueryParams) => api.get("/purchase-history", { params }),
  getById: (id: string) => api.get(`/purchase-history/${id}`),
  create: (data: RequestBody) => api.post("/purchase-history", data),
  bulkCreate: (data: RequestBody) => api.post("/purchase-history/bulk", data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/purchase-history/${id}`, data),
  receive: (id: string, data?: RequestBody) =>
    api.post(`/purchase-history/${id}/receive`, data),
  cancel: (id: string) => api.post(`/purchase-history/${id}/cancel`),
  returnPurchase: (id: string, data: RequestBody) =>
    api.post(`/purchase-history/${id}/return`, data),
  delete: (id: string) => api.delete(`/purchase-history/${id}`),
  getStats: (params?: QueryParams) =>
    api.get("/purchase-history/stats", { params }),
};

export const salesImportApi = {
  getAll: (params?: QueryParams) => api.get("/sales-import", { params }),
  getById: (id: string) => api.get(`/sales-import/${id}`),
  create: (data: RequestBody) => api.post("/sales-import", data),
  delete: (id: string) => api.delete(`/sales-import/${id}`),
  getStats: () => api.get("/sales-import/stats"),
};

export const auditApi = {
  getLogs: (params?: QueryParams) => api.get("/audit/logs", { params }),
  getLogById: (id: string) => api.get(`/audit/logs/${id}`),
  createLog: (data: RequestBody) => api.post("/audit/logs", data),
  getEntityHistory: (
    entityType: string,
    entityId: string,
    params?: QueryParams,
  ) => api.get(`/audit/history/${entityType}/${entityId}`, { params }),
  getStatistics: (params: QueryParams) =>
    api.get("/audit/statistics", { params }),
  getSnapshots: (entityType: string, entityId: string) =>
    api.get(`/audit/snapshots/${entityType}/${entityId}`),
  getSnapshotById: (id: string) => api.get(`/audit/snapshots/detail/${id}`),
  createSnapshot: (data: RequestBody) => api.post("/audit/snapshots", data),
  getUserSessions: (userId: string, params?: QueryParams) =>
    api.get(`/audit/sessions/user/${userId}`, { params }),
  endSession: (sessionId: string, data?: RequestBody) =>
    api.post(`/audit/sessions/${sessionId}/end`, data),
  terminateAllSessions: (userId: string, data?: RequestBody) =>
    api.post(`/audit/sessions/user/${userId}/terminate-all`, data),
  markSuspicious: (sessionId: string, data: RequestBody) =>
    api.post(`/audit/sessions/${sessionId}/suspicious`, data),
  getReports: (params: QueryParams) => api.get("/audit/reports", { params }),
  generateReport: (data: RequestBody) =>
    api.post("/audit/reports/generate", data),
  cleanupLogs: () => api.post("/audit/cleanup/logs"),
  cleanupSnapshots: () => api.post("/audit/cleanup/snapshots"),
};

export const containersApi = {
  getAll: (params?: QueryParams) => api.get("/containers", { params }),
  getById: (id: string) => api.get(`/containers/${id}`),
  getByMachine: (machineId: string) =>
    api.get(`/containers/by-machine/${machineId}`),
  create: (data: RequestBody) => api.post("/containers", data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/containers/${id}`, data),
  refill: (id: string, data: RequestBody) =>
    api.post(`/containers/${id}/refill`, data),
  delete: (id: string) => api.delete(`/containers/${id}`),
};

export const analyticsApi = {
  getSnapshots: (params?: QueryParams) =>
    api.get("/reports/analytics/snapshots", { params }),
  getSnapshotById: (id: string) =>
    api.get(`/reports/analytics/snapshots/${id}`),
  rebuildSnapshot: (data: RequestBody) =>
    api.post("/reports/analytics/snapshots/rebuild", data),
  getDailyStats: (params?: QueryParams) =>
    api.get("/reports/analytics/daily-stats", { params }),
  rebuildDailyStats: (data: RequestBody) =>
    api.post("/reports/analytics/daily-stats/rebuild", data),
  getDashboard: () => api.get("/analytics/dashboard"),
};

export const contractsApi = {
  getAll: (params?: QueryParams) =>
    api.get("/contractors/contracts", { params }),
  getById: (id: string) => api.get(`/contractors/contracts/${id}`),
  create: (data: RequestBody) => api.post("/contractors/contracts", data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/contractors/contracts/${id}`, data),
  activate: (id: string) => api.post(`/contractors/contracts/${id}/activate`),
  suspend: (id: string) => api.post(`/contractors/contracts/${id}/suspend`),
  terminate: (id: string) => api.post(`/contractors/contracts/${id}/terminate`),
  calculateCommission: (id: string, data: RequestBody) =>
    api.post(`/contractors/contracts/${id}/commissions/calculate`, data),
  getCommissions: (id: string, params?: QueryParams) =>
    api.get(`/contractors/contracts/${id}/commissions`, { params }),
  markCommissionPaid: (commissionId: string) =>
    api.post(`/contractors/contracts/commissions/${commissionId}/paid`),
};

// === Phase 4: Payments ===

export const paymentsApi = {
  getTransactions: (params?: QueryParams) =>
    api.get("/payments/transactions", { params }),
  getTransaction: (id: string) => api.get(`/payments/transactions/${id}`),
  getTransactionStats: () => api.get("/payments/transactions/stats"),
  initiateRefund: (data: RequestBody) => api.post("/payments/refund", data),
};

// === Phase 4: Import ===

export const importApi = {
  getSessions: (params?: QueryParams) =>
    api.get("/import/sessions", { params }),
  getSession: (id: string) => api.get(`/import/sessions/${id}`),
  createSession: (data: FormData) =>
    api.post("/import/sessions", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  classifySession: (id: string) => api.post(`/import/sessions/${id}/classify`),
  validateSession: (id: string) => api.post(`/import/sessions/${id}/validate`),
  approveSession: (id: string) => api.post(`/import/sessions/${id}/approve`),
  rejectSession: (id: string, data: RequestBody) =>
    api.post(`/import/sessions/${id}/reject`, data),
  getAuditLog: (id: string, params?: QueryParams) =>
    api.get(`/import/sessions/${id}/audit-log`, { params }),
  getSchemas: () => api.get("/import/schemas"),
  getValidationRules: () => api.get("/import/validation-rules"),
};

// === Phase 4: Promo Codes ===

export const promoCodesApi = {
  getAll: (params?: QueryParams) => api.get("/promo-codes", { params }),
  getById: (id: string) => api.get(`/promo-codes/${id}`),
  create: (data: RequestBody) => api.post("/promo-codes", data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/promo-codes/${id}`, data),
  deactivate: (id: string) => api.post(`/promo-codes/${id}/deactivate`),
  getRedemptions: (id: string, params?: QueryParams) =>
    api.get(`/promo-codes/${id}/redemptions`, { params }),
  getStats: (id: string) => api.get(`/promo-codes/${id}/stats`),
};

// === Phase 4: Loyalty & Gamification ===

export const loyaltyApi = {
  // Admin endpoints
  getStats: (params?: QueryParams) =>
    api.get("/loyalty/admin/stats", { params }),
  adjustPoints: (data: RequestBody) => api.post("/loyalty/admin/adjust", data),
  getExpiringPoints: (days?: number) =>
    api.get("/loyalty/admin/expiring", { params: { days } }),
  // User-facing (admin viewing)
  getBalance: () => api.get("/loyalty/balance"),
  getHistory: (params?: QueryParams) => api.get("/loyalty/history", { params }),
  getLevels: () => api.get("/loyalty/levels"),
  getLevelsInfo: () => api.get("/loyalty/levels/info"),
  getLeaderboard: (params?: QueryParams) =>
    api.get("/loyalty/leaderboard", { params }),
};

export const settingsApi = {
  getAll: (params?: QueryParams) => api.get("/settings", { params }),
  getPublic: () => api.get("/settings/public"),
  getByKey: (key: string) => api.get(`/settings/${key}`),
  create: (data: RequestBody) => api.post("/settings", data),
  update: (key: string, data: RequestBody) =>
    api.patch(`/settings/${key}`, data),
  delete: (key: string) => api.delete(`/settings/${key}`),
};

export const achievementsApi = {
  // Admin CRUD
  getAll: (params?: QueryParams) => api.get("/achievements", { params }),
  getById: (id: string) => api.get(`/achievements/${id}`),
  create: (data: RequestBody) => api.post("/achievements", data),
  update: (id: string, data: RequestBody) =>
    api.put(`/achievements/${id}`, data),
  delete: (id: string) => api.delete(`/achievements/${id}`),
  getStats: (params?: QueryParams) =>
    api.get("/achievements/stats", { params }),
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
  getAll: (params?: QueryParams) => api.get("/quests", { params }),
  getById: (id: string) => api.get(`/quests/${id}`),
  create: (data: RequestBody) => api.post("/quests", data),
  update: (id: string, data: RequestBody) => api.put(`/quests/${id}`, data),
  delete: (id: string) => api.delete(`/quests/${id}`),
  getStats: (params?: QueryParams) => api.get("/quests/stats", { params }),
  // User-facing
  getMy: () => api.get("/quests/my"),
  getMyQuest: (userQuestId: string) => api.get(`/quests/my/${userQuestId}`),
  claim: (userQuestId: string) => api.post(`/quests/my/${userQuestId}/claim`),
  claimAll: () => api.post("/quests/my/claim-all"),
};

// === Phase 4: Client B2C ===

export const clientApi = {
  getClients: (params?: QueryParams) =>
    api.get("/client/admin/users", { params }),
  getClient: (id: string) => api.get(`/client/admin/users/${id}`),
  getOrders: (params?: QueryParams) =>
    api.get("/client/admin/orders", { params }),
  getWallets: (params?: QueryParams) =>
    api.get("/client/admin/wallets", { params }),
};

// === Phase 4: HR ===

export const hrApi = {
  // Employee CRUD
  getEmployees: (params?: QueryParams) => api.get("/employees", { params }),
  getEmployee: (id: string) => api.get(`/employees/${id}`),
  createEmployee: (data: RequestBody) => api.post("/employees", data),
  updateEmployee: (id: string, data: RequestBody) =>
    api.put(`/employees/${id}`, data),
  deleteEmployee: (id: string) => api.delete(`/employees/${id}`),
  terminateEmployee: (id: string, data: RequestBody) =>
    api.post(`/employees/${id}/terminate`, data),
  linkUser: (id: string, data: RequestBody) =>
    api.post(`/employees/${id}/link-user`, data),
  unlinkUser: (id: string) => api.post(`/employees/${id}/unlink-user`),
  getStats: () => api.get("/employees/stats"),
  getActive: (params?: QueryParams) => api.get("/employees/active", { params }),
  getByRole: (role: string, params?: QueryParams) =>
    api.get(`/employees/by-role/${role}`, { params }),
  getByTelegram: (telegramId: string) =>
    api.get(`/employees/by-telegram/${telegramId}`),
  cancelLeave: (id: string) => api.post(`/employees/leave/${id}/cancel`),
  // Departments
  getDepartments: (params?: QueryParams) =>
    api.get("/employees/departments", { params }),
  createDepartment: (data: RequestBody) =>
    api.post("/employees/departments", data),
  updateDepartment: (id: string, data: RequestBody) =>
    api.put(`/employees/departments/${id}`, data),
  deleteDepartment: (id: string) => api.delete(`/employees/departments/${id}`),
  getPositions: (params?: QueryParams) =>
    api.get("/employees/positions", { params }),
  createPosition: (data: RequestBody) => api.post("/employees/positions", data),
  updatePosition: (id: string, data: RequestBody) =>
    api.put(`/employees/positions/${id}`, data),
  getAttendance: (params?: QueryParams) =>
    api.get("/employees/attendance", { params }),
  checkIn: (data: RequestBody) =>
    api.post("/employees/attendance/check-in", data),
  checkOut: (data: RequestBody) =>
    api.post("/employees/attendance/check-out", data),
  getDailyReport: (params?: QueryParams) =>
    api.get("/employees/attendance/daily-report", { params }),
  getLeaveRequests: (params?: QueryParams) =>
    api.get("/employees/leave", { params }),
  createLeaveRequest: (data: RequestBody) => api.post("/employees/leave", data),
  approveLeave: (id: string) => api.post(`/employees/leave/${id}/approve`),
  rejectLeave: (id: string, data: RequestBody) =>
    api.post(`/employees/leave/${id}/reject`, data),
  getLeaveBalance: (employeeId: string) =>
    api.get(`/employees/leave/balance/${employeeId}`),
  getPayrolls: (params?: QueryParams) =>
    api.get("/employees/payroll", { params }),
  calculatePayroll: (data: RequestBody) =>
    api.post("/employees/payroll/calculate", data),
  approvePayroll: (id: string) => api.post(`/employees/payroll/${id}/approve`),
  payPayroll: (id: string) => api.post(`/employees/payroll/${id}/pay`),
  getPayroll: (id: string) => api.get(`/employees/payroll/${id}`),
  getReviews: (params?: QueryParams) =>
    api.get("/employees/reviews", { params }),
  createReview: (data: RequestBody) => api.post("/employees/reviews", data),
  submitReview: (id: string, data: RequestBody) =>
    api.post(`/employees/reviews/${id}/submit`, data),
  getReview: (id: string) => api.get(`/employees/reviews/${id}`),
};

// === Phase 4: Notifications ===

export const notificationsApi = {
  getAll: (params?: QueryParams) => api.get("/notifications", { params }),
  getById: (id: string) => api.get(`/notifications/${id}`),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post("/notifications/read-all"),
  getUnreadCount: () => api.get("/notifications/unread-count"),
  subscribePush: (data: RequestBody) =>
    api.post("/notifications/push/subscribe", data),
  unsubscribePush: (data: RequestBody) =>
    api.delete("/notifications/push/unsubscribe", { data }),
  registerFcm: (data: RequestBody) =>
    api.post("/notifications/fcm/register", data),
  unregisterFcm: (data: RequestBody) =>
    api.delete("/notifications/fcm/unregister", { data }),
};

// === Master Data (Directories) ===

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

export const organizationsApi = {
  getAll: (params?: QueryParams) =>
    api.get("/organizations", { params }).then((r) => r.data),
  getById: (id: string) => api.get(`/organizations/${id}`).then((r) => r.data),
  create: (data: RequestBody) =>
    api.post("/organizations", data).then((r) => r.data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/organizations/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/organizations/${id}`),
};

export const vehiclesApi = {
  getAll: (params?: QueryParams) =>
    api.get("/vehicles", { params }).then((r) => r.data),
  getById: (id: string) => api.get(`/vehicles/${id}`).then((r) => r.data),
  create: (data: RequestBody) =>
    api.post("/vehicles", data).then((r) => r.data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/vehicles/${id}`, data).then((r) => r.data),
  updateOdometer: (id: string, data: RequestBody) =>
    api.patch(`/vehicles/${id}/odometer`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/vehicles/${id}`),
};

export const webhooksApi = {
  getAll: (params?: QueryParams) =>
    api.get("/webhooks", { params }).then((r) => r.data),
  getById: (id: string) => api.get(`/webhooks/${id}`).then((r) => r.data),
  getEvents: () => api.get("/webhooks/events/list").then((r) => r.data),
  create: (data: RequestBody) =>
    api.post("/webhooks", data).then((r) => r.data),
  update: (id: string, data: RequestBody) =>
    api.put(`/webhooks/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/webhooks/${id}`),
  regenerateSecret: (id: string) =>
    api.post(`/webhooks/${id}/regenerate-secret`).then((r) => r.data),
  test: (id: string, data?: RequestBody) =>
    api.post(`/webhooks/${id}/test`, data).then((r) => r.data),
  getLogs: (id: string, params?: QueryParams) =>
    api.get(`/webhooks/${id}/logs`, { params }).then((r) => r.data),
};

export const referencesApi = {
  // Goods classifiers (MXIK)
  getGoodsClassifiers: (params?: QueryParams) =>
    api.get("/references/goods-classifiers", { params }).then((r) => r.data),
  getGoodsClassifier: (code: string) =>
    api.get(`/references/goods-classifiers/${code}`).then((r) => r.data),
  createGoodsClassifier: (data: RequestBody) =>
    api.post("/references/goods-classifiers", data).then((r) => r.data),
  updateGoodsClassifier: (id: string, data: RequestBody) =>
    api.patch(`/references/goods-classifiers/${id}`, data).then((r) => r.data),
  // IKPU tax codes
  getIkpuCodes: (params?: QueryParams) =>
    api.get("/references/ikpu-codes", { params }).then((r) => r.data),
  getIkpuCode: (code: string) =>
    api.get(`/references/ikpu-codes/${code}`).then((r) => r.data),
  createIkpuCode: (data: RequestBody) =>
    api.post("/references/ikpu-codes", data).then((r) => r.data),
  updateIkpuCode: (id: string, data: RequestBody) =>
    api.patch(`/references/ikpu-codes/${id}`, data).then((r) => r.data),
  // VAT rates
  getVatRates: (params?: QueryParams) =>
    api.get("/references/vat-rates", { params }).then((r) => r.data),
  getVatRate: (code: string) =>
    api.get(`/references/vat-rates/${code}`).then((r) => r.data),
  createVatRate: (data: RequestBody) =>
    api.post("/references/vat-rates", data).then((r) => r.data),
  updateVatRate: (id: string, data: RequestBody) =>
    api.patch(`/references/vat-rates/${id}`, data).then((r) => r.data),
  // Package types
  getPackageTypes: (params?: QueryParams) =>
    api.get("/references/package-types", { params }).then((r) => r.data),
  getPackageType: (code: string) =>
    api.get(`/references/package-types/${code}`).then((r) => r.data),
  createPackageType: (data: RequestBody) =>
    api.post("/references/package-types", data).then((r) => r.data),
  updatePackageType: (id: string, data: RequestBody) =>
    api.patch(`/references/package-types/${id}`, data).then((r) => r.data),
  // Payment providers
  getPaymentProviders: (params?: QueryParams) =>
    api.get("/references/payment-providers", { params }).then((r) => r.data),
  getPaymentProvider: (code: string) =>
    api.get(`/references/payment-providers/${code}`).then((r) => r.data),
  createPaymentProvider: (data: RequestBody) =>
    api.post("/references/payment-providers", data).then((r) => r.data),
  updatePaymentProvider: (id: string, data: RequestBody) =>
    api.patch(`/references/payment-providers/${id}`, data).then((r) => r.data),
  // Static read-only
  getMarkingRequirements: () =>
    api.get("/references/marking-requirements").then((r) => r.data),
  getCurrencies: () => api.get("/references/currencies").then((r) => r.data),
  getRegions: () => api.get("/references/regions").then((r) => r.data),
};

export const directoriesApi = {
  // Directories CRUD
  getAll: (params?: QueryParams) => api.get("/directories", { params }),
  getById: (id: string) => api.get(`/directories/${id}`),
  getBySlug: (slug: string) => api.get(`/directories/by-slug/${slug}`),
  create: (data: RequestBody) => api.post("/directories", data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/directories/${id}`, data),
  delete: (id: string) => api.delete(`/directories/${id}`),

  // Fields CRUD
  addField: (dirId: string, data: RequestBody) =>
    api.post(`/directories/${dirId}/fields`, data),
  updateField: (dirId: string, fieldId: string, data: RequestBody) =>
    api.patch(`/directories/${dirId}/fields/${fieldId}`, data),
  removeField: (dirId: string, fieldId: string) =>
    api.delete(`/directories/${dirId}/fields/${fieldId}`),

  // Entries CRUD
  getEntries: (dirId: string, params?: QueryParams) =>
    api.get(`/directories/${dirId}/entries`, { params }),
  getEntry: (dirId: string, entryId: string) =>
    api.get(`/directories/${dirId}/entries/${entryId}`),
  createEntry: (dirId: string, data: RequestBody) =>
    api.post(`/directories/${dirId}/entries`, data),
  updateEntry: (dirId: string, entryId: string, data: RequestBody) =>
    api.patch(`/directories/${dirId}/entries/${entryId}`, data),
  deleteEntry: (dirId: string, entryId: string) =>
    api.delete(`/directories/${dirId}/entries/${entryId}`),
  searchEntries: (dirId: string, params: { q: string; limit?: number }) =>
    api.get(`/directories/${dirId}/entries/search`, { params }),
  inlineCreateEntry: (dirId: string, data: RequestBody) =>
    api.post(`/directories/${dirId}/entries/inline`, data),

  // Sources CRUD
  getSources: (dirId: string, params?: QueryParams) =>
    api.get(`/directories/${dirId}/sources`, { params }),
  getSource: (dirId: string, sourceId: string) =>
    api.get(`/directories/${dirId}/sources/${sourceId}`),
  createSource: (dirId: string, data: RequestBody) =>
    api.post(`/directories/${dirId}/sources`, data),
  updateSource: (dirId: string, sourceId: string, data: RequestBody) =>
    api.patch(`/directories/${dirId}/sources/${sourceId}`, data),
  deleteSource: (dirId: string, sourceId: string) =>
    api.delete(`/directories/${dirId}/sources/${sourceId}`),
  triggerSync: (dirId: string, sourceId: string) =>
    api.post(`/directories/${dirId}/sources/${sourceId}/sync`),

  // Sync Logs
  getSyncLogs: (dirId: string, params?: QueryParams) =>
    api.get(`/directories/${dirId}/sync-logs`, { params }),

  // Hierarchy
  getTree: (dirId: string) => api.get(`/directories/${dirId}/tree`),
  moveEntry: (dirId: string, entryId: string, data: RequestBody) =>
    api.post(`/directories/${dirId}/entries/${entryId}/move`, data),

  // Audit
  getAuditLogs: (dirId: string, params?: QueryParams) =>
    api.get(`/directories/${dirId}/audit`, { params }),
  getEntryAudit: (dirId: string, entryId: string, params?: QueryParams) =>
    api.get(`/directories/${dirId}/entries/${entryId}/audit`, { params }),
};

export const websiteConfigApi = {
  getAll: (params?: QueryParams) =>
    api.get("/website-config", { params }).then((r) => r.data),
  getBySection: (section: string, params?: QueryParams) =>
    api.get(`/website-config/${section}`, { params }).then((r) => r.data),
  getByKey: (key: string) =>
    api.get(`/website-config/key/${key}`).then((r) => r.data),
  create: (data: RequestBody) =>
    api.post("/website-config", data).then((r) => r.data),
  updateByKey: (key: string, data: RequestBody) =>
    api.patch(`/website-config/${key}`, data).then((r) => r.data),
  bulkUpdate: (configs: RequestBody[]) =>
    api.patch("/website-config/bulk/update", configs).then((r) => r.data),
  deleteByKey: (key: string) =>
    api.delete(`/website-config/${key}`).then((r) => r.data),
};

export const cmsApi = {
  listArticles: (params?: QueryParams) =>
    api.get("/cms/articles", { params }).then((r) => r.data),
  getArticle: (idOrSlug: string) =>
    api.get(`/cms/articles/${idOrSlug}`).then((r) => r.data),
  getByCategory: (category: string) =>
    api.get(`/cms/articles/category/${category}`).then((r) => r.data),
  create: (data: RequestBody) =>
    api.post("/cms/articles", data).then((r) => r.data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/cms/articles/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/cms/articles/${id}`).then((r) => r.data),
};

export const invitesApi = {
  create: (data: RequestBody) => api.post("/invites", data),
  getAll: (params?: QueryParams) => api.get("/invites", { params }),
  getById: (id: string) => api.get(`/invites/${id}`),
  validate: (code: string) => api.get(`/invites/validate/${code}`),
  revoke: (id: string) => api.delete(`/invites/${id}`),
  registerWithInvite: (data: RequestBody) =>
    api.post("/auth/register/invite", data),
};

// === Complaints ===

export const complaintsApi = {
  getAll: (params?: QueryParams) => api.get("/complaints", { params }),
  getById: (id: string) => api.get(`/complaints/${id}`),
  create: (data: RequestBody) => api.post("/complaints", data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/complaints/${id}`, data),
  delete: (id: string) => api.delete(`/complaints/${id}`),
  assign: (id: string, data: RequestBody) =>
    api.post(`/complaints/${id}/assign`, data),
  resolve: (id: string, data: RequestBody) =>
    api.post(`/complaints/${id}/resolve`, data),
  escalate: (id: string, data: RequestBody) =>
    api.post(`/complaints/${id}/escalate`, data),
  reject: (id: string, data: RequestBody) =>
    api.post(`/complaints/${id}/reject`, data),
  feedback: (id: string, data: RequestBody) =>
    api.post(`/complaints/${id}/feedback`, data),
  getComments: (id: string, params?: QueryParams) =>
    api.get(`/complaints/${id}/comments`, { params }),
  addComment: (id: string, data: RequestBody) =>
    api.post(`/complaints/${id}/comments`, data),
  getRefunds: (id: string) => api.get(`/complaints/${id}/refunds`),
  createRefund: (id: string, data: RequestBody) =>
    api.post(`/complaints/${id}/refunds`, data),
  getQrCode: (machineId: string) => api.get(`/complaints/qr/${machineId}`),
  submitPublic: (data: FormData) =>
    api.post("/complaints/public", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// === Contractors ===

export const contractorsApi = {
  getAll: (params?: QueryParams) => api.get("/contractors", { params }),
  getById: (id: string) => api.get(`/contractors/${id}`),
  create: (data: RequestBody) => api.post("/contractors", data),
  update: (id: string, data: RequestBody) =>
    api.put(`/contractors/${id}`, data),
  delete: (id: string) => api.delete(`/contractors/${id}`),
  getStats: () => api.get("/contractors/stats"),
  getByServiceType: (serviceType: string) =>
    api.get(`/contractors/by-service/${serviceType}`),
  getInvoices: (contractorId: string, params?: QueryParams) =>
    api.get(`/contractors/${contractorId}/invoices`, { params }),
  getInvoice: (contractorId: string, invoiceId: string) =>
    api.get(`/contractors/${contractorId}/invoices/${invoiceId}`),
  createInvoice: (contractorId: string, data: RequestBody) =>
    api.post(`/contractors/${contractorId}/invoices`, data),
  updateInvoice: (contractorId: string, invoiceId: string, data: RequestBody) =>
    api.put(`/contractors/${contractorId}/invoices/${invoiceId}`, data),
  deleteInvoice: (contractorId: string, invoiceId: string) =>
    api.delete(`/contractors/${contractorId}/invoices/${invoiceId}`),
  approveInvoice: (contractorId: string, invoiceId: string) =>
    api.post(`/contractors/${contractorId}/invoices/${invoiceId}/approve`),
  payInvoice: (contractorId: string, invoiceId: string, data: RequestBody) =>
    api.post(`/contractors/${contractorId}/invoices/${invoiceId}/pay`, data),
};

// === Maintenance ===

export const maintenanceApi = {
  getAll: (params?: QueryParams) => api.get("/maintenance", { params }),
  getById: (id: string) => api.get(`/maintenance/${id}`),
  create: (data: RequestBody) => api.post("/maintenance", data),
  update: (id: string, data: RequestBody) =>
    api.put(`/maintenance/${id}`, data),
  delete: (id: string) => api.delete(`/maintenance/${id}`),
  submit: (id: string) => api.post(`/maintenance/${id}/submit`),
  approve: (id: string) => api.post(`/maintenance/${id}/approve`),
  reject: (id: string, data: RequestBody) =>
    api.post(`/maintenance/${id}/reject`, data),
  assign: (id: string, data: RequestBody) =>
    api.post(`/maintenance/${id}/assign`, data),
  start: (id: string) => api.post(`/maintenance/${id}/start`),
  awaitingParts: (id: string) => api.post(`/maintenance/${id}/awaiting-parts`),
  complete: (id: string, data?: RequestBody) =>
    api.post(`/maintenance/${id}/complete`, data),
  verify: (id: string) => api.post(`/maintenance/${id}/verify`),
  cancel: (id: string, data?: RequestBody) =>
    api.post(`/maintenance/${id}/cancel`, data),
  getParts: (id: string) => api.get(`/maintenance/${id}/parts`),
  addPart: (id: string, data: RequestBody) =>
    api.post(`/maintenance/${id}/parts`, data),
  updatePart: (id: string, partId: string, data: RequestBody) =>
    api.put(`/maintenance/${id}/parts/${partId}`, data),
  removePart: (id: string, partId: string) =>
    api.delete(`/maintenance/${id}/parts/${partId}`),
  getWorkLogs: (id: string) => api.get(`/maintenance/${id}/work-logs`),
  addWorkLog: (id: string, data: RequestBody) =>
    api.post(`/maintenance/${id}/work-logs`, data),
  getSchedules: (params?: QueryParams) =>
    api.get("/maintenance/schedules", { params }),
  createSchedule: (data: RequestBody) =>
    api.post("/maintenance/schedules", data),
  updateSchedule: (scheduleId: string, data: RequestBody) =>
    api.put(`/maintenance/schedules/${scheduleId}`, data),
  deleteSchedule: (scheduleId: string) =>
    api.delete(`/maintenance/schedules/${scheduleId}`),
};

// === Material Requests ===

export const materialRequestsApi = {
  getAll: (params?: QueryParams) => api.get("/material-requests", { params }),
  getById: (id: string) => api.get(`/material-requests/${id}`),
  create: (data: RequestBody) => api.post("/material-requests", data),
  update: (id: string, data: RequestBody) =>
    api.put(`/material-requests/${id}`, data),
  delete: (id: string) => api.delete(`/material-requests/${id}`),
  submit: (id: string) => api.post(`/material-requests/${id}/submit`),
  approve: (id: string, data?: RequestBody) =>
    api.post(`/material-requests/${id}/approve`, data),
  reject: (id: string, data: RequestBody) =>
    api.post(`/material-requests/${id}/reject`, data),
  send: (id: string) => api.post(`/material-requests/${id}/send`),
  markPayment: (id: string, data: RequestBody) =>
    api.post(`/material-requests/${id}/payment`, data),
  markDelivery: (id: string, data: RequestBody) =>
    api.post(`/material-requests/${id}/delivery`, data),
  complete: (id: string) => api.post(`/material-requests/${id}/complete`),
  cancel: (id: string, data?: RequestBody) =>
    api.post(`/material-requests/${id}/cancel`, data),
  returnToDraft: (id: string) =>
    api.post(`/material-requests/${id}/return-to-draft`),
  getHistory: (id: string) => api.get(`/material-requests/${id}/history`),
};

// === Work Logs ===

export const workLogsApi = {
  getAll: (params?: QueryParams) => api.get("/work-logs", { params }),
  getById: (id: string) => api.get(`/work-logs/${id}`),
  create: (data: RequestBody) => api.post("/work-logs", data),
  update: (id: string, data: RequestBody) => api.put(`/work-logs/${id}`, data),
  delete: (id: string) => api.delete(`/work-logs/${id}`),
  submit: (id: string) => api.post(`/work-logs/${id}/submit`),
  approve: (id: string) => api.post(`/work-logs/${id}/approve`),
  reject: (id: string, data?: RequestBody) =>
    api.post(`/work-logs/${id}/reject`, data),
  bulkApprove: (data: RequestBody) => api.post("/work-logs/bulk-approve", data),
  clockIn: (data: RequestBody) => api.post("/work-logs/clock-in", data),
  clockOut: (data?: RequestBody) => api.post("/work-logs/clock-out", data),
  getTimeOff: (params?: QueryParams) =>
    api.get("/work-logs/time-off", { params }),
  getTimeOffById: (id: string) => api.get(`/work-logs/time-off/${id}`),
  createTimeOff: (data: RequestBody) => api.post("/work-logs/time-off", data),
  updateTimeOff: (id: string, data: RequestBody) =>
    api.put(`/work-logs/time-off/${id}`, data),
  deleteTimeOff: (id: string) => api.delete(`/work-logs/time-off/${id}`),
  approveTimeOff: (id: string) => api.post(`/work-logs/time-off/${id}/approve`),
  rejectTimeOff: (id: string, data?: RequestBody) =>
    api.post(`/work-logs/time-off/${id}/reject`, data),
  getTimesheets: (params?: QueryParams) =>
    api.get("/work-logs/timesheets", { params }),
  getTimesheetById: (id: string) => api.get(`/work-logs/timesheets/${id}`),
  createTimesheet: (data: RequestBody) =>
    api.post("/work-logs/timesheets", data),
  submitTimesheet: (id: string) =>
    api.post(`/work-logs/timesheets/${id}/submit`),
  approveTimesheet: (id: string) =>
    api.post(`/work-logs/timesheets/${id}/approve`),
  rejectTimesheet: (id: string, data?: RequestBody) =>
    api.post(`/work-logs/timesheets/${id}/reject`, data),
};

// === Machine Templates ===

export const machineTemplatesApi = {
  getAll: () => api.get("/machine-templates").then((r) => r.data),
  getActive: () => api.get("/machine-templates/active").then((r) => r.data),
  getById: (id: string) =>
    api.get(`/machine-templates/${id}`).then((r) => r.data),
  create: (data: RequestBody) =>
    api.post("/machine-templates", data).then((r) => r.data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/machine-templates/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    api.delete(`/machine-templates/${id}`).then((r) => r.data),
  createMachineFromTemplate: (data: RequestBody) =>
    api.post("/machine-templates/create-machine", data).then((r) => r.data),
};

// === Route Analytics (was Trip Analytics) ===

export const routeAnalyticsApi = {
  getMain: (params?: QueryParams) =>
    api.get("/routes/analytics/main", { params }),
  getActivity: (params?: QueryParams) =>
    api.get("/routes/analytics/activity", { params }),
  getEmployees: (params?: QueryParams) =>
    api.get("/routes/analytics/employees", { params }),
  getVehicles: (params?: QueryParams) =>
    api.get("/routes/analytics/vehicles", { params }),
  getAnomalies: (params?: QueryParams) =>
    api.get("/routes/analytics/anomalies", { params }),
  getTaxi: (params?: QueryParams) =>
    api.get("/routes/analytics/taxi", { params }),
};
