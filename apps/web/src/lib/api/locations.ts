import { api, type QueryParams, type RequestBody } from "./client";

export const locationsApi = {
  getAll: () => api.get("/locations"),
  getById: (id: string) => api.get(`/locations/${id}`),
  getNearby: (lat: number, lng: number, radius?: number) =>
    api.get("/locations/nearby", { params: { lat, lng, radius } }),
  create: (data: RequestBody) => api.post("/locations", data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/locations/${id}`, data),
  delete: (id: string) => api.delete(`/locations/${id}`),
};
