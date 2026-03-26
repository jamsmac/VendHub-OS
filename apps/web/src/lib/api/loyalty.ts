import { api, type QueryParams, type RequestBody } from "./client";

export const loyaltyApi = {
  // Admin endpoints
  getStats: (params?: QueryParams) =>
    api.get("/loyalty/admin/stats", { params }),
  adjustPoints: (data: RequestBody) => api.post("/loyalty/admin/adjust", data),
  getExpiringPoints: (days?: number) =>
    api.get("/loyalty/admin/expiring", { params: { days } }),
  // User-facing (admin viewing)
  getBalance: () => api.get("/loyalty/balance"),
  getHistory: (params?: QueryParams) => api.get("/loyalty/history", { params }),
  getLevels: () => api.get("/loyalty/levels"),
  getLevelsInfo: () => api.get("/loyalty/levels/info"),
  getLeaderboard: (params?: QueryParams) =>
    api.get("/loyalty/leaderboard", { params }),
};

export const achievementsApi = {
  // Admin CRUD
  getAll: (params?: QueryParams) => api.get("/achievements", { params }),
  getById: (id: string) => api.get(`/achievements/${id}`),
  create: (data: RequestBody) => api.post("/achievements", data),
  update: (id: string, data: RequestBody) =>
    api.put(`/achievements/${id}`, data),
  delete: (id: string) => api.delete(`/achievements/${id}`),
  getStats: (params?: QueryParams) =>
    api.get("/achievements/stats", { params }),
  seed: () => api.post("/achievements/seed"),
  // User-facing
  getMy: () => api.get("/achievements/my"),
  getMyAll: () => api.get("/achievements/my/all"),
  claim: (userAchievementId: string) =>
    api.post(`/achievements/my/${userAchievementId}/claim`),
  claimAll: () => api.post("/achievements/my/claim-all"),
};

export const questsApi = {
  // Admin CRUD
  getAll: (params?: QueryParams) => api.get("/quests", { params }),
  getById: (id: string) => api.get(`/quests/${id}`),
  create: (data: RequestBody) => api.post("/quests", data),
  update: (id: string, data: RequestBody) => api.put(`/quests/${id}`, data),
  delete: (id: string) => api.delete(`/quests/${id}`),
  getStats: (params?: QueryParams) => api.get("/quests/stats", { params }),
  // User-facing
  getMy: () => api.get("/quests/my"),
  getMyQuest: (userQuestId: string) => api.get(`/quests/my/${userQuestId}`),
  claim: (userQuestId: string) => api.post(`/quests/my/${userQuestId}/claim`),
  claimAll: () => api.post("/quests/my/claim-all"),
};

export const promoCodesApi = {
  getAll: (params?: QueryParams) => api.get("/promo-codes", { params }),
  getById: (id: string) => api.get(`/promo-codes/${id}`),
  create: (data: RequestBody) => api.post("/promo-codes", data),
  update: (id: string, data: RequestBody) =>
    api.patch(`/promo-codes/${id}`, data),
  deactivate: (id: string) => api.post(`/promo-codes/${id}/deactivate`),
  getRedemptions: (id: string, params?: QueryParams) =>
    api.get(`/promo-codes/${id}/redemptions`, { params }),
  getStats: (id: string) => api.get(`/promo-codes/${id}/stats`),
};
