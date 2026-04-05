import { api, type QueryParams, type RequestBody } from "./client";

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
