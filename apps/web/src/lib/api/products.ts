import { api, type QueryParams, type RequestBody } from "./client";

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

export const batchMovementsApi = {
  create: (data: RequestBody) => api.post("/batch-movements", data),
  getBatchHistory: (batchId: string) =>
    api.get(`/batch-movements/batch/${batchId}`),
  getContainerMovements: (containerId: string) =>
    api.get(`/batch-movements/container/${containerId}`),
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
