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
 * Must match EmployeeRole enum in backend entity
 * @see apps/api/src/modules/employees/entities/employee.entity.ts
 */
const EMPLOYEE_ROLES = [
  "operator",
  "technician",
  "warehouse",
  "driver",
  "manager",
  "accountant",
  "supervisor",
] as const;

const ROLE_LABELS: Record<string, string> = {
  operator: "Оператор",
  technician: "Техник",
  warehouse: "Склад",
  driver: "Водитель",
  manager: "Менеджер",
  accountant: "Бухгалтер",
  supervisor: "Супервайзер",
};

/**
 * Must match EmployeeStatus enum in backend entity
 */
const STATUSES = ["active", "inactive", "on_leave", "suspended", "terminated"] as const;

const STATUS_LABELS: Record<string, string> = {
  active: "Активный",
  inactive: "Неактивный",
  on_leave: "В отпуске",
  suspended: "Приостановлен",
  terminated: "Уволен",
};

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, unknown> | null>(null);

  const { isLoading } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const res = await api.get(`/employees/${id}`);
      const data = res.data?.data ?? res.data;
      setForm({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        employeeRole: data.employeeRole || "operator",
        status: data.status || "active",
        phone: data.phone || "",
        email: data.email || "",
        inn: data.inn || "",
        hireDate: data.hireDate ? data.hireDate.split("T")[0] : "",
        salary: data.salary ?? 0,
        employeeNumber: data.employeeNumber || "",
      });
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.patch(`/employees/${id}`, {
        firstName: form?.firstName,
        lastName: form?.lastName,
        employeeRole: form?.employeeRole,
        status: form?.status,
        phone: (form?.phone as string) || undefined,
        email: (form?.email as string) || undefined,
        salary: form?.salary,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Deleted");
      router.push("/dashboard/employees");
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
          <Link href="/dashboard/employees">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">
              {form.employeeNumber as string}
            </p>
            <h1 className="text-2xl font-bold">
              {form.firstName as string} {form.lastName as string}
            </h1>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm("Delete this employee?")) deleteMutation.mutate();
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
              {t("personalInfo") || "Personal Info"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("firstName") || "First Name"}
                </label>
                <Input
                  value={form.firstName as string}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("lastName") || "Last Name"}
                </label>
                <Input
                  value={form.lastName as string}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("position") || "Должность"}
                </label>
                <Select
                  value={form.employeeRole as string}
                  onValueChange={(v) => setForm({ ...form, employeeRole: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role] ?? role}
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
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("phone") || "Phone"}
                </label>
                <Input
                  value={form.phone as string}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={form.email as string}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">INN</label>
                <Input
                  value={form.inn as string}
                  disabled
                  className="mt-1 bg-muted"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("hireDate") || "Hire Date"}
                </label>
                <Input
                  value={form.hireDate as string}
                  disabled
                  className="mt-1 bg-muted"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("salary") || "Salary"} (UZS)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.salary as number}
                  onChange={(e) =>
                    setForm({ ...form, salary: +e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-3 mt-6">
          <Link href="/dashboard/employees">
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
