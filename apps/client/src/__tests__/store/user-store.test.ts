import { describe, it, expect, beforeEach } from "vitest";
import { useUserStore } from "@/lib/store";

describe("useUserStore", () => {
  beforeEach(() => {
    useUserStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });
  });

  const mockUser = {
    id: "user-1",
    telegramId: "123456",
    firstName: "Alisher",
    lastName: "Karimov",
    username: "alisher_k",
    loyaltyPoints: 500,
    loyaltyTier: "silver",
  };

  it("sets user and authenticates", () => {
    useUserStore.getState().setUser(mockUser);
    const state = useUserStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it("sets user to null (unauthenticated)", () => {
    useUserStore.getState().setUser(mockUser);
    useUserStore.getState().setUser(null);
    const state = useUserStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("sets loading state", () => {
    useUserStore.getState().setLoading(false);
    expect(useUserStore.getState().isLoading).toBe(false);
  });

  it("logout clears user and auth", () => {
    useUserStore.getState().setUser(mockUser);
    useUserStore.getState().logout();
    const state = useUserStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
