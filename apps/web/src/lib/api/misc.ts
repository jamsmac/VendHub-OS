import { api, type QueryParams, type RequestBody } from "./client";

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

export const analyticsApi = {
  getSnapshots: (params?: QueryParams) =>
    api.get("/analytics/snapshots", { params }),
  getSnapshotById: (id: string) => api.get(`/analytics/snapshots/${id}`),
  rebuildSnapshot: (data: RequestBody) =>
    api.post("/analytics/snapshots/rebuild", data),
  getDailyStats: (params?: QueryParams) =>
    api.get("/analytics/daily-stats", { params }),
  rebuildDailyStats: (data: RequestBody) =>
    api.post("/analytics/daily-stats/rebuild", data),
  getDashboard: () => api.get("/analytics/dashboard"),
};

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

export const clientApi = {
  getClients: (params?: QueryParams) =>
    api.get("/client/admin/users", { params }),
  getClient: (id: string) => api.get(`/client/admin/users/${id}`),
  getOrders: (params?: QueryParams) =>
    api.get("/client/admin/orders", { params }),
  getWallets: (params?: QueryParams) =>
    api.get("/client/admin/wallets", { params }),
};

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
