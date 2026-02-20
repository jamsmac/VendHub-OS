import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor - handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying, try to refresh token
    if (typeof window !== 'undefined' && error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API methods
export const authApi = {
  login: (email: string, password: string, twoFactorCode?: string) =>
    api.post('/auth/login', { email, password, twoFactorCode }),
  register: (data: any) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  enable2FA: () => api.post('/auth/2fa/enable'),
  verify2FA: (code: string) => api.post('/auth/2fa/verify', { code }),
  forgotPassword: (email: string) => api.post('/auth/password/forgot', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/password/reset', { token, password }),
  getPasswordRequirements: () => api.get('/auth/password/requirements'),
};

export const machinesApi = {
  getAll: (params?: any) => api.get('/machines', { params }),
  getById: (id: string) => api.get(`/machines/${id}`),
  create: (data: any) => api.post('/machines', data),
  update: (id: string, data: any) => api.patch(`/machines/${id}`, data),
  delete: (id: string) => api.delete(`/machines/${id}`),
  getStats: () => api.get('/machines/stats'),
  getMap: () => api.get('/machines/map'),
  getSlots: (id: string) => api.get(`/machines/${id}/slots`),
  createSlot: (id: string, data: any) => api.post(`/machines/${id}/slots`, data),
  updateSlot: (id: string, slotId: string, data: any) => api.patch(`/machines/${id}/slots/${slotId}`, data),
  refillSlot: (id: string, slotId: string, data: any) => api.post(`/machines/${id}/slots/${slotId}/refill`, data),
  moveToLocation: (id: string, data: any) => api.post(`/machines/${id}/move`, data),
  getLocationHistory: (id: string) => api.get(`/machines/${id}/location-history`),
  getComponents: (id: string) => api.get(`/machines/${id}/components`),
  getErrors: (id: string) => api.get(`/machines/${id}/errors`),
};

export const productsApi = {
  getAll: (params?: any) => api.get('/products', { params }),
  getById: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.patch(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  getRecipes: (productId: string) => api.get(`/products/${productId}/recipes`),
  createRecipe: (productId: string, data: any) => api.post(`/products/${productId}/recipes`, data),
  updateRecipe: (productId: string, recipeId: string, data: any) => api.patch(`/products/${productId}/recipes/${recipeId}`, data),
  deleteRecipe: (productId: string, recipeId: string) => api.delete(`/products/${productId}/recipes/${recipeId}`),
  getBatches: (productId: string) => api.get(`/products/${productId}/batches`),
  createBatch: (productId: string, data: any) => api.post(`/products/${productId}/batches`, data),
  getPriceHistory: (productId: string) => api.get(`/products/${productId}/price-history`),
  updatePrice: (productId: string, data: any) => api.post(`/products/${productId}/update-price`, data),
};

export const inventoryApi = {
  getWarehouse: () => api.get('/inventory/warehouse'),
  getOperator: (operatorId?: string) => api.get('/inventory/operator', { params: { operatorId } }),
  getMachine: (machineId: string) => api.get('/inventory/machine', { params: { machineId } }),
  getLowStock: () => api.get('/inventory/low-stock'),
  transfer: (data: any) => api.post('/inventory/transfer', data),
  getMovements: (params?: any) => api.get('/inventory/movements', { params }),
};

export const tasksApi = {
  getAll: (params?: any) => api.get('/tasks', { params }),
  getMy: () => api.get('/tasks/my'),
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  update: (id: string, data: any) => api.patch(`/tasks/${id}`, data),
  start: (id: string) => api.post(`/tasks/${id}/start`),
  uploadPhotoBefore: (id: string, data: any) => api.post(`/tasks/${id}/photo-before`, data),
  uploadPhotoAfter: (id: string, data: any) => api.post(`/tasks/${id}/photo-after`, data),
  complete: (id: string, data: any) => api.post(`/tasks/${id}/complete`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  getKanban: () => api.get('/tasks/kanban'),
  assign: (id: string, data: any) => api.post(`/tasks/${id}/assign`, data),
  postpone: (id: string, data: any) => api.post(`/tasks/${id}/postpone`, data),
  reject: (id: string, data: any) => api.post(`/tasks/${id}/reject`, data),
  cancel: (id: string) => api.post(`/tasks/${id}/cancel`),
  getItems: (id: string) => api.get(`/tasks/${id}/items`),
  addItem: (id: string, data: any) => api.post(`/tasks/${id}/items`, data),
  getComments: (id: string) => api.get(`/tasks/${id}/comments`),
  addComment: (id: string, data: any) => api.post(`/tasks/${id}/comments`, data),
  getPhotos: (id: string) => api.get(`/tasks/${id}/photos`),
};

export const usersApi = {
  getAll: () => api.get('/users'),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const locationsApi = {
  getAll: () => api.get('/locations'),
  getById: (id: string) => api.get(`/locations/${id}`),
  getNearby: (lat: number, lng: number, radius?: number) =>
    api.get('/locations/nearby', { params: { lat, lng, radius } }),
  create: (data: any) => api.post('/locations', data),
  update: (id: string, data: any) => api.patch(`/locations/${id}`, data),
  delete: (id: string) => api.delete(`/locations/${id}`),
};

export const integrationsApi = {
  getAll: (params?: Record<string, any>) => api.get('/integrations', { params }),
  getById: (id: string) => api.get(`/integrations/${id}`),
  getTemplates: () => api.get('/integrations/templates/all'),
  create: (data: any) => api.post('/integrations', data),
  update: (id: string, data: any) => api.put(`/integrations/${id}`, data),
  updateConfig: (id: string, config: any) => api.patch(`/integrations/${id}/config`, config),
  updateStatus: (id: string, status: string) => api.patch(`/integrations/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/integrations/${id}`),
  test: (id: string) => api.post(`/integrations/${id}/test`),
};

export const reportsApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  getSales: (params?: any) => api.get('/reports/sales', { params }),
  getInventory: () => api.get('/reports/inventory'),
  getTasks: (params?: any) => api.get('/reports/tasks', { params }),
  getFinancial: (params?: any) => api.get('/reports/financial', { params }),
};

export const equipmentApi = {
  getAll: (params?: any) => api.get('/equipment', { params }),
  getById: (id: string) => api.get(`/equipment/${id}`),
  create: (data: any) => api.post('/equipment', data),
  update: (id: string, data: any) => api.put(`/equipment/${id}`, data),
  delete: (id: string) => api.delete(`/equipment/${id}`),
  addMaintenance: (data: any) => api.post('/equipment/maintenance', data),
  getMaintenanceHistory: (params?: any) => api.get('/equipment/maintenance/history', { params }),
  addMovement: (data: any) => api.post('/equipment/movements', data),
  getMovements: (params?: any) => api.get('/equipment/movements/history', { params }),
};

export const hopperTypesApi = {
  getAll: (params?: any) => api.get('/hopper-types', { params }),
  getById: (id: string) => api.get(`/hopper-types/${id}`),
  create: (data: any) => api.post('/hopper-types', data),
  update: (id: string, data: any) => api.put(`/hopper-types/${id}`, data),
  delete: (id: string) => api.delete(`/hopper-types/${id}`),
};

export const sparePartsApi = {
  getAll: (params?: any) => api.get('/spare-parts', { params }),
  getById: (id: string) => api.get(`/spare-parts/${id}`),
  create: (data: any) => api.post('/spare-parts', data),
  update: (id: string, data: any) => api.put(`/spare-parts/${id}`, data),
  delete: (id: string) => api.delete(`/spare-parts/${id}`),
  adjustQuantity: (id: string, data: any) => api.patch(`/spare-parts/${id}/quantity`, data),
};

export const washingSchedulesApi = {
  getAll: (params?: any) => api.get('/washing-schedules', { params }),
  getById: (id: string) => api.get(`/washing-schedules/${id}`),
  create: (data: any) => api.post('/washing-schedules', data),
  update: (id: string, data: any) => api.put(`/washing-schedules/${id}`, data),
  delete: (id: string) => api.delete(`/washing-schedules/${id}`),
  complete: (id: string) => api.post(`/washing-schedules/${id}/complete`),
};

export const warehouseApi = {
  getAll: (params?: any) => api.get('/warehouses', { params }),
  getById: (id: string) => api.get(`/warehouses/${id}`),
  create: (data: any) => api.post('/warehouses', data),
  update: (id: string, data: any) => api.patch(`/warehouses/${id}`, data),
  delete: (id: string) => api.delete(`/warehouses/${id}`),
  getStock: (id: string) => api.get(`/warehouses/${id}/stock`),
  getMovements: (id: string, params?: any) => api.get(`/warehouses/${id}/movements`, { params }),
  createMovement: (id: string, data: any) => api.post(`/warehouses/${id}/movements`, data),
  transfer: (id: string, data: any) => api.post(`/warehouses/${id}/transfer`, data),
  getBatches: (id: string, params?: any) => api.get(`/warehouses/${id}/batches`, { params }),
  createBatch: (id: string, data: any) => api.post(`/warehouses/${id}/batches`, data),
};

export const tripsApi = {
  getAll: (params?: any) => api.get('/trips', { params }),
  getById: (id: string) => api.get(`/trips/${id}`),
  getActive: () => api.get('/trips/active'),
  start: (data: any) => api.post('/trips/start', data),
  end: (id: string, data?: any) => api.post(`/trips/${id}/end`, data),
  cancel: (id: string, data?: any) => api.post(`/trips/${id}/cancel`, data),
  getRoute: (id: string) => api.get(`/trips/${id}/route`),
  getStops: (id: string) => api.get(`/trips/${id}/stops`),
  getAnomalies: (id: string) => api.get(`/trips/${id}/anomalies`),
  getTasks: (id: string) => api.get(`/trips/${id}/tasks`),
  linkTask: (id: string, data: any) => api.post(`/trips/${id}/tasks`, data),
  completeTask: (tripId: string, taskId: string, data?: any) => api.post(`/trips/${tripId}/tasks/${taskId}/complete`, data),
  getUnresolvedAnomalies: (params?: any) => api.get('/trips/anomalies/unresolved', { params }),
  resolveAnomaly: (id: string, data: any) => api.post(`/trips/anomalies/${id}/resolve`, data),
  getEmployeeAnalytics: (params?: any) => api.get('/trips/analytics/employee', { params }),
  getMachineAnalytics: (params?: any) => api.get('/trips/analytics/machines', { params }),
  getSummaryAnalytics: (params?: any) => api.get('/trips/analytics/summary', { params }),
};

export const routesApi = {
  getAll: (params?: any) => api.get('/routes', { params }),
  getById: (id: string) => api.get(`/routes/${id}`),
  create: (data: any) => api.post('/routes', data),
  update: (id: string, data: any) => api.patch(`/routes/${id}`, data),
  delete: (id: string) => api.delete(`/routes/${id}`),
  start: (id: string) => api.post(`/routes/${id}/start`),
  complete: (id: string, data?: any) => api.post(`/routes/${id}/complete`, data),
  optimize: (id: string) => api.post(`/routes/${id}/optimize`),
  getStops: (id: string) => api.get(`/routes/${id}/stops`),
  addStop: (id: string, data: any) => api.post(`/routes/${id}/stops`, data),
  updateStop: (id: string, stopId: string, data: any) => api.patch(`/routes/${id}/stops/${stopId}`, data),
  removeStop: (id: string, stopId: string) => api.delete(`/routes/${id}/stops/${stopId}`),
  reorderStops: (id: string, data: any) => api.post(`/routes/${id}/stops/reorder`, data),
};

export const incidentsApi = {
  getAll: (params?: any) => api.get('/incidents', { params }),
  getById: (id: string) => api.get(`/incidents/${id}`),
  create: (data: any) => api.post('/incidents', data),
  update: (id: string, data: any) => api.patch(`/incidents/${id}`, data),
  delete: (id: string) => api.delete(`/incidents/${id}`),
  assign: (id: string, data: any) => api.post(`/incidents/${id}/assign`, data),
  resolve: (id: string, data: any) => api.post(`/incidents/${id}/resolve`, data),
  close: (id: string) => api.post(`/incidents/${id}/close`),
  getStatistics: (params?: any) => api.get('/incidents/statistics', { params }),
  getByMachine: (machineId: string) => api.get(`/incidents/machine/${machineId}`),
};

export const alertsApi = {
  getRules: (params?: any) => api.get('/alerts/rules', { params }),
  getRuleById: (id: string) => api.get(`/alerts/rules/${id}`),
  createRule: (data: any) => api.post('/alerts/rules', data),
  updateRule: (id: string, data: any) => api.put(`/alerts/rules/${id}`, data),
  deleteRule: (id: string) => api.delete(`/alerts/rules/${id}`),
  getHistory: (params?: any) => api.get('/alerts/history', { params }),
  getActive: () => api.get('/alerts/active'),
  acknowledge: (id: string, data?: any) => api.post(`/alerts/${id}/acknowledge`, data),
  resolve: (id: string, data?: any) => api.post(`/alerts/${id}/resolve`, data),
  dismiss: (id: string, data?: any) => api.post(`/alerts/${id}/dismiss`, data),
};

export const machineAccessApi = {
  getAll: (params?: any) => api.get('/machine-access', { params }),
  getById: (id: string) => api.get(`/machine-access/${id}`),
  grant: (data: any) => api.post('/machine-access', data),
  revoke: (data: any) => api.post('/machine-access/revoke', data),
  delete: (id: string) => api.delete(`/machine-access/${id}`),
  getByMachine: (machineId: string) => api.get(`/machine-access/machine/${machineId}`),
  getByUser: (userId: string) => api.get(`/machine-access/user/${userId}`),
  getTemplates: () => api.get('/machine-access/templates/list'),
  createTemplate: (data: any) => api.post('/machine-access/templates', data),
  applyTemplate: (data: any) => api.post('/machine-access/templates/apply', data),
};

export const operatorRatingsApi = {
  getAll: (params?: any) => api.get('/operator-ratings', { params }),
  getById: (id: string) => api.get(`/operator-ratings/${id}`),
  calculate: (data: any) => api.post('/operator-ratings/calculate', data),
  recalculate: (id: string, data: any) => api.post(`/operator-ratings/recalculate/${id}`, data),
  delete: (id: string) => api.delete(`/operator-ratings/${id}`),
  getLeaderboard: (params: any) => api.get('/operator-ratings/leaderboard', { params }),
  getSummary: (params: any) => api.get('/operator-ratings/summary', { params }),
  getOperatorHistory: (userId: string, params?: any) => api.get(`/operator-ratings/operator/${userId}`, { params }),
};

// === Phase 3: Transactions & Finance ===

export const transactionsApi = {
  getAll: (params?: any) => api.get('/transactions', { params }),
  getById: (id: string) => api.get(`/transactions/${id}`),
  getCollections: (params?: any) => api.get('/transactions/collections', { params }),
  createCollection: (data: any) => api.post('/transactions/collections', data),
  verifyCollection: (id: string, data: any) => api.patch(`/transactions/collections/${id}/verify`, data),
  getDailySummaries: (params?: any) => api.get('/transactions/daily-summaries', { params }),
  rebuildDailySummary: (data: any) => api.post('/transactions/daily-summaries/rebuild', data),
  getCommissions: (params?: any) => api.get('/transactions/commissions', { params }),
};

export const reconciliationApi = {
  getRuns: (params?: any) => api.get('/reconciliation/runs', { params }),
  getRunById: (id: string) => api.get(`/reconciliation/runs/${id}`),
  createRun: (data: any) => api.post('/reconciliation/runs', data),
  deleteRun: (id: string) => api.delete(`/reconciliation/runs/${id}`),
  getMismatches: (runId: string, params?: any) => api.get(`/reconciliation/runs/${runId}/mismatches`, { params }),
  resolveMismatch: (id: string, data: any) => api.patch(`/reconciliation/mismatches/${id}/resolve`, data),
  importHwSales: (data: any) => api.post('/reconciliation/import', data),
};

export const billingApi = {
  getInvoices: (params?: any) => api.get('/billing/invoices', { params }),
  getInvoiceById: (id: string) => api.get(`/billing/invoices/${id}`),
  createInvoice: (data: any) => api.post('/billing/invoices', data),
  updateInvoice: (id: string, data: any) => api.patch(`/billing/invoices/${id}`, data),
  sendInvoice: (id: string) => api.post(`/billing/invoices/${id}/send`),
  cancelInvoice: (id: string) => api.post(`/billing/invoices/${id}/cancel`),
  deleteInvoice: (id: string) => api.delete(`/billing/invoices/${id}`),
  getInvoiceStats: () => api.get('/billing/invoices/stats'),
  recordPayment: (invoiceId: string, data: any) => api.post(`/billing/invoices/${invoiceId}/payments`, data),
  getPayments: (params?: any) => api.get('/billing/payments', { params }),
};

export const openingBalancesApi = {
  getAll: (params?: any) => api.get('/opening-balances', { params }),
  getById: (id: string) => api.get(`/opening-balances/${id}`),
  create: (data: any) => api.post('/opening-balances', data),
  bulkCreate: (data: any) => api.post('/opening-balances/bulk', data),
  update: (id: string, data: any) => api.patch(`/opening-balances/${id}`, data),
  apply: (id: string) => api.post(`/opening-balances/${id}/apply`),
  applyAll: (data: any) => api.post('/opening-balances/apply-all', data),
  delete: (id: string) => api.delete(`/opening-balances/${id}`),
  getStats: () => api.get('/opening-balances/stats'),
};

export const purchaseHistoryApi = {
  getAll: (params?: any) => api.get('/purchase-history', { params }),
  getById: (id: string) => api.get(`/purchase-history/${id}`),
  create: (data: any) => api.post('/purchase-history', data),
  bulkCreate: (data: any) => api.post('/purchase-history/bulk', data),
  update: (id: string, data: any) => api.patch(`/purchase-history/${id}`, data),
  receive: (id: string, data?: any) => api.post(`/purchase-history/${id}/receive`, data),
  cancel: (id: string) => api.post(`/purchase-history/${id}/cancel`),
  returnPurchase: (id: string, data: any) => api.post(`/purchase-history/${id}/return`, data),
  delete: (id: string) => api.delete(`/purchase-history/${id}`),
  getStats: (params?: any) => api.get('/purchase-history/stats', { params }),
};

export const salesImportApi = {
  getAll: (params?: any) => api.get('/sales-import', { params }),
  getById: (id: string) => api.get(`/sales-import/${id}`),
  create: (data: any) => api.post('/sales-import', data),
  delete: (id: string) => api.delete(`/sales-import/${id}`),
  getStats: () => api.get('/sales-import/stats'),
};

export const auditApi = {
  getLogs: (params?: any) => api.get('/audit/logs', { params }),
  getLogById: (id: string) => api.get(`/audit/logs/${id}`),
  createLog: (data: any) => api.post('/audit/logs', data),
  getEntityHistory: (entityType: string, entityId: string, params?: any) =>
    api.get(`/audit/history/${entityType}/${entityId}`, { params }),
  getStatistics: (params: any) => api.get('/audit/statistics', { params }),
  getSnapshots: (entityType: string, entityId: string) =>
    api.get(`/audit/snapshots/${entityType}/${entityId}`),
  getSnapshotById: (id: string) => api.get(`/audit/snapshots/detail/${id}`),
  createSnapshot: (data: any) => api.post('/audit/snapshots', data),
  getUserSessions: (userId: string, params?: any) =>
    api.get(`/audit/sessions/user/${userId}`, { params }),
  endSession: (sessionId: string, data?: any) =>
    api.post(`/audit/sessions/${sessionId}/end`, data),
  terminateAllSessions: (userId: string, data?: any) =>
    api.post(`/audit/sessions/user/${userId}/terminate-all`, data),
  markSuspicious: (sessionId: string, data: any) =>
    api.post(`/audit/sessions/${sessionId}/suspicious`, data),
  getReports: (params: any) => api.get('/audit/reports', { params }),
  generateReport: (data: any) => api.post('/audit/reports/generate', data),
  cleanupLogs: () => api.post('/audit/cleanup/logs'),
  cleanupSnapshots: () => api.post('/audit/cleanup/snapshots'),
};

export const analyticsApi = {
  getSnapshots: (params?: any) => api.get('/analytics/snapshots', { params }),
  getSnapshotById: (id: string) => api.get(`/analytics/snapshots/${id}`),
  rebuildSnapshot: (data: any) => api.post('/analytics/snapshots/rebuild', data),
  getDailyStats: (params?: any) => api.get('/analytics/daily-stats', { params }),
  rebuildDailyStats: (data: any) => api.post('/analytics/daily-stats/rebuild', data),
  getDashboard: () => api.get('/analytics/dashboard'),
};

export const contractsApi = {
  getAll: (params?: any) => api.get('/contractors/contracts', { params }),
  getById: (id: string) => api.get(`/contractors/contracts/${id}`),
  create: (data: any) => api.post('/contractors/contracts', data),
  update: (id: string, data: any) => api.patch(`/contractors/contracts/${id}`, data),
  activate: (id: string) => api.post(`/contractors/contracts/${id}/activate`),
  suspend: (id: string) => api.post(`/contractors/contracts/${id}/suspend`),
  terminate: (id: string) => api.post(`/contractors/contracts/${id}/terminate`),
  calculateCommission: (id: string, data: any) => api.post(`/contractors/contracts/${id}/commissions/calculate`, data),
  getCommissions: (id: string, params?: any) => api.get(`/contractors/contracts/${id}/commissions`, { params }),
  markCommissionPaid: (commissionId: string) => api.post(`/contractors/contracts/commissions/${commissionId}/paid`),
};

// === Phase 4: Payments ===

export const paymentsApi = {
  getTransactions: (params?: any) => api.get('/payments/transactions', { params }),
  getTransaction: (id: string) => api.get(`/payments/transactions/${id}`),
  getTransactionStats: () => api.get('/payments/transactions/stats'),
  initiateRefund: (data: any) => api.post('/payments/refund', data),
};

// === Phase 4: Import ===

export const importApi = {
  getSessions: (params?: any) => api.get('/import/sessions', { params }),
  getSession: (id: string) => api.get(`/import/sessions/${id}`),
  createSession: (data: FormData) => api.post('/import/sessions', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  classifySession: (id: string) => api.post(`/import/sessions/${id}/classify`),
  validateSession: (id: string) => api.post(`/import/sessions/${id}/validate`),
  approveSession: (id: string) => api.post(`/import/sessions/${id}/approve`),
  rejectSession: (id: string, data: any) => api.post(`/import/sessions/${id}/reject`, data),
  getAuditLog: (id: string, params?: any) => api.get(`/import/sessions/${id}/audit-log`, { params }),
  getSchemas: () => api.get('/import/schemas'),
  getValidationRules: () => api.get('/import/validation-rules'),
};

// === Phase 4: Promo Codes ===

export const promoCodesApi = {
  getAll: (params?: any) => api.get('/promo-codes', { params }),
  getById: (id: string) => api.get(`/promo-codes/${id}`),
  create: (data: any) => api.post('/promo-codes', data),
  update: (id: string, data: any) => api.patch(`/promo-codes/${id}`, data),
  deactivate: (id: string) => api.post(`/promo-codes/${id}/deactivate`),
  getRedemptions: (id: string, params?: any) => api.get(`/promo-codes/${id}/redemptions`, { params }),
  getStats: (id: string) => api.get(`/promo-codes/${id}/stats`),
};

// === Phase 4: Client B2C ===

export const clientApi = {
  getClients: (params?: any) => api.get('/client/admin/users', { params }),
  getClient: (id: string) => api.get(`/client/admin/users/${id}`),
  getOrders: (params?: any) => api.get('/client/admin/orders', { params }),
  getWallets: (params?: any) => api.get('/client/admin/wallets', { params }),
};

// === Phase 4: HR ===

export const hrApi = {
  getDepartments: (params?: any) => api.get('/employees/departments', { params }),
  createDepartment: (data: any) => api.post('/employees/departments', data),
  updateDepartment: (id: string, data: any) => api.put(`/employees/departments/${id}`, data),
  deleteDepartment: (id: string) => api.delete(`/employees/departments/${id}`),
  getPositions: (params?: any) => api.get('/employees/positions', { params }),
  createPosition: (data: any) => api.post('/employees/positions', data),
  updatePosition: (id: string, data: any) => api.put(`/employees/positions/${id}`, data),
  getAttendance: (params?: any) => api.get('/employees/attendance', { params }),
  checkIn: (data: any) => api.post('/employees/attendance/check-in', data),
  checkOut: (data: any) => api.post('/employees/attendance/check-out', data),
  getDailyReport: (params?: any) => api.get('/employees/attendance/daily-report', { params }),
  getLeaveRequests: (params?: any) => api.get('/employees/leave', { params }),
  createLeaveRequest: (data: any) => api.post('/employees/leave', data),
  approveLeave: (id: string) => api.post(`/employees/leave/${id}/approve`),
  rejectLeave: (id: string, data: any) => api.post(`/employees/leave/${id}/reject`, data),
  getLeaveBalance: (employeeId: string) => api.get(`/employees/leave/balance/${employeeId}`),
  getPayrolls: (params?: any) => api.get('/employees/payroll', { params }),
  calculatePayroll: (data: any) => api.post('/employees/payroll/calculate', data),
  approvePayroll: (id: string) => api.post(`/employees/payroll/${id}/approve`),
  payPayroll: (id: string) => api.post(`/employees/payroll/${id}/pay`),
  getPayroll: (id: string) => api.get(`/employees/payroll/${id}`),
  getReviews: (params?: any) => api.get('/employees/reviews', { params }),
  createReview: (data: any) => api.post('/employees/reviews', data),
  submitReview: (id: string, data: any) => api.post(`/employees/reviews/${id}/submit`, data),
  getReview: (id: string) => api.get(`/employees/reviews/${id}`),
};

// === Phase 4: Notifications ===

export const notificationsApi = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  getById: (id: string) => api.get(`/notifications/${id}`),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  subscribePush: (data: any) => api.post('/notifications/push/subscribe', data),
  unsubscribePush: (data: any) => api.delete('/notifications/push/unsubscribe', { data }),
  registerFcm: (data: any) => api.post('/notifications/fcm/register', data),
  unregisterFcm: (data: any) => api.delete('/notifications/fcm/unregister', { data }),
};

// === Master Data (Directories / Справочники) ===

// === Phase 4: Fiscal (MultiKassa) ===

export const fiscalApi = {
  getDevices: (): Promise<import('@/types/fiscal.types').FiscalDevice[]> =>
    api.get('/fiscal/devices').then(r => r.data),
  getDevice: (deviceId: string): Promise<import('@/types/fiscal.types').FiscalDevice> =>
    api.get(`/fiscal/devices/${deviceId}`).then(r => r.data),
  createDevice: (data: import('@/types/fiscal.types').CreateFiscalDeviceRequest): Promise<import('@/types/fiscal.types').FiscalDevice> =>
    api.post('/fiscal/devices', data).then(r => r.data),
  updateDevice: (deviceId: string, data: import('@/types/fiscal.types').UpdateFiscalDeviceRequest): Promise<import('@/types/fiscal.types').FiscalDevice> =>
    api.put(`/fiscal/devices/${deviceId}`, data).then(r => r.data),
  activateDevice: (deviceId: string): Promise<import('@/types/fiscal.types').FiscalDevice> =>
    api.post(`/fiscal/devices/${deviceId}/activate`).then(r => r.data),
  deactivateDevice: (deviceId: string): Promise<import('@/types/fiscal.types').FiscalDevice> =>
    api.post(`/fiscal/devices/${deviceId}/deactivate`).then(r => r.data),
  getDeviceStatistics: (deviceId: string): Promise<import('@/types/fiscal.types').DeviceStatistics> =>
    api.get(`/fiscal/devices/${deviceId}/stats`).then(r => r.data),
  openShift: (deviceId: string, data: import('@/types/fiscal.types').OpenShiftRequest): Promise<import('@/types/fiscal.types').OpenShiftResponse> =>
    api.post(`/fiscal/devices/${deviceId}/shift/open`, data).then(r => r.data),
  closeShift: (deviceId: string): Promise<import('@/types/fiscal.types').CloseShiftResponse> =>
    api.post(`/fiscal/devices/${deviceId}/shift/close`).then(r => r.data),
  getCurrentShift: (deviceId: string): Promise<import('@/types/fiscal.types').FiscalShift | null> =>
    api.get(`/fiscal/devices/${deviceId}/shift/current`).then(r => r.data),
  getShiftHistory: (deviceId: string, limit = 30): Promise<import('@/types/fiscal.types').FiscalShift[]> =>
    api.get(`/fiscal/devices/${deviceId}/shift/history`, { params: { limit } }).then(r => r.data),
  getXReport: (deviceId: string): Promise<import('@/types/fiscal.types').XReportResponse> =>
    api.get(`/fiscal/devices/${deviceId}/shift/x-report`).then(r => r.data),
  createReceipt: (data: import('@/types/fiscal.types').CreateReceiptRequest): Promise<import('@/types/fiscal.types').FiscalReceipt> =>
    api.post('/fiscal/receipts', data).then(r => r.data),
  getReceipt: (receiptId: string): Promise<import('@/types/fiscal.types').FiscalReceipt> =>
    api.get(`/fiscal/receipts/${receiptId}`).then(r => r.data),
  getReceipts: (filters: import('@/types/fiscal.types').FiscalReceiptFilters): Promise<import('@/types/fiscal.types').FiscalReceiptsResponse> =>
    api.get('/fiscal/receipts', { params: filters }).then(r => r.data),
  getQueueItems: (status?: import('@/types/fiscal.types').FiscalQueueStatus): Promise<import('@/types/fiscal.types').FiscalQueueItem[]> =>
    api.get('/fiscal/queue', { params: status ? { status } : undefined }).then(r => r.data),
  retryQueueItem: (queueItemId: string): Promise<void> =>
    api.post(`/fiscal/queue/${queueItemId}/retry`).then(() => undefined),
};

export const directoriesApi = {
  // Directories CRUD
  getAll: (params?: any) => api.get('/directories', { params }),
  getById: (id: string) => api.get(`/directories/${id}`),
  getBySlug: (slug: string) => api.get(`/directories/by-slug/${slug}`),
  create: (data: any) => api.post('/directories', data),
  update: (id: string, data: any) => api.patch(`/directories/${id}`, data),
  delete: (id: string) => api.delete(`/directories/${id}`),

  // Fields CRUD
  addField: (dirId: string, data: any) => api.post(`/directories/${dirId}/fields`, data),
  updateField: (dirId: string, fieldId: string, data: any) => api.patch(`/directories/${dirId}/fields/${fieldId}`, data),
  removeField: (dirId: string, fieldId: string) => api.delete(`/directories/${dirId}/fields/${fieldId}`),

  // Entries CRUD
  getEntries: (dirId: string, params?: any) => api.get(`/directories/${dirId}/entries`, { params }),
  getEntry: (dirId: string, entryId: string) => api.get(`/directories/${dirId}/entries/${entryId}`),
  createEntry: (dirId: string, data: any) => api.post(`/directories/${dirId}/entries`, data),
  updateEntry: (dirId: string, entryId: string, data: any) => api.patch(`/directories/${dirId}/entries/${entryId}`, data),
  deleteEntry: (dirId: string, entryId: string) => api.delete(`/directories/${dirId}/entries/${entryId}`),
  searchEntries: (dirId: string, params: { q: string; limit?: number }) => api.get(`/directories/${dirId}/entries/search`, { params }),
  inlineCreateEntry: (dirId: string, data: any) => api.post(`/directories/${dirId}/entries/inline`, data),

  // Sources CRUD
  getSources: (dirId: string, params?: any) => api.get(`/directories/${dirId}/sources`, { params }),
  getSource: (dirId: string, sourceId: string) => api.get(`/directories/${dirId}/sources/${sourceId}`),
  createSource: (dirId: string, data: any) => api.post(`/directories/${dirId}/sources`, data),
  updateSource: (dirId: string, sourceId: string, data: any) => api.patch(`/directories/${dirId}/sources/${sourceId}`, data),
  deleteSource: (dirId: string, sourceId: string) => api.delete(`/directories/${dirId}/sources/${sourceId}`),
  triggerSync: (dirId: string, sourceId: string) => api.post(`/directories/${dirId}/sources/${sourceId}/sync`),

  // Sync Logs
  getSyncLogs: (dirId: string, params?: any) => api.get(`/directories/${dirId}/sync-logs`, { params }),

  // Hierarchy
  getTree: (dirId: string) => api.get(`/directories/${dirId}/tree`),
  moveEntry: (dirId: string, entryId: string, data: any) => api.post(`/directories/${dirId}/entries/${entryId}/move`, data),

  // Audit
  getAuditLogs: (dirId: string, params?: any) => api.get(`/directories/${dirId}/audit`, { params }),
  getEntryAudit: (dirId: string, entryId: string, params?: any) => api.get(`/directories/${dirId}/entries/${entryId}/audit`, { params }),
};
