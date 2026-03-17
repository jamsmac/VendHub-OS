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

const MACHINE_TYPES = [
  { value: "coffee", label: "Coffee" },
  { value: "snack", label: "Snack" },
  { value: "drink", label: "Drink" },
  { value: "combo", label: "Combo" },
  { value: "fresh", label: "Fresh" },
  { value: "ice_cream", label: "Ice Cream" },
  { value: "water", label: "Water" },
];

const MACHINE_STATUSES = [
  { value: "active", label: "Active" },
  { value: "low_stock", label: "Low Stock" },
  { value: "error", label: "Error" },
  { value: "maintenance", label: "Maintenance" },
  { value: "offline", label: "Offline" },
  { value: "disabled", label: "Disabled" },
];

export default function MachineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("machines");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<Record<string, unknown> | null>(null);

  const { isLoading } = useQuery({
    queryKey: ["machine", id],
    queryFn: async () => {
      const res = await api.get(`/machines/${id}`);
      const data = res.data?.data ?? res.data;
      setForm({
        name: data.name || "",
        type: data.type || "combo",
        status: data.status || "active",
        manufacturer: data.manufacturer || "",
        model: data.model || "",
        slotCount: data.slotCount || 0,
        serialNumber: data.serialNumber || "",
        machineNumber: data.machineNumber || "",
      });
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/machines/${id}`, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      queryClient.invalidateQueries({ queryKey: ["machine", id] });
      toast.success(t("updated") || "Machine updated");
    },
    onError: () => {
      toast.error(t("updateError") || "Failed to update machine");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/machines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      toast.success(t("deleted") || "Machine deleted");
      router.push("/dashboard/machines");
    },
    onError: () => {
      toast.error(t("deleteError") || "Failed to delete machine");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  if (isLoading || !form) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/machines">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            {(form.name as string) || t("editMachine") || "Edit Machine"}
          </h1>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm(t("confirmDelete") || "Delete this machine?")) {
              deleteMutation.mutate();
            }
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {tCommon("delete") || "Delete"}
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("basicInfo") || "Basic Information"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("name") || "Name"}
                </label>
                <Input
                  value={form.name as string}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("machineNumber") || "Machine Number"}
                </label>
                <Input
                  value={form.machineNumber as string}
                  disabled
                  className="mt-1 bg-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    {MACHINE_TYPES.map((mt) => (
                      <SelectItem key={mt.value} value={mt.value}>
                        {mt.label}
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
                    {MACHINE_STATUSES.map((ms) => (
                      <SelectItem key={ms.value} value={ms.value}>
                        {ms.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("manufacturer") || "Manufacturer"}
                </label>
                <Input
                  value={form.manufacturer as string}
                  onChange={(e) =>
                    setForm({ ...form, manufacturer: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("model") || "Model"}
                </label>
                <Input
                  value={form.model as string}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("slots") || "Slots"}
                </label>
                <Input
                  type="number"
                  value={form.slotCount as number}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      slotCount: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">
                {t("serialNumber") || "Serial Number"}
              </label>
              <Input
                value={form.serialNumber as string}
                disabled
                className="mt-1 bg-muted"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Link href="/dashboard/machines">
            <Button variant="outline">{tCommon("cancel") || "Cancel"}</Button>
          </Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending
              ? tCommon("saving") || "Saving..."
              : tCommon("save") || "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
