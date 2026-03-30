"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(1000).optional().default(""),
  type: z.enum(TASK_TYPES),
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
  dueDate: z.string().optional().default(""),
  taskNumber: z.string().optional().default(""),
  assignedTo: z.string().optional().default(""),
  machine: z.string().optional().default(""),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "refill",
      status: "pending",
      priority: "normal",
      dueDate: "",
      taskNumber: "",
      assignedTo: "",
      machine: "",
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const res = await api.get(`/tasks/${id}`);
      return res.data?.data ?? res.data;
    },
  });

  useEffect(() => {
    if (!data) return;
    form.reset({
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
  }, [data, form]);

  const updateMutation = useMutation({
    mutationFn: (values: TaskFormValues) => {
      const dueDate = values.dueDate
        ? new Date(values.dueDate).toISOString()
        : undefined;
      return api.patch(`/tasks/${id}`, {
        title: values.title,
        description: values.description || undefined,
        status: values.status,
        priority: values.priority,
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

  const onSubmit = form.handleSubmit((values) => updateMutation.mutate(values));

  if (isLoading || !data)
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
              {form.watch("taskNumber")}
            </p>
            <h1 className="text-2xl font-bold">{form.watch("title")}</h1>
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
      <form onSubmit={onSubmit}>
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
              <Input {...form.register("title")} className="mt-1" />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">
                {t("description") || "Description"}
              </label>
              <Input {...form.register("description")} className="mt-1" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("type") || "Type"}
                </label>
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
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
                  )}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("status") || "Status"}
                </label>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
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
                  )}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("priority") || "Priority"}
                </label>
                <Controller
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
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
                  )}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("dueDate") || "Due Date"}
                </label>
                <Input
                  type="date"
                  {...form.register("dueDate")}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("assignedTo") || "Assigned To"}
                </label>
                <Input
                  value={form.watch("assignedTo")}
                  disabled
                  className="mt-1 bg-muted"
                />
              </div>
            </div>
            {form.watch("machine") ? (
              <div>
                <label className="text-sm font-medium">
                  {t("machine") || "Machine"}
                </label>
                <Input
                  value={form.watch("machine")}
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
