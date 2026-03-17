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
import { api } from "@/lib/api";

export default function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("locations");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, unknown> | null>(null);

  const { isLoading } = useQuery({
    queryKey: ["location", id],
    queryFn: async () => {
      const res = await api.get(`/locations/${id}`);
      const data = res.data?.data ?? res.data;
      setForm({
        name: data.name || "",
        address: data.address || "",
        city: data.city || "",
        latitude: data.latitude ?? 0,
        longitude: data.longitude ?? 0,
        contactPerson: data.contactPerson || "",
        contactPhone: data.contactPhone || data.phone || "",
        status: data.status || "active",
        machinesCount: data.machinesCount ?? data.machines?.length ?? 0,
      });
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.patch(`/locations/${id}`, {
        name: form?.name,
        address: form?.address,
        city: form?.city,
        latitude: form?.latitude,
        longitude: form?.longitude,
        contactPerson: form?.contactPerson,
        contactPhone: form?.contactPhone,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/locations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Deleted");
      router.push("/dashboard/locations");
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
          <Link href="/dashboard/locations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{form.name as string}</h1>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm("Delete this location?")) deleteMutation.mutate();
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
              {t("locationInfo") || "Location Info"}
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
                  {t("city") || "City"}
                </label>
                <Input
                  value={form.city as string}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">
                {t("address") || "Address"}
              </label>
              <Input
                value={form.address as string}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("contactPerson") || "Contact"}
                </label>
                <Input
                  value={form.contactPerson as string}
                  onChange={(e) =>
                    setForm({ ...form, contactPerson: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("phone") || "Phone"}
                </label>
                <Input
                  value={form.contactPhone as string}
                  onChange={(e) =>
                    setForm({ ...form, contactPhone: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Latitude</label>
                <Input
                  type="number"
                  step="any"
                  value={form.latitude as number}
                  onChange={(e) =>
                    setForm({ ...form, latitude: +e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Longitude</label>
                <Input
                  type="number"
                  step="any"
                  value={form.longitude as number}
                  onChange={(e) =>
                    setForm({ ...form, longitude: +e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("machines") || "Machines"}
                </label>
                <Input
                  value={form.machinesCount as number}
                  disabled
                  className="mt-1 bg-muted"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-3 mt-6">
          <Link href="/dashboard/locations">
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
