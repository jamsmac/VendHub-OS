import { renderHook, waitFor } from "@testing-library/react";
import { createWrapperWithClient } from "./test-utils";
import {
  useDirectories,
  useDirectory,
  useDirectoryEntries,
  useDirectoryStats,
  type DbDirectory,
} from "../use-directories";

jest.mock("../../api", () => ({
  directoriesApi: {
    getAll: jest.fn(),
    getBySlug: jest.fn(),
    getEntries: jest.fn(),
  },
}));

import { directoriesApi } from "../../api";
const mockGetAll = directoriesApi.getAll as jest.MockedFunction<
  typeof directoriesApi.getAll
>;
const mockGetBySlug = directoriesApi.getBySlug as jest.MockedFunction<
  typeof directoriesApi.getBySlug
>;
const mockGetEntries = directoriesApi.getEntries as jest.MockedFunction<
  typeof directoriesApi.getEntries
>;

const sampleDirectories: DbDirectory[] = [
  {
    id: "d-1",
    slug: "payment-methods",
    name: "Способы оплаты",
    description: null,
    fields: [{ key: "name", label: "Название", type: "text", required: true }],
    is_active: true,
    entries_count: 5,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "d-2",
    slug: "regions",
    name: "Регионы",
    description: "Регионы Узбекистана",
    fields: [],
    is_active: true,
    entries_count: 14,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useDirectories", () => {
  it("fetches all directories", async () => {
    mockGetAll.mockResolvedValueOnce({
      data: { data: sampleDirectories },
    } as never);

    const { result } = renderHook(() => useDirectories(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });
});

describe("useDirectory", () => {
  it("fetches directory by slug", async () => {
    mockGetBySlug.mockResolvedValueOnce({
      data: sampleDirectories[0],
    } as never);

    const { result } = renderHook(() => useDirectory("payment-methods"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetBySlug).toHaveBeenCalledWith("payment-methods");
    expect(result.current.data?.name).toBe("Способы оплаты");
  });

  it("is disabled when slug is empty", () => {
    const { result } = renderHook(() => useDirectory(""), {
      wrapper: createWrapperWithClient().wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useDirectoryEntries", () => {
  it("fetches entries by directory id", async () => {
    const entries = [
      {
        id: "e-1",
        directory_id: "d-1",
        data: { name: "Payme" },
        is_active: true,
        sort_order: 1,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z",
      },
    ];
    mockGetEntries.mockResolvedValueOnce({ data: { data: entries } } as never);

    const { result } = renderHook(() => useDirectoryEntries("d-1"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetEntries).toHaveBeenCalledWith("d-1");
    expect(result.current.data).toHaveLength(1);
  });

  it("is disabled when directoryId is empty", () => {
    const { result } = renderHook(() => useDirectoryEntries(""), {
      wrapper: createWrapperWithClient().wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useDirectoryStats", () => {
  it("calculates stats from directories", async () => {
    mockGetAll.mockResolvedValueOnce({ data: sampleDirectories } as never);

    const { result } = renderHook(() => useDirectoryStats(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      totalDirectories: 2,
      totalEntries: 19, // 5 + 14
    });
  });
});
