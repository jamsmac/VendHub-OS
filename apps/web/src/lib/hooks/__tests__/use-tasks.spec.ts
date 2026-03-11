import { renderHook, waitFor, act } from "@testing-library/react";
import { createWrapperWithClient } from "./test-utils";
import {
  useTasks,
  useTask,
  useTaskStats,
  useTasksByAssignee,
  useTasksByMachine,
  useCreateTask,
  useUpdateTask,
  useUpdateTaskStatus,
  useDeleteTask,
  useAssignTask,
  type DbTask,
} from "../use-tasks";

jest.mock("../../api", () => ({
  tasksApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    assign: jest.fn(),
  },
}));

import { tasksApi } from "../../api";
const mockGetAll = tasksApi.getAll as jest.MockedFunction<
  typeof tasksApi.getAll
>;
const mockGetById = tasksApi.getById as jest.MockedFunction<
  typeof tasksApi.getById
>;
const mockCreate = tasksApi.create as jest.MockedFunction<
  typeof tasksApi.create
>;
const mockUpdate = tasksApi.update as jest.MockedFunction<
  typeof tasksApi.update
>;
const mockDelete = tasksApi.delete as jest.MockedFunction<
  typeof tasksApi.delete
>;
const mockAssign = tasksApi.assign as jest.MockedFunction<
  typeof tasksApi.assign
>;

const sampleTasks: DbTask[] = [
  {
    id: "t-1",
    title: "Пополнить VH-005",
    description: "Закончились снэки",
    type: "refill",
    priority: "high",
    status: "todo",
    assignee_id: "u-1",
    assignee_name: "Иванов",
    machine_id: "m-1",
    machine_name: "VH-005",
    due_date: "2026-03-08T18:00:00Z",
    estimated_minutes: 30,
    actual_minutes: null,
    tags: ["срочно"],
    created_by: "u-admin",
    created_at: "2026-03-08T10:00:00Z",
    updated_at: "2026-03-08T10:00:00Z",
    completed_at: null,
  },
  {
    id: "t-2",
    title: "Чистка VH-010",
    description: null,
    type: "cleaning",
    priority: "medium",
    status: "in_progress",
    assignee_id: "u-2",
    assignee_name: "Петров",
    machine_id: "m-2",
    machine_name: "VH-010",
    due_date: "2026-03-10T18:00:00Z",
    estimated_minutes: 60,
    actual_minutes: null,
    tags: [],
    created_by: "u-admin",
    created_at: "2026-03-07T08:00:00Z",
    updated_at: "2026-03-08T14:00:00Z",
    completed_at: null,
  },
  {
    id: "t-3",
    title: "Ремонт платы VH-003",
    description: null,
    type: "repair",
    priority: "critical",
    status: "done",
    assignee_id: "u-1",
    assignee_name: "Иванов",
    machine_id: "m-3",
    machine_name: "VH-003",
    due_date: "2026-03-05T18:00:00Z",
    estimated_minutes: 120,
    actual_minutes: 90,
    tags: [],
    created_by: "u-admin",
    created_at: "2026-03-04T10:00:00Z",
    updated_at: "2026-03-05T16:00:00Z",
    completed_at: "2026-03-05T16:00:00Z",
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useTasks", () => {
  it("fetches tasks with default limit 100", async () => {
    mockGetAll.mockResolvedValueOnce({ data: sampleTasks } as never);

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetAll).toHaveBeenCalledWith({ limit: "100" });
    expect(result.current.data).toHaveLength(3);
  });

  it("accepts custom limit", async () => {
    mockGetAll.mockResolvedValueOnce({ data: sampleTasks } as never);

    renderHook(() => useTasks(50), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() =>
      expect(mockGetAll).toHaveBeenCalledWith({ limit: "50" }),
    );
  });
});

describe("useTask", () => {
  it("fetches task by id", async () => {
    mockGetById.mockResolvedValueOnce({ data: sampleTasks[0] } as never);

    const { result } = renderHook(() => useTask("t-1"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe("Пополнить VH-005");
  });

  it("is disabled when id is empty", () => {
    const { result } = renderHook(() => useTask(""), {
      wrapper: createWrapperWithClient().wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useTaskStats", () => {
  beforeEach(() => {
    // Pin date so overdue calculation is deterministic:
    // t-1 (due 2026-03-08T18:00:00Z, status todo) → overdue
    // t-2 (due 2026-03-10T18:00:00Z, status in_progress) → not yet
    // t-3 (due 2026-03-05T18:00:00Z, status done) → excluded
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-09T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("calculates correct stats including overdue", async () => {
    mockGetAll.mockResolvedValueOnce({ data: sampleTasks } as never);

    const { result } = renderHook(() => useTaskStats(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const stats = result.current.data;
    expect(stats?.total).toBe(3);
    expect(stats?.todo).toBe(1);
    expect(stats?.inProgress).toBe(1);
    expect(stats?.done).toBe(1);
    expect(stats?.overdue).toBe(1);
  });
});

describe("useTasksByAssignee", () => {
  it("fetches tasks filtered by assignee", async () => {
    const assigneeTasks = sampleTasks.filter((t) => t.assignee_id === "u-1");
    mockGetAll.mockResolvedValueOnce({ data: assigneeTasks } as never);

    const { result } = renderHook(() => useTasksByAssignee("u-1"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetAll).toHaveBeenCalledWith({ assignee_id: "u-1" });
    expect(result.current.data).toHaveLength(2);
  });

  it("is disabled when assigneeId is empty", () => {
    const { result } = renderHook(() => useTasksByAssignee(""), {
      wrapper: createWrapperWithClient().wrapper,
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useTasksByMachine", () => {
  it("fetches tasks filtered by machine", async () => {
    mockGetAll.mockResolvedValueOnce({ data: [sampleTasks[0]] } as never);

    const { result } = renderHook(() => useTasksByMachine("m-1"), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetAll).toHaveBeenCalledWith({ machine_id: "m-1" });
  });
});

describe("useCreateTask", () => {
  it("creates task and invalidates caches", async () => {
    mockCreate.mockResolvedValueOnce({ data: sampleTasks[0] } as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateTask(), { wrapper });

    const { id, created_at, updated_at, ...taskData } = sampleTasks[0];
    await act(async () => {
      await result.current.mutateAsync(taskData);
    });

    expect(mockCreate).toHaveBeenCalledWith(taskData);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["tasks"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["task-stats"] });
  });
});

describe("useUpdateTaskStatus", () => {
  it("updates task status", async () => {
    const updated = { ...sampleTasks[0], status: "done" as const };
    mockUpdate.mockResolvedValueOnce({ data: updated } as never);

    const { result } = renderHook(() => useUpdateTaskStatus(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "t-1", status: "done" });
    });

    expect(mockUpdate).toHaveBeenCalledWith("t-1", { status: "done" });
  });
});

describe("useDeleteTask", () => {
  it("deletes task and invalidates", async () => {
    mockDelete.mockResolvedValueOnce({} as never);

    const { wrapper, queryClient } = createWrapperWithClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteTask(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("t-1");
    });

    expect(mockDelete).toHaveBeenCalledWith("t-1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["tasks"] });
  });
});

describe("useAssignTask", () => {
  it("assigns task to user", async () => {
    mockAssign.mockResolvedValueOnce({ data: sampleTasks[0] } as never);

    const { result } = renderHook(() => useAssignTask(), {
      wrapper: createWrapperWithClient().wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({
        id: "t-1",
        assigneeId: "u-3",
        assigneeName: "Сидоров",
      });
    });

    expect(mockAssign).toHaveBeenCalledWith("t-1", {
      assignee_id: "u-3",
      assignee_name: "Сидоров",
    });
  });
});
