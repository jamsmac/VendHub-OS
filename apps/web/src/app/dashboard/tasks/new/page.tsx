"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

const PRIORITY_LABELS: Record<string, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
  urgent: "Срочный",
};

/**
 * Zod schema aligned with CreateTaskDto
 * Required: title, type
 * Optional: description, priority (default: normal), dueDate
 * Note: organizationId is injected by backend from JWT token
 */
const taskSchema = z.object({
  title: z.string().min(1, "Название обязательно").max(255),
  description: z.string().max(1000).optional().or(z.literal("")),
  type: z.enum(TASK_TYPES),
  priority: z.enum(PRIORITIES),
  dueDate: z.string().optional().or(z.literal("")),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function NewTaskPage() {
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "refill",
      priority: "normal",
      dueDate: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: TaskFormValues) => {
      const payload = {
        ...data,
        description: data.description || undefined,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      };
      return api.post("/tasks", payload);
    },
    onSuccess: () => {
      toast.success("Задача создана");
      router.push("/dashboard/tasks");
    },
    onError: () => toast.error("Ошибка создания задачи"),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/tasks">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("newTask") || "New Task"}</h1>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("taskDetails") || "Task Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("title") || "Title"} *</FormLabel>
                    <FormControl>
                      <Input placeholder="Refill machine VH-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("description") || "Description"}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("type") || "Type"}</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TASK_TYPES.map((tt) => (
                            <SelectItem key={tt} value={tt}>
                              {TASK_TYPE_LABELS[tt] ?? tt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("priority") || "Priority"}</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRIORITIES.map((p) => (
                            <SelectItem key={p} value={p}>
                              {PRIORITY_LABELS[p] ?? p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("dueDate") || "Due Date"}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-3 mt-6">
            <Link href="/dashboard/tasks">
              <Button variant="outline">{tCommon("cancel") || "Cancel"}</Button>
            </Link>
            <Button type="submit" disabled={mutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {mutation.isPending ? "Saving..." : tCommon("save") || "Save"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
