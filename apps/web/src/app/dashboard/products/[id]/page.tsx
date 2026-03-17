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

const CATEGORIES = [
  "coffee_beans",
  "coffee_instant",
  "tea",
  "chocolate",
  "milk",
  "sugar",
  "cream",
  "syrup",
  "water",
  "hot_drinks",
  "cold_drinks",
  "snacks",
  "cups",
  "lids",
  "stirrers",
  "other",
];
const STATUSES = ["active", "inactive", "discontinued", "out_of_stock"];

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("products");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, unknown> | null>(null);

  const { isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await api.get(`/products/${id}`);
      const data = res.data?.data ?? res.data;
      setForm({
        name: data.name || "",
        sku: data.sku || "",
        category: data.category || "other",
        status: data.status || "active",
        sellingPrice: data.sellingPrice ?? data.price ?? 0,
        costPrice: data.costPrice ?? 0,
        barcode: data.barcode || "",
        description: data.description || "",
      });
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => api.patch(`/products/${id}`, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Deleted");
      router.push("/dashboard/products");
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
          <Link href="/dashboard/products">
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
            if (confirm("Delete this product?")) deleteMutation.mutate();
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
              {t("basicInfo") || "Basic Info"}
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
                <label className="text-sm font-medium">SKU</label>
                <Input
                  value={form.sku as string}
                  disabled
                  className="mt-1 bg-muted"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("category") || "Category"}
                </label>
                <Select
                  value={form.category as string}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.replace(/_/g, " ")}
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
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("sellingPrice") || "Price"} (UZS)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.sellingPrice as number}
                  onChange={(e) =>
                    setForm({ ...form, sellingPrice: +e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("costPrice") || "Cost"} (UZS)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.costPrice as number}
                  onChange={(e) =>
                    setForm({ ...form, costPrice: +e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("barcode") || "Barcode"}
                </label>
                <Input
                  value={form.barcode as string}
                  onChange={(e) =>
                    setForm({ ...form, barcode: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
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
          </CardContent>
        </Card>
        <div className="flex justify-end gap-3 mt-6">
          <Link href="/dashboard/products">
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
