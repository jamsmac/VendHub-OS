import { api, type QueryParams, type RequestBody } from "./client";

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
