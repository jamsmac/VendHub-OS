import { api, type QueryParams, type RequestBody } from "./client";

export const authApi = {
  login: (email: string, password: string, totpCode?: string) =>
    api.post("/auth/login", { email, password, ...(totpCode && { totpCode }) }),
  complete2FA: (challengeToken: string, totpCode: string) =>
    api.post("/auth/2fa/complete", { challengeToken, totpCode }),
  register: (data: RequestBody) => api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
  enable2FA: () => api.post("/auth/2fa/enable"),
  verify2FA: (code: string) => api.post("/auth/2fa/verify", { code }),
  forgotPassword: (email: string) =>
    api.post("/auth/password/forgot", { email }),
  resetPassword: (token: string, password: string) =>
    api.post("/auth/password/reset", { token, password }),
  getPasswordRequirements: () => api.get("/auth/password/requirements"),
  logout: () => api.post("/auth/logout"),
};
