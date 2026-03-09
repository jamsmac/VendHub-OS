import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapperWithClient } from "./test-utils";
import {
  useTeamMembers,
  useTeamStats,
  useUsersByRole,
  useUpdateUserRole,
  useDeactivateUser,
  useActivityLog,
  useActivateUser,
  useUpdateUserProfile,
  useToggleUserActive,
  type UserRow,
} from "../use-team";

jest.mock("../../api", () => ({
  usersApi: {
    getAll: jest.fn(),
    update: jest.fn(),
  },
  api: {
    get: jest.fn(),
  },
}));

import { usersApi, api } from "../../api";
const mockGetAll = usersApi.getAll as jest.MockedFunction<
  typeof usersApi.getAll
>;
const mockUpdate = usersApi.update as jest.MockedFunction<
  typeof usersApi.update
>;
const mockApiGet = api.get as jest.MockedFunction<typeof api.get>;

const sampleMembers: UserRow[] = [
  {
    id: "u-1",
    email: "ivanov@vendhub.uz",
    full_name: "Иванов Иван",
    phone: "+998901234567",
    role: "admin",
    organization_id: "org-1",
    is_active: true,
    avatar_url: null,
    last_login_at: "2026-03-09T10:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "u-2",
    email: "petrov@vendhub.uz",
    full_name: "Петров Пётр",
    phone: null,
    role: "operator",
    organization_id: "org-1",
    is_active: false,
    avatar_url: null,
    last_login_at: null,
    created_at: "2026-02-01T00:00:00Z",
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useTeamMembers", () => {
  it("fetches all team members", async () => {
    mockGetAll.mockResolvedValueOnce({ data: sampleMembers } as never);

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetAll).toHaveBeenCalledWith(undefined);
    expect(result.current.data).toEqual(sampleMembers);
  });

  it("passes organizationId when provided", async () => {
    mockGetAll.mockResolvedValueOnce({ data: sampleMembers } as never);

    renderHook(() => useTeamMembers("org-1"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() =>
      expect(mockGetAll).toHaveBeenCalledWith({ organizationId: "org-1" }),
    );
  });
});

describe("useTeamStats", () => {
  it("fetches team stats", async () => {
    const stats = {
      totalMembers: 10,
      activeMembers: 8,
      byRole: { admin: 2, operator: 6 },
      avgTasksPerMember: 3.5,
    };
    mockApiGet.mockResolvedValueOnce({ data: stats } as never);

    const { result } = renderHook(() => useTeamStats(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiGet).toHaveBeenCalledWith("/users/stats");
    expect(result.current.data).toEqual(stats);
  });
});

describe("useUsersByRole", () => {
  it("fetches users filtered by role", async () => {
    mockApiGet.mockResolvedValueOnce({ data: [sampleMembers[0]] } as never);

    const { result } = renderHook(() => useUsersByRole("admin"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiGet).toHaveBeenCalledWith("/users/by-role", {
      params: { role: "admin" },
    });
  });

  it("is disabled when role is empty", () => {
    const { result } = renderHook(() => useUsersByRole(""), {
      wrapper: createWrapperWithClient().wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useUpdateUserRole", () => {
  it("updates role and invalidates queries", async () => {
    mockUpdate.mockResolvedValueOnce({ data: sampleMembers[0] } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateUserRole(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ userId: "u-1", role: "manager" });
    });

    expect(mockUpdate).toHaveBeenCalledWith("u-1", {
      role: "manager",
      updated_at: expect.any(String),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["team-members"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["team-stats"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["users-by-role"],
    });
  });
});

describe("useDeactivateUser", () => {
  it("deactivates user", async () => {
    mockUpdate.mockResolvedValueOnce({ data: sampleMembers[1] } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeactivateUser(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("u-1");
    });

    expect(mockUpdate).toHaveBeenCalledWith("u-1", {
      is_active: false,
      updated_at: expect.any(String),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["team-members"],
    });
  });
});

describe("useActivateUser", () => {
  it("activates user", async () => {
    mockUpdate.mockResolvedValueOnce({ data: sampleMembers[0] } as never);

    const { result } = renderHook(() => useActivateUser(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync("u-2");
    });

    expect(mockUpdate).toHaveBeenCalledWith("u-2", {
      is_active: true,
      updated_at: expect.any(String),
    });
  });
});

describe("useActivityLog", () => {
  it("fetches activity with default limit 20", async () => {
    const logs = [{ id: "1", action: "login" }];
    mockApiGet.mockResolvedValueOnce({ data: logs } as never);

    const { result } = renderHook(() => useActivityLog(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiGet).toHaveBeenCalledWith("/audit", {
      params: { limit: 20 },
    });
  });

  it("accepts custom limit", async () => {
    mockApiGet.mockResolvedValueOnce({ data: [] } as never);

    renderHook(() => useActivityLog(50), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() =>
      expect(mockApiGet).toHaveBeenCalledWith("/audit", {
        params: { limit: 50 },
      }),
    );
  });
});

describe("useUpdateUserProfile", () => {
  it("updates profile fields", async () => {
    mockUpdate.mockResolvedValueOnce({ data: sampleMembers[0] } as never);

    const { result } = renderHook(() => useUpdateUserProfile(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        userId: "u-1",
        updates: { full_name: "Иванов Иван Иванович" },
      });
    });

    expect(mockUpdate).toHaveBeenCalledWith("u-1", {
      full_name: "Иванов Иван Иванович",
      updated_at: expect.any(String),
    });
  });
});

describe("useToggleUserActive", () => {
  it("toggles user active status", async () => {
    mockUpdate.mockResolvedValueOnce({ data: sampleMembers[0] } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useToggleUserActive(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ userId: "u-2", isActive: true });
    });

    expect(mockUpdate).toHaveBeenCalledWith("u-2", {
      is_active: true,
      updated_at: expect.any(String),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["team-members"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["team-stats"],
    });
  });
});
