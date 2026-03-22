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

const MACHINE_TYPES = [
  { value: "coffee", label: "Coffee" },
  { value: "snack", label: "Snack" },
  { value: "drink", label: "Drink" },
  { value: "combo", label: "Combo" },
  { value: "fresh", label: "Fresh" },
  { value: "ice_cream", label: "Ice Cream" },
  { value: "water", label: "Water" },
] as const;

const machineTypeValues = MACHINE_TYPES.map(
  (mt) => mt.value,
) as unknown as readonly [string, ...string[]];

const machineSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  code: z.string().min(1, "Code is required").max(50),
  serialNumber: z.string().min(1, "Serial number is required").max(100),
  type: z.enum(machineTypeValues),
  manufacturer: z.string().max(255).optional().or(z.literal("")),
  model: z.string().max(255).optional().or(z.literal("")),
  slotCount: z.coerce
    .number()
    .int()
    .min(1, "At least 1 slot")
    .max(100, "Max 100 slots"),
});

type MachineFormValues = z.infer<typeof machineSchema>;

export default function NewMachinePage() {
  const t = useTranslations("machines");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const form = useForm<MachineFormValues>({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      name: "",
      code: "",
      serialNumber: "",
      type: "combo",
      manufacturer: "",
      model: "",
      slotCount: 12,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: MachineFormValues) => api.post("/machines", data),
    onSuccess: () => {
      toast.success(t("created") || "Machine created");
      router.push("/dashboard/machines");
    },
    onError: () => {
      toast.error(t("createError") || "Failed to create machine");
    },
  });

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

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("basicInfo") || "Basic Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("name") || "Name"} *</FormLabel>
                      <FormControl>
                        <Input placeholder="Coffee Machine #1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("code") || "Code"} *</FormLabel>
                      <FormControl>
                        <Input placeholder="VH-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("serialNumber") || "Serial Number"} *
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="CF-2024-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          {MACHINE_TYPES.map((mt) => (
                            <SelectItem key={mt.value} value={mt.value}>
                              {mt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("manufacturer") || "Manufacturer"}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Necta" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("model") || "Model"}</FormLabel>
                      <FormControl>
                        <Input placeholder="Krea Touch" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slotCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("slots") || "Slots"}</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
      </Form>
    </div>
  );
}
