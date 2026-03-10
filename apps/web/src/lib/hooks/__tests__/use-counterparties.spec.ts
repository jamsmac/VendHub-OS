import { renderHook, waitFor } from "@testing-library/react";
import { createWrapperWithClient } from "./test-utils";
import {
  useCounterparties,
  useCounterparty,
  useContracts,
  useCounterpartyStats,
} from "../use-counterparties";

jest.mock("../../api", () => ({
  api: {
    get: jest.fn(),
  },
}));

import { api } from "../../api";
const mockGet = api.get as jest.MockedFunction<typeof api.get>;

const sampleCounterparties = [
  {
    id: "cp-1",
    name: "ООО Ташкент Молоко",
    type: "supplier",
    inn: "123456789",
    balance: 1500000,
    status: "active",
  },
  {
    id: "cp-2",
    name: "ИП Алиев",
    type: "landlord",
    inn: null,
    balance: -200000,
    status: "active",
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useCounterparties", () => {
  it("fetches all counterparties", async () => {
    mockGet.mockResolvedValueOnce({ data: sampleCounterparties } as never);

    const { result } = renderHook(() => useCounterparties(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/contractors");
    expect(result.current.data).toHaveLength(2);
  });
});

describe("useCounterparty", () => {
  it("fetches counterparty by id", async () => {
    mockGet.mockResolvedValueOnce({
      data: sampleCounterparties[0],
    } as never);

    const { result } = renderHook(() => useCounterparty("cp-1"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/contractors/cp-1");
  });

  it("is disabled when id is empty", () => {
    const { result } = renderHook(() => useCounterparty(""), {
      wrapper: createWrapperWithClient().wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useContracts", () => {
  it("fetches contracts", async () => {
    const contracts = [
      {
        id: "c-1",
        number: "K-001",
        counterparty_id: "cp-2",
        counterparty_name: "ИП Алиев",
        type: "rent",
        status: "active",
      },
    ];
    mockGet.mockResolvedValueOnce({ data: contracts } as never);

    const { result } = renderHook(() => useContracts(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/contractors/invoices/all");
  });
});

describe("useCounterpartyStats", () => {
  it("fetches counterparty stats", async () => {
    const stats = { total: 15, suppliers: 8, landlords: 5, clients: 2 };
    mockGet.mockResolvedValueOnce({ data: stats } as never);

    const { result } = renderHook(() => useCounterpartyStats(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/contractors/stats");
    expect(result.current.data).toEqual(stats);
  });
});
