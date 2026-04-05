import { api, type QueryParams, type RequestBody } from "./client";

export const usersApi = {
  getAll: (params?: QueryParams) => api.get("/users", { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: RequestBody) => api.post("/users", data),
  update: (id: string, data: RequestBody) => api.patch(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const organizationsApi = {
  getAll: (params?: QueryParams) =>
    api.get("/organizations", { params }).then((r) => r.data),
  getById: (id: string) => api.get(`/organizations/${id}`).then((r) => r.data),
  create: (data: RequestBody) =>
    api.post("/organizations", data).then((r) => r.data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/organizations/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/organizations/${id}`),
};

export const invitesApi = {
  create: (data: RequestBody) => api.post("/invites", data),
  getAll: (params?: QueryParams) => api.get("/invites", { params }),
  getById: (id: string) => api.get(`/invites/${id}`),
  validate: (code: string) => api.get(`/invites/validate/${code}`),
  revoke: (id: string) => api.delete(`/invites/${id}`),
  registerWithInvite: (data: RequestBody) =>
    api.post("/auth/register/invite", data),
};
