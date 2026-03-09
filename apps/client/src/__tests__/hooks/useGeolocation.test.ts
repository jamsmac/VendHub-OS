import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGeolocation } from "@/hooks/useGeolocation";

const mockPosition = {
  coords: {
    latitude: 41.2995,
    longitude: 69.2401,
    accuracy: 10,
  },
};

describe("useGeolocation", () => {
  let mockGetCurrentPosition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition: mockGetCurrentPosition },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts in loading state", () => {
    mockGetCurrentPosition.mockImplementation(() => {});
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.position).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("returns position on success", async () => {
    mockGetCurrentPosition.mockImplementation((success: Function) => {
      success(mockPosition);
    });
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.position).toEqual({
      latitude: 41.2995,
      longitude: 69.2401,
      accuracy: 10,
    });
    expect(result.current.error).toBeNull();
  });

  it("handles PERMISSION_DENIED error", async () => {
    mockGetCurrentPosition.mockImplementation((_: Function, err: Function) => {
      err({ code: 1, PERMISSION_DENIED: 1 });
    });
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("geoPermissionDenied");
    expect(result.current.position).toBeNull();
  });

  it("handles POSITION_UNAVAILABLE error", async () => {
    mockGetCurrentPosition.mockImplementation((_: Function, err: Function) => {
      err({ code: 2, POSITION_UNAVAILABLE: 2 });
    });
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("geoPositionUnavailable");
  });

  it("handles TIMEOUT error", async () => {
    mockGetCurrentPosition.mockImplementation((_: Function, err: Function) => {
      err({ code: 3, TIMEOUT: 3 });
    });
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("geoTimeout");
  });

  it("handles missing geolocation API", async () => {
    Object.defineProperty(navigator, "geolocation", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("geoNotSupported");
    expect(result.current.position).toBeNull();
  });

  it("exposes getCurrentPosition for manual retry", async () => {
    let callCount = 0;
    mockGetCurrentPosition.mockImplementation((success: Function) => {
      callCount++;
      success(
        callCount === 1
          ? mockPosition
          : { coords: { latitude: 41.3, longitude: 69.25, accuracy: 5 } },
      );
    });
    const { result } = renderHook(() => useGeolocation());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.position?.latitude).toBe(41.2995);

    act(() => result.current.getCurrentPosition());
    await waitFor(() => expect(result.current.position?.latitude).toBe(41.3));
  });

  it("passes correct geolocation options", () => {
    mockGetCurrentPosition.mockImplementation(() => {});
    renderHook(() => useGeolocation());
    expect(mockGetCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
});
