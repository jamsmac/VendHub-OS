import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapperWithClient } from "./test-utils";
import {
  useMachines,
  useMachine,
  useMachineStats,
  useUpdateMachineStatus,
} from "../use-machines";

jest.mock("../../api", () => ({
  machinesApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    getStats: jest.fn(),
    update: jest.fn(),
  },
}));

import { machinesApi } from "../../api";
const mockGetAll = machinesApi.getAll as jest.MockedFunction<
  typeof machinesApi.getAll
>;
const mockGetById = machinesApi.getById as jest.MockedFunction<
  typeof machinesApi.getById
>;
const mockGetStats = machinesApi.getStats as jest.MockedFunction<
  typeof machinesApi.getStats
>;
const mockUpdate = machinesApi.update as jest.MockedFunction<
  typeof machinesApi.update
>;

beforeEach(() => {
  jest.clearAllMocks();
});

const sampleMachines = [
  {
    id: "m-1",
    name: "VH-005",
    address: "Навои 12",
    type: "coffee",
    status: "active",
  },
  {
    id: "m-2",
    name: "VH-006",
    address: "Мирзо Улугбек 3",
    type: "snack",
    status: "offline",
  },
];

describe("useMachines", () => {
  it("fetches all machines", async () => {
    mockGetAll.mockResolvedValueOnce({ data: sampleMachines } as never);

    const { result } = renderHook(() => useMachines(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(sampleMachines);
  });

  it("sets loading state initially", () => {
    mockGetAll.mockReturnValue(new Promise(() => {}) as never);

    const { result } = renderHook(() => useMachines(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});

describe("useMachine", () => {
  it("fetches a single machine by id", async () => {
    mockGetById.mockResolvedValueOnce({
      data: sampleMachines[0],
    } as never);

    const { result } = renderHook(() => useMachine("m-1"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetById).toHaveBeenCalledWith("m-1");
    expect(result.current.data).toEqual(sampleMachines[0]);
  });

  it("does not fetch when id is empty", () => {
    const { result } = renderHook(() => useMachine(""), {
      wrapper: createWrapperWithClient().wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGetById).not.toHaveBeenCalled();
  });
});

describe("useMachineStats", () => {
  it("fetches machine stats", async () => {
    const stats = {
      total: 23,
      active: 19,
      offline: 2,
      maintenance: 2,
    };
    mockGetStats.mockResolvedValueOnce({ data: stats } as never);

    const { result } = renderHook(() => useMachineStats(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(stats);
  });
});

describe("useUpdateMachineStatus", () => {
  it("updates machine status and invalidates queries", async () => {
    const updatedMachine = { ...sampleMachines[0], status: "maintenance" };
    mockUpdate.mockResolvedValueOnce({ data: updatedMachine } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateMachineStatus(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "m-1", status: "maintenance" });
    });

    expect(mockUpdate).toHaveBeenCalledWith("m-1", {
      status: "maintenance",
      updated_at: expect.any(String),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["machines"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["machine-stats"],
    });
  });

  it("handles update errors", async () => {
    mockUpdate.mockRejectedValueOnce(new Error("Forbidden"));

    const { result } = renderHook(() => useUpdateMachineStatus(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await expect(
      act(() => result.current.mutateAsync({ id: "m-1", status: "active" })),
    ).rejects.toThrow("Forbidden");
  });
});
