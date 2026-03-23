import { describe, it, expect, beforeEach, vi } from "vitest";
import { setTokens, clearTokens, getAccessToken } from "@/lib/api";

// We test the exported token management functions directly.
// The axios instance and interceptors are internal and tested via integration.

describe("api token management", () => {
  beforeEach(() => {
    clearTokens();
    localStorage.clear();
  });

  it("initially has no access token", () => {
    expect(getAccessToken()).toBeNull();
  });

  it("stores access token in memory via setTokens", () => {
    setTokens("test-access-token");
    expect(getAccessToken()).toBe("test-access-token");
  });

  it("ignores refresh token param (stored server-side in httpOnly cookie)", () => {
    setTokens("access-123", "refresh-456");
    expect(getAccessToken()).toBe("access-123");
  });

  it("clears access token via clearTokens", () => {
    setTokens("token-to-clear");
    expect(getAccessToken()).toBe("token-to-clear");

    clearTokens();
    expect(getAccessToken()).toBeNull();
  });

  it("overwrites previous token on setTokens", () => {
    setTokens("first-token");
    setTokens("second-token");
    expect(getAccessToken()).toBe("second-token");
  });

  it("clearTokens is idempotent", () => {
    clearTokens();
    clearTokens();
    expect(getAccessToken()).toBeNull();
  });

  it("stores token in memory only (no localStorage)", () => {
    const setSpy = vi.spyOn(Storage.prototype, "setItem");
    setTokens("memory-only-token");
    // Token management was migrated to memory-only (no localStorage)
    expect(setSpy).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("memory-only-token");
    setSpy.mockRestore();
  });

  it("clearTokens does not touch localStorage", () => {
    setTokens("token-to-clear");
    const removeSpy = vi.spyOn(Storage.prototype, "removeItem");
    clearTokens();
    // Token management is memory-only
    expect(removeSpy).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
    removeSpy.mockRestore();
  });
});
