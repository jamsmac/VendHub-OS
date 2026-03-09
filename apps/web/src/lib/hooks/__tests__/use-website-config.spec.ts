import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapperWithClient } from "./test-utils";
import {
  useWebsiteConfig,
  useWebsiteConfigBySection,
  useWebsiteConfigByKey,
  useUpdateWebsiteConfig,
  useBulkUpdateWebsiteConfig,
  useCreateWebsiteConfig,
  useDeleteWebsiteConfig,
} from "../use-website-config";

jest.mock("../../api", () => ({
  websiteConfigApi: {
    getAll: jest.fn(),
    getBySection: jest.fn(),
    getByKey: jest.fn(),
    create: jest.fn(),
    updateByKey: jest.fn(),
    bulkUpdate: jest.fn(),
    deleteByKey: jest.fn(),
  },
}));

import { websiteConfigApi } from "../../api";
const mockGetAll = websiteConfigApi.getAll as jest.MockedFunction<
  typeof websiteConfigApi.getAll
>;
const mockGetBySection = websiteConfigApi.getBySection as jest.MockedFunction<
  typeof websiteConfigApi.getBySection
>;
const mockGetByKey = websiteConfigApi.getByKey as jest.MockedFunction<
  typeof websiteConfigApi.getByKey
>;
const mockCreate = websiteConfigApi.create as jest.MockedFunction<
  typeof websiteConfigApi.create
>;
const mockUpdateByKey = websiteConfigApi.updateByKey as jest.MockedFunction<
  typeof websiteConfigApi.updateByKey
>;
const mockBulkUpdate = websiteConfigApi.bulkUpdate as jest.MockedFunction<
  typeof websiteConfigApi.bulkUpdate
>;
const mockDeleteByKey = websiteConfigApi.deleteByKey as jest.MockedFunction<
  typeof websiteConfigApi.deleteByKey
>;

const sampleConfig = {
  id: "cfg-1",
  organizationId: "org-1",
  key: "site_title",
  value: "VendHub",
  section: "general",
  updatedBy: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-03-01T00:00:00Z",
  deletedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useWebsiteConfig", () => {
  it("fetches all configs", async () => {
    // websiteConfigApi resolves data directly (already unwrapped via .then(r => r.data))
    mockGetAll.mockResolvedValueOnce([sampleConfig] as never);

    const { result } = renderHook(() => useWebsiteConfig(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetAll).toHaveBeenCalled();
  });
});

describe("useWebsiteConfigBySection", () => {
  it("fetches configs by section", async () => {
    mockGetBySection.mockResolvedValueOnce([sampleConfig] as never);

    const { result } = renderHook(() => useWebsiteConfigBySection("general"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetBySection).toHaveBeenCalledWith("general");
  });
});

describe("useWebsiteConfigByKey", () => {
  it("fetches config by key", async () => {
    mockGetByKey.mockResolvedValueOnce(sampleConfig as never);

    const { result } = renderHook(() => useWebsiteConfigByKey("site_title"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetByKey).toHaveBeenCalledWith("site_title");
  });

  it("can be disabled", () => {
    const { result } = renderHook(
      () => useWebsiteConfigByKey("site_title", false),
      { wrapper: createWrapperWithClient().wrapper },
    );
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useUpdateWebsiteConfig", () => {
  it("updates config by key", async () => {
    mockUpdateByKey.mockResolvedValueOnce(sampleConfig as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateWebsiteConfig(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        key: "site_title",
        value: "VendHub Pro",
      });
    });

    expect(mockUpdateByKey).toHaveBeenCalledWith("site_title", {
      value: "VendHub Pro",
      section: undefined,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["website-config"],
    });
  });
});

describe("useBulkUpdateWebsiteConfig", () => {
  it("bulk updates configs", async () => {
    mockBulkUpdate.mockResolvedValueOnce([sampleConfig] as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useBulkUpdateWebsiteConfig(), {
      wrapper,
    });

    const configs = [
      { key: "site_title", value: "VendHub" },
      { key: "site_description", value: "Vending platform" },
    ];
    await act(async () => {
      await result.current.mutateAsync(configs);
    });

    expect(mockBulkUpdate).toHaveBeenCalledWith(configs);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["website-config"],
    });
  });
});

describe("useCreateWebsiteConfig", () => {
  it("creates config and invalidates", async () => {
    mockCreate.mockResolvedValueOnce(sampleConfig as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateWebsiteConfig(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        key: "new_key",
        value: "new_value",
        section: "seo",
      });
    });

    expect(mockCreate).toHaveBeenCalledWith({
      key: "new_key",
      value: "new_value",
      section: "seo",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["website-config"],
    });
  });
});

describe("useDeleteWebsiteConfig", () => {
  it("deletes config by key", async () => {
    mockDeleteByKey.mockResolvedValueOnce(undefined as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteWebsiteConfig(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("old_key");
    });

    expect(mockDeleteByKey).toHaveBeenCalledWith("old_key");
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["website-config"],
    });
  });
});
