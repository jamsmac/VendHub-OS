import { api, type QueryParams, type RequestBody } from "./client";

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
