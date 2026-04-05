import { api, type QueryParams, type RequestBody } from "./client";

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

export const paymentsApi = {
  getTransactions: (params?: QueryParams) =>
    api.get("/payments/transactions", { params }),
  getTransaction: (id: string) => api.get(`/payments/transactions/${id}`),
  getTransactionStats: () => api.get("/payments/transactions/stats"),
  initiateRefund: (data: RequestBody) => api.post("/payments/refund", data),
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
