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

const TASK_TYPE_KEYS: Record<string, string> = {
  refill: "type_refill",
  collection: "type_collection",
  cleaning: "type_cleaning",
  repair: "type_repair",
  install: "type_install",
  removal: "type_removal",
  audit: "type_audit",
  inspection: "type_inspection",
  replace_hopper: "type_replace_hopper",
  replace_grinder: "type_replace_grinder",
  replace_brew_unit: "type_replace_brew_unit",
  replace_mixer: "type_replace_mixer",
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

const STATUS_KEYS: Record<string, string> = {
  pending: "status_pending",
  assigned: "status_assigned",
  in_progress: "status_in_progress",
  completed: "status_completed",
  rejected: "status_rejected",
  postponed: "status_postponed",
  cancelled: "status_cancelled",
};

const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

const PRIORITY_KEYS: Record<string, string> = {
  low: "priority_low",
  normal: "priority_normal",
  high: "priority_high",
  urgent: "priority_urgent",
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
      toast.success(t("taskUpdated"));
    },
    onError: () => toast.error(t("taskUpdateError")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(t("taskDeleted"));
      router.push("/dashboard/tasks");
    },
    onError: () => toast.error(t("taskDeleteError")),
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
            if (confirm(t("deleteTaskConfirm"))) deleteMutation.mutate();
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {tCommon("delete")}
        </Button>
      </div>
      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("taskDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("title")}</label>
              <Input {...form.register("title")} className="mt-1" />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">{t("description")}</label>
              <Input {...form.register("description")} className="mt-1" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">{t("type")}</label>
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
                            {TASK_TYPE_KEYS[tt] ? t(TASK_TYPE_KEYS[tt]) : tt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("status")}</label>
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
                            {STATUS_KEYS[s] ? t(STATUS_KEYS[s]) : s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("priority")}</label>
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
                            {PRIORITY_KEYS[p] ? t(PRIORITY_KEYS[p]) : p}
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
                <label className="text-sm font-medium">{t("dueDate")}</label>
                <Input
                  type="date"
                  {...form.register("dueDate")}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("assignedTo")}</label>
                <Input
                  value={form.watch("assignedTo")}
                  disabled
                  className="mt-1 bg-muted"
                />
              </div>
            </div>
            {form.watch("machine") ? (
              <div>
                <label className="text-sm font-medium">{t("machine")}</label>
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
            <Button variant="outline">{tCommon("cancel")}</Button>
          </Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? tCommon("saving") : tCommon("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
