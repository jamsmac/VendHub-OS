"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
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

export default function NewMachinePage() {
  const t = useTranslations("machines");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    code: "",
    serialNumber: "",
    type: "combo",
    manufacturer: "",
    model: "",
    slotCount: 12,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post("/machines", form);
    },
    onSuccess: () => {
      toast.success(t("created") || "Machine created");
      router.push("/dashboard/machines");
    },
    onError: () => {
      toast.error(t("createError") || "Failed to create machine");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.serialNumber) {
      toast.error(tCommon("fillRequired") || "Fill required fields");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/machines">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {t("newMachine") || "New Machine"}
        </h1>
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
                  {t("name") || "Name"} *
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Coffee Machine #1"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("code") || "Code"} *
                </label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="VH-001"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("serialNumber") || "Serial Number"} *
                </label>
                <Input
                  value={form.serialNumber}
                  onChange={(e) =>
                    setForm({ ...form, serialNumber: e.target.value })
                  }
                  placeholder="CF-2024-001"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("type") || "Type"}
                </label>
                <Select
                  value={form.type}
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("manufacturer") || "Manufacturer"}
                </label>
                <Input
                  value={form.manufacturer}
                  onChange={(e) =>
                    setForm({ ...form, manufacturer: e.target.value })
                  }
                  placeholder="Necta"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("model") || "Model"}
                </label>
                <Input
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="Krea Touch"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("slots") || "Slots"}
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.slotCount}
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
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Link href="/dashboard/machines">
            <Button variant="outline">{tCommon("cancel") || "Cancel"}</Button>
          </Link>
          <Button type="submit" disabled={mutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {mutation.isPending
              ? tCommon("saving") || "Saving..."
              : tCommon("save") || "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
