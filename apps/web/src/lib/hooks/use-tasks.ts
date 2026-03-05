"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "../api";

export interface DbTask {
  id: string;
  title: string;
  description: string | null;
  type:
    | "maintenance"
    | "refill"
    | "repair"
    | "cleaning"
    | "inspection"
    | "delivery"
    | "other";
  priority: "low" | "medium" | "high" | "critical";
  status: "todo" | "in_progress" | "review" | "done" | "cancelled";
  assignee_id: string | null;
  assignee_name: string | null;
  machine_id: string | null;
  machine_name: string | null;
  due_date: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}

export function useTasks(limit = 100) {
  return useQuery({
    queryKey: ["tasks", limit],
    queryFn: async () => {
      const response = await tasksApi.getAll({ limit: limit.toString() });
      return response.data as DbTask[];
    },
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ["tasks", id],
    queryFn: async () => {
      const response = await tasksApi.getById(id);
      return response.data as DbTask;
    },
    enabled: !!id,
  });
}

export function useTaskStats() {
  return useQuery({
    queryKey: ["task-stats"],
    queryFn: async () => {
      const response = await tasksApi.getAll();
      const tasks = response.data as DbTask[];

      const now = new Date();

      return {
        total: tasks.length,
        todo: tasks.filter((t) => t.status === "todo").length,
        inProgress: tasks.filter((t) => t.status === "in_progress").length,
        done: tasks.filter((t) => t.status === "done").length,
        overdue: tasks.filter(
          (t) =>
            t.due_date &&
            new Date(t.due_date) < now &&
            t.status !== "done" &&
            t.status !== "cancelled",
        ).length,
      };
    },
  });
}

export function useTasksByAssignee(assigneeId: string) {
  return useQuery({
    queryKey: ["tasks-by-assignee", assigneeId],
    queryFn: async () => {
      const response = await tasksApi.getAll({ assignee_id: assigneeId });
      return response.data as DbTask[];
    },
    enabled: !!assigneeId,
  });
}

export function useTasksByMachine(machineId: string) {
  return useQuery({
    queryKey: ["tasks-by-machine", machineId],
    queryFn: async () => {
      const response = await tasksApi.getAll({ machine_id: machineId });
      return response.data as DbTask[];
    },
    enabled: !!machineId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      task: Omit<DbTask, "id" | "created_at" | "updated_at">,
    ) => {
      const response = await tasksApi.create(task);
      return response.data as DbTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<DbTask, "id" | "created_at">>;
    }) => {
      const response = await tasksApi.update(id, updates);
      return response.data as DbTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: DbTask["status"];
    }) => {
      const response = await tasksApi.update(id, { status });
      return response.data as DbTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await tasksApi.delete(id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-stats"] });
    },
  });
}

export function useAssignTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      assigneeId,
      assigneeName,
    }: {
      id: string;
      assigneeId: string;
      assigneeName: string;
    }) => {
      const response = await tasksApi.assign(id, {
        assignee_id: assigneeId,
        assignee_name: assigneeName,
      });
      return response.data as DbTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
