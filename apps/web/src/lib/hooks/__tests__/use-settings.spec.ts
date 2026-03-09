import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapperWithClient } from "./test-utils";
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
  useIntegrationStatuses,
  useSystemHealth,
  useUpdateIntegration,
  useTestIntegration,
} from "../use-settings";

jest.mock("../../api", () => ({
  settingsApi: {
    getAll: jest.fn(),
    update: jest.fn(),
  },
  integrationsApi: {
    getAll: jest.fn(),
    update: jest.fn(),
    test: jest.fn(),
  },
}));

import { settingsApi, integrationsApi } from "../../api";
const mockSettingsGetAll = settingsApi.getAll as jest.MockedFunction<
  typeof settingsApi.getAll
>;
const mockSettingsUpdate = settingsApi.update as jest.MockedFunction<
  typeof settingsApi.update
>;
const mockIntegrationsGetAll = integrationsApi.getAll as jest.MockedFunction<
  typeof integrationsApi.getAll
>;
const mockIntegrationsUpdate = integrationsApi.update as jest.MockedFunction<
  typeof integrationsApi.update
>;
const mockIntegrationsTest = integrationsApi.test as jest.MockedFunction<
  typeof integrationsApi.test
>;

const sampleOrgSettings = {
  id: "org-1",
  name: "VendHub",
  legal_name: "VendHub LLC",
  inn: "123456789",
  address: "Tashkent",
  phone: "+998901234567",
  email: "info@vendhub.uz",
  website: "vendhub.uz",
  timezone: "Asia/Tashkent",
  currency: "UZS",
  language: "ru",
  logo_url: null,
  updated_at: "2026-03-09T10:00:00Z",
};

const sampleIntegrations = [
  {
    id: "int-1",
    name: "Payme",
    provider: "payme",
    status: "connected",
    last_sync_at: "2026-03-09T10:00:00Z",
    config: {},
    test_mode: false,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useOrganizationSettings", () => {
  it("fetches organization settings", async () => {
    mockSettingsGetAll.mockResolvedValueOnce({
      data: sampleOrgSettings,
    } as never);

    const { result } = renderHook(() => useOrganizationSettings(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSettingsGetAll).toHaveBeenCalledWith({
      category: "organization",
    });
    expect(result.current.data).toEqual(sampleOrgSettings);
  });
});

describe("useUpdateOrganizationSettings", () => {
  it("updates settings key by key", async () => {
    mockSettingsUpdate.mockResolvedValue({ data: "VendHub Pro" } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateOrganizationSettings(), {
      wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ name: "VendHub Pro" });
    });

    expect(mockSettingsUpdate).toHaveBeenCalledWith("name", {
      value: "VendHub Pro",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["organization-settings"],
    });
  });
});

describe("useIntegrationStatuses", () => {
  it("fetches integration statuses", async () => {
    mockIntegrationsGetAll.mockResolvedValueOnce({
      data: sampleIntegrations,
    } as never);

    const { result } = renderHook(() => useIntegrationStatuses(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe("Payme");
  });
});

describe("useSystemHealth", () => {
  it("returns hardcoded health status", async () => {
    const { result } = renderHook(() => useSystemHealth(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      database: "ok",
      api: "ok",
      redis: "ok",
      storage: "ok",
      uptime: 0,
    });
  });
});

describe("useUpdateIntegration", () => {
  it("updates integration and invalidates", async () => {
    mockIntegrationsUpdate.mockResolvedValueOnce({
      data: { ...sampleIntegrations[0], test_mode: true },
    } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateIntegration(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: "int-1",
        updates: { test_mode: true },
      });
    });

    expect(mockIntegrationsUpdate).toHaveBeenCalledWith("int-1", {
      test_mode: true,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["integration-statuses"],
    });
  });
});

describe("useTestIntegration", () => {
  it("tests an integration", async () => {
    mockIntegrationsTest.mockResolvedValueOnce({
      data: { success: true, message: "Connection OK" },
    } as never);

    const { result } = renderHook(() => useTestIntegration(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await act(async () => {
      const response = await result.current.mutateAsync("int-1");
      expect(response?.success).toBe(true);
    });

    expect(mockIntegrationsTest).toHaveBeenCalledWith("int-1");
  });
});
