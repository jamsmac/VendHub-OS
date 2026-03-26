import { api, type QueryParams, type RequestBody } from "./client";

export const settingsApi = {
  getAll: (params?: QueryParams) => api.get("/settings", { params }),
  getPublic: () => api.get("/settings/public"),
  getByKey: (key: string) => api.get(`/settings/${key}`),
  create: (data: RequestBody) => api.post("/settings", data),
  update: (key: string, data: RequestBody) =>
    api.patch(`/settings/${key}`, data),
  delete: (key: string) => api.delete(`/settings/${key}`),
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

export const entityEventsApi = {
  query: (params?: QueryParams) => api.get("/entity-events", { params }),
  getTimeline: (entityId: string, params?: QueryParams) =>
    api.get(`/entity-events/entity/${entityId}`, { params }),
  getRecent: (entityId: string, count?: number) =>
    api.get(`/entity-events/entity/${entityId}/recent`, { params: { count } }),
  create: (data: RequestBody) => api.post("/entity-events", data),
};
