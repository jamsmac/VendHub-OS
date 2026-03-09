import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const DISMISSED_KEY = "vendhub_pwa_install_dismissed";

function createPromptEvent(outcome: "accepted" | "dismissed" = "accepted") {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  (event as any).prompt = vi.fn().mockResolvedValue(undefined);
  (event as any).userChoice = Promise.resolve({ outcome });
  return event;
}

describe("usePwaInstall", () => {
  beforeEach(() => {
    localStorage.clear();
    // Default: not standalone
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
    (navigator as any).standalone = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────
  it("starts with canShow=false and isInstalled=false when no prompt event", () => {
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.canShow).toBe(false);
    expect(result.current.isInstalled).toBe(false);
  });

  it("detects standalone mode (display-mode: standalone)", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isInstalled).toBe(true);
    expect(result.current.canShow).toBe(false);
  });

  it("detects iOS standalone mode (navigator.standalone)", () => {
    (navigator as any).standalone = true;
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isInstalled).toBe(true);
  });

  // ── beforeinstallprompt ────────────────────────────────────────────
  it("captures beforeinstallprompt event and sets canShow=true", () => {
    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      window.dispatchEvent(createPromptEvent());
    });

    expect(result.current.canShow).toBe(true);
    expect(result.current.isInstalled).toBe(false);
  });

  it("prevents default on beforeinstallprompt", () => {
    renderHook(() => usePwaInstall());
    const event = createPromptEvent();
    const preventSpy = vi.spyOn(event, "preventDefault");

    act(() => {
      window.dispatchEvent(event);
    });

    expect(preventSpy).toHaveBeenCalled();
  });

  // ── install() ──────────────────────────────────────────────────────
  it("calls prompt() and sets isInstalled on accept", async () => {
    const { result } = renderHook(() => usePwaInstall());
    const event = createPromptEvent("accepted");

    act(() => {
      window.dispatchEvent(event);
    });

    await act(async () => {
      await result.current.install();
    });

    expect((event as any).prompt).toHaveBeenCalled();
    expect(result.current.isInstalled).toBe(true);
    expect(result.current.canShow).toBe(false);
  });

  it("does not set isInstalled on dismiss", async () => {
    const { result } = renderHook(() => usePwaInstall());
    const event = createPromptEvent("dismissed");

    act(() => {
      window.dispatchEvent(event);
    });

    await act(async () => {
      await result.current.install();
    });

    expect(result.current.isInstalled).toBe(false);
    expect(result.current.canShow).toBe(false); // prompt cleared
  });

  it("install() is a no-op without deferred prompt", async () => {
    const { result } = renderHook(() => usePwaInstall());
    await act(async () => {
      await result.current.install();
    });
    expect(result.current.isInstalled).toBe(false);
  });

  // ── dismiss() ──────────────────────────────────────────────────────
  it("dismiss stores timestamp and hides banner", () => {
    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      window.dispatchEvent(createPromptEvent());
    });
    expect(result.current.canShow).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.canShow).toBe(false);
    expect(localStorage.getItem(DISMISSED_KEY)).toBeTruthy();
  });

  it("hides banner when dismissed within 7 days", () => {
    const now = Date.now();
    localStorage.setItem(DISMISSED_KEY, String(now - 3 * 24 * 60 * 60 * 1000)); // 3 days ago

    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      window.dispatchEvent(createPromptEvent());
    });

    // canShow is false because dismissed < 7 days ago
    expect(result.current.canShow).toBe(false);
  });

  it("shows banner again after 7 days dismiss expiry", () => {
    const now = Date.now();
    localStorage.setItem(DISMISSED_KEY, String(now - 8 * 24 * 60 * 60 * 1000)); // 8 days ago

    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      window.dispatchEvent(createPromptEvent());
    });

    expect(result.current.canShow).toBe(true);
  });

  // ── appinstalled event ─────────────────────────────────────────────
  it("sets isInstalled on appinstalled event", () => {
    const { result } = renderHook(() => usePwaInstall());

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.canShow).toBe(false);
  });

  // ── cleanup ────────────────────────────────────────────────────────
  it("cleans up event listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => usePwaInstall());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith(
      "beforeinstallprompt",
      expect.any(Function),
    );
  });
});
