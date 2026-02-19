"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  User,
  Coffee,
  Clock,
  AlertTriangle,
  Play,
  Eye,
  Edit,
  Trash2,
  LayoutList,
  Kanban,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { tasksApi } from "@/lib/api";
import Link from "next/link";

interface Task {
  id: string;
  taskNumber: string;
  taskType:
    | "refill"
    | "collection"
    | "cleaning"
    | "repair"
    | "install"
    | "removal"
    | "audit";
  status:
    | "pending"
    | "assigned"
    | "in_progress"
    | "completed"
    | "rejected"
    | "postponed";
  priority: "low" | "normal" | "high" | "urgent";
  dueDate?: string;
  description?: string;
  machine?: {
    id: string;
    name: string;
    address?: string;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName?: string;
  };
  createdAt: string;
}

const statusStyles: Record<string, { color: string; bgColor: string }> = {
  pending: { color: "text-muted-foreground", bgColor: "bg-muted" },
  assigned: { color: "text-blue-600", bgColor: "bg-blue-100" },
  in_progress: { color: "text-yellow-600", bgColor: "bg-yellow-100" },
  completed: { color: "text-green-600", bgColor: "bg-green-100" },
  rejected: { color: "text-red-600", bgColor: "bg-red-100" },
  postponed: { color: "text-purple-600", bgColor: "bg-purple-100" },
};

const typeIcons: Record<string, string> = {
  refill: "\uD83D\uDD0B",
  collection: "\uD83D\uDCB0",
  cleaning: "\uD83E\uDDF9",
  repair: "\uD83D\uDD27",
  install: "\uD83D\uDCE6",
  removal: "\uD83D\uDCE4",
  audit: "\uD83D\uDCCA",
};

const priorityStyles: Record<string, string> = {
  low: "text-muted-foreground",
  normal: "text-blue-500",
  high: "text-orange-500",
  urgent: "text-red-500",
};

const statusColors: Record<string, string> = {
  pending: "bg-muted-foreground",
  assigned: "bg-blue-400",
  in_progress: "bg-yellow-400",
  completed: "bg-green-400",
};

export default function TasksPage() {
  const t = useTranslations("tasks");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [confirmState, setConfirmState] = useState<{
    title: string;
    action: () => void;
  } | null>(null);
  const queryClient = useQueryClient();

  const statusKeys = [
    "pending",
    "assigned",
    "in_progress",
    "completed",
    "rejected",
    "postponed",
  ] as const;
  const typeKeys = [
    "refill",
    "collection",
    "cleaning",
    "repair",
    "install",
    "removal",
    "audit",
  ] as const;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: tasks,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["tasks", debouncedSearch, statusFilter, typeFilter],
    queryFn: () =>
      tasksApi
        .getAll({
          search: debouncedSearch,
          status: statusFilter,
          type: typeFilter,
        })
        .then((res) => res.data.data),
  });

  const { data: kanbanData, isLoading: kanbanLoading } = useQuery({
    queryKey: ["tasks", "kanban"],
    queryFn: () => tasksApi.getKanban().then((res) => res.data),
    enabled: viewMode === "kanban",
  });

  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(t("deleted"));
    },
    onError: () => {
      toast.error(t("deleteFailed"));
    },
  });

  const startMutation = useMutation({
    mutationFn: tasksApi.start,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(t("started"));
    },
    onError: () => {
      toast.error(t("startFailed"));
    },
  });

  // Stats
  const stats = useMemo(
    () => ({
      total: tasks?.length || 0,
      pending: tasks?.filter((t: Task) => t.status === "pending").length || 0,
      inProgress:
        tasks?.filter((t: Task) => t.status === "in_progress").length || 0,
      overdue:
        tasks?.filter(
          (t: Task) =>
            t.dueDate &&
            new Date(t.dueDate) < new Date() &&
            !["completed", "rejected"].includes(t.status),
        ).length || 0,
    }),
    [tasks],
  );

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{t("loadError")}</p>
        <p className="text-muted-foreground mb-4">{t("loadFailed")}</p>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link href="/dashboard/tasks/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t("createTask")}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsTotal")}
                </p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsPending")}
                </p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {stats.pending}
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsInProgress")}
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.inProgress}
                </p>
              </div>
              <Play className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsOverdue")}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.overdue}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="rounded-r-none"
          >
            <LayoutList className="h-4 w-4 mr-2" />
            {t("viewList")}
          </Button>
          <Button
            variant={viewMode === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("kanban")}
            className="rounded-l-none"
          >
            <Kanban className="h-4 w-4 mr-2" />
            {t("viewKanban")}
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {statusFilter ? t(`status_${statusFilter}`) : t("allStatuses")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter(null)}>
              {t("allStatuses")}
            </DropdownMenuItem>
            {statusKeys.map((key) => (
              <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)}>
                {t(`status_${key}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {typeFilter
                ? `${typeIcons[typeFilter] || ""} ${t(`type_${typeFilter}`)}`
                : t("allTypes")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setTypeFilter(null)}>
              {t("allTypes")}
            </DropdownMenuItem>
            {typeKeys.map((key) => (
              <DropdownMenuItem key={key} onClick={() => setTypeFilter(key)}>
                {typeIcons[key]} {t(`type_${key}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Task List / Kanban */}
      {viewMode === "list" ? (
        <>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tasks?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">{t("notFound")}</p>
                <p className="text-muted-foreground mb-4">{t("addFirst")}</p>
                <Link href="/dashboard/tasks/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("createTask")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tasks?.map((task: Task) => {
                const style = statusStyles[task.status] || statusStyles.pending;
                const icon = typeIcons[task.taskType] || "\uD83D\uDCCB";
                const priorityStyle =
                  priorityStyles[task.priority] || priorityStyles.normal;
                const isOverdue =
                  task.dueDate &&
                  new Date(task.dueDate) < new Date() &&
                  !["completed", "rejected"].includes(task.status);

                return (
                  <Card
                    key={task.id}
                    className={`hover:shadow-md transition-shadow ${isOverdue ? "border-red-200" : ""}`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-2xl">{icon}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">
                                #{task.taskNumber} - {typeIcons[task.taskType]}{" "}
                                {t(`type_${task.taskType}`)}
                              </h3>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${style.bgColor} ${style.color}`}
                              >
                                {t(`status_${task.status}`)}
                              </span>
                              {isOverdue && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                                  {t("overdue")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              {task.machine && (
                                <span className="flex items-center gap-1">
                                  <Coffee className="h-3 w-3" />
                                  {task.machine.name}
                                </span>
                              )}
                              {task.assignedTo && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {task.assignedTo.firstName}{" "}
                                  {task.assignedTo.lastName}
                                </span>
                              )}
                              {task.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(task.dueDate).toLocaleDateString(
                                    "ru-RU",
                                  )}
                                </span>
                              )}
                              <span className={priorityStyle}>
                                {"\u25CF"} {t(`priority_${task.priority}`)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {task.status === "assigned" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startMutation.mutate(task.id)}
                              disabled={startMutation.isPending}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              {startMutation.isPending
                                ? t("starting")
                                : t("start")}
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={t("actionsLabel")}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link href={`/dashboard/tasks/${task.id}`}>
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t("actionView")}
                                </DropdownMenuItem>
                              </Link>
                              <Link href={`/dashboard/tasks/${task.id}/edit`}>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t("actionEdit")}
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setConfirmState({
                                    title: t("deleteConfirm"),
                                    action: () =>
                                      deleteMutation.mutate(task.id),
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t("actionDelete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {kanbanLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {(
                ["pending", "assigned", "in_progress", "completed"] as const
              ).map((status) => (
                <div key={status} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${statusColors[status]}`}
                      />
                      {t(`status_${status}`)}
                    </h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {kanbanData?.[status]?.length || 0}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {kanbanData?.[status]?.map((task: Task) => (
                      <Link key={task.id} href={`/dashboard/tasks/${task.id}`}>
                        <Card className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span>{typeIcons[task.taskType]}</span>
                              <span className="text-xs font-medium">
                                #{task.taskNumber}
                              </span>
                            </div>
                            <p className="text-sm font-medium line-clamp-2">
                              {t(`type_${task.taskType}`)}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span
                                className={`text-xs ${priorityStyles[task.priority]}`}
                              >
                                {"\u25CF"} {t(`priority_${task.priority}`)}
                              </span>
                              {task.dueDate && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(task.dueDate).toLocaleDateString(
                                    "ru-RU",
                                  )}
                                </span>
                              )}
                            </div>
                            {task.machine && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                <Coffee className="h-3 w-3 inline mr-1" />
                                {task.machine.name}
                              </p>
                            )}
                            {task.assignedTo && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                <User className="h-3 w-3 inline mr-1" />
                                {task.assignedTo.firstName}{" "}
                                {task.assignedTo.lastName}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                    {(!kanbanData?.[status] ||
                      kanbanData[status].length === 0) && (
                      <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                        {t("noTasks")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
        title={confirmState?.title ?? ""}
        onConfirm={() => confirmState?.action()}
      />
    </div>
  );
}
