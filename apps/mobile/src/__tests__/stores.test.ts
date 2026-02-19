/**
 * Mobile Store Tests
 * Unit tests for Zustand stores (pure state logic)
 */

// Mock expo-secure-store before importing stores
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock api
jest.mock("../services/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    defaults: { headers: { common: {} } },
  },
}));

import { useAuthStore } from "../store/authStore";
import { useAppModeStore } from "../store/appModeStore";
import * as SecureStore from "expo-secure-store";
import { api } from "../services/api";

// ============================================
// AppMode Store
// ============================================

describe("useAppModeStore", () => {
  beforeEach(() => {
    // Reset store state
    useAppModeStore.setState({ mode: "client", isLoading: true });
    jest.clearAllMocks();
  });

  it("starts with client mode by default", () => {
    const state = useAppModeStore.getState();
    expect(state.mode).toBe("client");
    expect(state.isLoading).toBe(true);
  });

  it("setMode updates mode and persists to SecureStore", async () => {
    await useAppModeStore.getState().setMode("staff");
    expect(useAppModeStore.getState().mode).toBe("staff");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "vendhub_app_mode",
      "staff",
    );
  });

  it("loadMode reads from SecureStore", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("staff");
    await useAppModeStore.getState().loadMode();
    expect(useAppModeStore.getState().mode).toBe("staff");
    expect(useAppModeStore.getState().isLoading).toBe(false);
  });

  it("loadMode defaults to client when no saved value", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    await useAppModeStore.getState().loadMode();
    expect(useAppModeStore.getState().mode).toBe("client");
  });

  it("loadMode handles errors gracefully", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
      new Error("SecureStore error"),
    );
    await useAppModeStore.getState().loadMode();
    expect(useAppModeStore.getState().mode).toBe("client");
    expect(useAppModeStore.getState().isLoading).toBe(false);
  });
});

// ============================================
// Auth Store
// ============================================

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
    });
    jest.clearAllMocks();
  });

  it("starts unauthenticated", () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it("clearError clears error state", () => {
    useAuthStore.setState({ error: "Some error" });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });

  describe("login", () => {
    it("sets user and tokens on success", async () => {
      const mockUser = {
        id: "u1",
        email: "test@vendhub.uz",
        firstName: "Test",
        role: "operator",
        organizationId: "org1",
      };

      (api.post as jest.Mock).mockResolvedValue({
        data: {
          accessToken: "token123",
          refreshToken: "refresh456",
          user: mockUser,
        },
      });

      await useAuthStore.getState().login("test@vendhub.uz", "password");

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe("token123");
      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(3);
    });

    it("sets error on failure", async () => {
      (api.post as jest.Mock).mockRejectedValue({
        response: { data: { message: "Invalid credentials" } },
      });

      await expect(
        useAuthStore.getState().login("wrong@email.com", "wrong"),
      ).rejects.toThrow("Invalid credentials");

      expect(useAuthStore.getState().error).toBe("Invalid credentials");
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe("logout", () => {
    it("clears state and tokens", async () => {
      useAuthStore.setState({
        user: {
          id: "u1",
          email: "test@test.com",
          firstName: "T",
          role: "admin",
          organizationId: "o1",
        },
        accessToken: "token",
        refreshToken: "refresh",
        isAuthenticated: true,
      });

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
    });
  });

  describe("checkAuth", () => {
    it("restores session from SecureStore when token is valid", async () => {
      const mockUser = {
        id: "u1",
        email: "t@t.com",
        firstName: "T",
        role: "admin",
        organizationId: "o1",
      };

      (SecureStore.getItemAsync as jest.Mock).mockImplementation(
        (key: string) => {
          if (key === "vendhub_access_token")
            return Promise.resolve("token123");
          if (key === "vendhub_refresh_token")
            return Promise.resolve("refresh456");
          if (key === "vendhub_user")
            return Promise.resolve(JSON.stringify(mockUser));
          return Promise.resolve(null);
        },
      );

      (api.get as jest.Mock).mockResolvedValue({ data: { data: mockUser } });

      await useAuthStore.getState().checkAuth();

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it("sets unauthenticated when no tokens stored", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await useAuthStore.getState().checkAuth();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it("attempts refresh when access token is invalid", async () => {
      const mockUser = {
        id: "u1",
        email: "t@t.com",
        firstName: "T",
        role: "admin",
        organizationId: "o1",
      };

      (SecureStore.getItemAsync as jest.Mock).mockImplementation(
        (key: string) => {
          if (key === "vendhub_access_token")
            return Promise.resolve("expired_token");
          if (key === "vendhub_refresh_token")
            return Promise.resolve("refresh456");
          if (key === "vendhub_user")
            return Promise.resolve(JSON.stringify(mockUser));
          return Promise.resolve(null);
        },
      );

      // First call (me endpoint) fails
      (api.get as jest.Mock).mockRejectedValueOnce(new Error("Unauthorized"));

      // Refresh succeeds
      (api.post as jest.Mock).mockResolvedValueOnce({
        data: {
          accessToken: "new_token",
          refreshToken: "new_refresh",
          user: mockUser,
        },
      });

      await useAuthStore.getState().checkAuth();

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().accessToken).toBe("new_token");
    });
  });
});
