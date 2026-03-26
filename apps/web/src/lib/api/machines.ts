import { api, type QueryParams, type RequestBody } from "./client";

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
  getErrors: (id: string) => api.get(`/machines/${id}/errors`),
  getState: (id: string) => api.get(`/machines/${id}/state`),
  getPnL: (id: string, from: string, to: string) =>
    api.get(`/machines/${id}/pnl`, { params: { from, to } }),
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

export const containersApi = {
  getAll: (params?: QueryParams) => api.get("/containers", { params }),
  getById: (id: string) => api.get(`/containers/${id}`),
  getByMachine: (machineId: string) =>
    api.get(`/containers/machine/${machineId}`),
  create: (data: RequestBody) => api.post("/containers", data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/containers/${id}`, data),
  refill: (id: string, data: RequestBody) =>
    api.post(`/containers/${id}/refill`, data),
  delete: (id: string) => api.delete(`/containers/${id}`),
};
