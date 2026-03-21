/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import { format, isPast } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tasksApi } from "@/lib/api";

interface TasksTabProps {
  machineId: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-600",
  overdue: "bg-red-100 text-red-800",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "border-gray-300",
  medium: "border-yellow-400",
  high: "border-orange-500",
  urgent: "border-red-600",
};

export function TasksTab({ machineId }: TasksTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["tasks", "machine", machineId],
    queryFn: async () => {
      const res = await tasksApi.getAll({ machineId });
      return (res.data?.data ?? res.data ?? []) as any[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tasks = data || [];
  const active = tasks.filter(
    (t: any) => t.status === "pending" || t.status === "in_progress",
  );
  const overdue = active.filter(
    (t: any) => t.dueDate && isPast(new Date(t.dueDate)),
  );
  const completed = tasks.filter((t: any) => t.status === "completed");

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Активные</p>
            <p className="text-2xl font-bold">{active.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Просроченные</p>
            <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Завершённые</p>
            <p className="text-2xl font-bold text-green-600">
              {completed.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Активные ({active.length})</TabsTrigger>
          <TabsTrigger value="completed">
            Завершённые ({completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <TaskList tasks={active} emptyText="Нет активных задач" />
        </TabsContent>

        <TabsContent value="completed">
          <TaskList tasks={completed} emptyText="Нет завершённых задач" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TaskList({ tasks, emptyText }: { tasks: any[]; emptyText: string }) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-2">
          {tasks.map((task: any) => {
            const isOverdue =
              task.dueDate &&
              isPast(new Date(task.dueDate)) &&
              task.status !== "completed";
            return (
              <div
                key={task.id}
                className={`flex items-center gap-3 rounded-lg border-l-4 border p-3 hover:bg-muted/30 transition-colors ${
                  PRIORITY_COLORS[task.priority] || "border-gray-300"
                }`}
              >
                {task.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                ) : isOverdue ? (
                  <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                ) : (
                  <Clock className="h-5 w-5 text-blue-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {task.title || task.name || "Задача"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      className={`text-xs ${
                        STATUS_COLORS[isOverdue ? "overdue" : task.status] || ""
                      }`}
                    >
                      {isOverdue ? "Просрочено" : task.status}
                    </Badge>
                    {task.taskType && (
                      <Badge variant="outline" className="text-xs">
                        {task.taskType}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {task.dueDate && (
                    <p
                      className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}
                    >
                      {format(new Date(task.dueDate), "dd.MM.yyyy", {
                        locale: ru,
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
