"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

/**
 * Must match TaskType enum in @vendhub/shared
 * @see packages/shared/src/types/task.types.ts
 */
const TASK_TYPES = [
  "refill",
  "collection",
  "cleaning",
  "repair",
  "install",
  "removal",
  "audit",
  "inspection",
  "replace_hopper",
  "replace_grinder",
  "replace_brew_unit",
  "replace_mixer",
] as const;

const TASK_TYPE_LABELS: Record<string, string> = {
  refill: "Пополнение",
  collection: "Инкассация",
  cleaning: "Мойка",
  repair: "Ремонт",
  install: "Установка",
  removal: "Демонтаж",
  audit: "Аудит",
  inspection: "Инспекция",
  replace_hopper: "Замена бункера",
  replace_grinder: "Замена кофемолки",
  replace_brew_unit: "Замена заварочного блока",
  replace_mixer: "Замена миксера",
};

const STATUSES = [
  "pending",
  "assigned",
  "in_progress",
  "completed",
  "rejected",
  "postponed",
  "cancelled",
] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  assigned: "Назначена",
  in_progress: "В работе",
  completed: "Завершена",
  rejected: "Отклонена",
  postponed: "Отложена",
  cancelled: "Отменена",
};

const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

const PRIORITY_LABELS: Record<string, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
  urgent: "Срочный",
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, unknown> | null>(null);

  const { isLoading } = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const res = await api.get(`/tasks/${id}`);
      const data = res.data?.data ?? res.data;
      setForm({
        title: data.title || "",
        description: data.description || "",
        type: data.typeCode || data.type || "refill",
        status: data.status || "pending",
        priority: data.priority || "normal",
        dueDate: data.dueDate ? data.dueDate.split("T")[0] : "",
        taskNumber: data.taskNumber || "",
        assignedTo: data.assignedTo?.firstName
          ? `${data.assignedTo?.firstName} ${data.assignedTo?.lastName || ""}`
          : "",
        machine: data.machine?.name || "",
      });
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const dueDate = form?.dueDate
        ? new Date(form.dueDate as string).toISOString()
        : undefined;
      return api.patch(`/tasks/${id}`, {
        title: form?.title,
        description: (form?.description as string) || undefined,
        status: form?.status,
        priority: form?.priority,
        dueDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Deleted");
      router.push("/dashboard/tasks");
    },
    onError: () => toast.error("Failed to delete"),
  });

  if (isLoading || !form)
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/tasks">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">
              {form.taskNumber as string}
            </p>
            <h1 className="text-2xl font-bold">{form.title as string}</h1>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm("Delete this task?")) deleteMutation.mutate();
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {tCommon("delete") || "Delete"}
        </Button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateMutation.mutate();
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("taskDetails") || "Task Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {t("title") || "Title"}
              </label>
              <Input
                value={form.title as string}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                {t("description") || "Description"}
              </label>
              <Input
                value={form.description as string}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("type") || "Type"}
                </label>
                <Select
                  value={form.type as string}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map((tt) => (
                      <SelectItem key={tt} value={tt}>
                        {TASK_TYPE_LABELS[tt] ?? tt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("status") || "Status"}
                </label>
                <Select
                  value={form.status as string}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s] ?? s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("priority") || "Priority"}
                </label>
                <Select
                  value={form.priority as string}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_LABELS[p] ?? p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("dueDate") || "Due Date"}
                </label>
                <Input
                  type="date"
                  value={form.dueDate as string}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("assignedTo") || "Assigned To"}
                </label>
                <Input
                  value={form.assignedTo as string}
                  disabled
                  className="mt-1 bg-muted"
                />
              </div>
            </div>
            {form.machine ? (
              <div>
                <label className="text-sm font-medium">
                  {t("machine") || "Machine"}
                </label>
                <Input
                  value={form.machine as string}
                  disabled
                  className="mt-1 bg-muted"
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
        <div className="flex justify-end gap-3 mt-6">
          <Link href="/dashboard/tasks">
            <Button variant="outline">{tCommon("cancel") || "Cancel"}</Button>
          </Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : tCommon("save") || "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
