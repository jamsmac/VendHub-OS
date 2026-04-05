import { api, type QueryParams, type RequestBody } from "./client";

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

export const tripsApi = {
  getAll: (params?: QueryParams) => api.get("/trips", { params }),
  getById: (id: string) => api.get(`/trips/${id}`),
  getActive: () => api.get("/trips/active"),
  start: (data: RequestBody) => api.post("/trips/start", data),
  end: (id: string, data?: RequestBody) => api.post(`/trips/${id}/end`, data),
  cancel: (id: string, data?: RequestBody) =>
    api.post(`/trips/${id}/cancel`, data),
  getRoute: (id: string) => api.get(`/trips/${id}/route`),
  getStops: (id: string) => api.get(`/trips/${id}/stops`),
  getAnomalies: (id: string) => api.get(`/trips/${id}/anomalies`),
  getTasks: (id: string) => api.get(`/trips/${id}/tasks`),
  linkTask: (id: string, data: RequestBody) =>
    api.post(`/trips/${id}/tasks`, data),
  completeTask: (tripId: string, taskId: string, data?: RequestBody) =>
    api.post(`/trips/${tripId}/tasks/${taskId}/complete`, data),
  getUnresolvedAnomalies: (params?: QueryParams) =>
    api.get("/trips/anomalies/unresolved", { params }),
  resolveAnomaly: (id: string, data: RequestBody) =>
    api.post(`/trips/anomalies/${id}/resolve`, data),
  getEmployeeAnalytics: (params?: QueryParams) =>
    api.get("/trips/analytics/employee", { params }),
  getMachineAnalytics: (params?: QueryParams) =>
    api.get("/trips/analytics/machines", { params }),
  getSummaryAnalytics: (params?: QueryParams) =>
    api.get("/trips/analytics/summary", { params }),
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

export const tripAnalyticsApi = {
  getMain: (params?: QueryParams) =>
    api.get("/analytics/trips/dashboard/main", { params }),
  getActivity: (params?: QueryParams) =>
    api.get("/analytics/trips/dashboard/activity", { params }),
  getEmployees: (params?: QueryParams) =>
    api.get("/analytics/trips/dashboard/employees", { params }),
  getVehicles: (params?: QueryParams) =>
    api.get("/analytics/trips/dashboard/vehicles", { params }),
  getAnomalies: (params?: QueryParams) =>
    api.get("/analytics/trips/dashboard/anomalies", { params }),
  getTaxi: (params?: QueryParams) =>
    api.get("/analytics/trips/dashboard/taxi", { params }),
};
