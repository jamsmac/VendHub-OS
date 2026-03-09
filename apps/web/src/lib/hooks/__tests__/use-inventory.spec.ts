import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapperWithClient } from "./test-utils";
import {
  useWarehouses,
  useAllInventory,
  useInventoryByWarehouse,
  useInventoryMovements,
  useInventoryStats,
  useLowStockAlerts,
  useCreateWarehouse,
  useDeactivateWarehouse,
  useCreateMovement,
  useUpdateMovementStatus,
} from "../use-inventory";

jest.mock("../../api", () => ({
  inventoryApi: {
    getWarehouse: jest.fn(),
    getMovements: jest.fn(),
    getLowStock: jest.fn(),
    transfer: jest.fn(),
  },
}));

import { inventoryApi } from "../../api";
const mockGetWarehouse = inventoryApi.getWarehouse as jest.MockedFunction<
  typeof inventoryApi.getWarehouse
>;
const mockGetMovements = inventoryApi.getMovements as jest.MockedFunction<
  typeof inventoryApi.getMovements
>;
const mockGetLowStock = inventoryApi.getLowStock as jest.MockedFunction<
  typeof inventoryApi.getLowStock
>;
const mockTransfer = inventoryApi.transfer as jest.MockedFunction<
  typeof inventoryApi.transfer
>;

const sampleWarehouses = [
  {
    id: "w-1",
    name: "Центральный склад",
    level: "central",
    address: "Ташкент, Навои 12",
    machine_id: null,
    machine_name: null,
    responsible_person: "Иванов",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  },
];

const sampleMovements = [
  {
    id: "mv-1",
    type: "receipt",
    status: "completed",
    from_warehouse_id: null,
    to_warehouse_id: "w-1",
    total_cost: 100000,
    notes: null,
    created_by: "u-1",
    created_at: "2026-03-09T10:00:00Z",
    completed_at: "2026-03-09T10:05:00Z",
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useWarehouses", () => {
  it("fetches warehouses", async () => {
    mockGetWarehouse.mockResolvedValueOnce({
      data: sampleWarehouses,
    } as never);

    const { result } = renderHook(() => useWarehouses(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe("useAllInventory", () => {
  it("fetches all inventory items", async () => {
    mockGetMovements.mockResolvedValueOnce({ data: [] } as never);

    const { result } = renderHook(() => useAllInventory(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useInventoryByWarehouse", () => {
  it("fetches inventory for specific warehouse", async () => {
    mockGetWarehouse.mockResolvedValueOnce({ data: [] } as never);

    const { result } = renderHook(() => useInventoryByWarehouse("w-1"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("is disabled when warehouseId is empty", () => {
    const { result } = renderHook(() => useInventoryByWarehouse(""), {
      wrapper: createWrapperWithClient().wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useInventoryMovements", () => {
  it("fetches movements with default limit 50", async () => {
    mockGetMovements.mockResolvedValueOnce({
      data: sampleMovements,
    } as never);

    const { result } = renderHook(() => useInventoryMovements(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetMovements).toHaveBeenCalledWith({ limit: "50" });
  });
});

describe("useInventoryStats", () => {
  it("calculates stats from warehouses and movements", async () => {
    mockGetWarehouse.mockResolvedValueOnce({
      data: sampleWarehouses,
    } as never);
    mockGetMovements.mockResolvedValueOnce({
      data: sampleMovements,
    } as never);

    const { result } = renderHook(() => useInventoryStats(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totalWarehouses).toBe(1);
    expect(result.current.data?.totalItems).toBe(1);
  });
});

describe("useLowStockAlerts", () => {
  it("fetches low stock alerts", async () => {
    const alerts = [
      {
        productId: "p-1",
        productName: "Американо",
        warehouseId: "w-1",
        warehouseName: "Центральный",
        currentQty: 5,
        reorderPoint: 20,
      },
    ];
    mockGetLowStock.mockResolvedValueOnce({ data: alerts } as never);

    const { result } = renderHook(() => useLowStockAlerts(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe("useCreateWarehouse", () => {
  it("creates warehouse and invalidates caches", async () => {
    mockGetWarehouse.mockResolvedValueOnce({
      data: sampleWarehouses[0],
    } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateWarehouse(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        name: "Новый склад",
        level: "local",
        address: null,
        machine_id: null,
        machine_name: null,
        responsible_person: null,
        is_active: true,
      } as never);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["warehouses"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["inventory-stats"],
    });
  });
});

describe("useDeactivateWarehouse", () => {
  it("deactivates warehouse", async () => {
    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeactivateWarehouse(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("w-1");
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["warehouses"],
    });
  });
});

describe("useCreateMovement", () => {
  it("creates movement and invalidates caches", async () => {
    mockTransfer.mockResolvedValueOnce({
      data: sampleMovements[0],
    } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateMovement(), { wrapper });

    const { id, created_at, ...movementData } = sampleMovements[0];
    await act(async () => {
      await result.current.mutateAsync(movementData as never);
    });

    expect(mockTransfer).toHaveBeenCalledWith(movementData);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["inventory-movements"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["all-inventory"],
    });
  });
});

describe("useUpdateMovementStatus", () => {
  it("updates movement status and invalidates", async () => {
    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateMovementStatus(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        _id: "mv-1",
        _status: "completed",
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["inventory-movements"],
    });
  });
});
