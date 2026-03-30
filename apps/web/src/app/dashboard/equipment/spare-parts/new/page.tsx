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
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { sparePartsApi } from "@/lib/api";

/**
 * Zod schema aligned with CreateSparePartDto
 * Required: partNumber, name
 * Optional: description, quantity, minQuantity, costPrice, storageLocation
 * Note: supplierId is UUID — we skip it for now (would need a supplier selector)
 */
const sparePartSchema = z.object({
  partNumber: z.string().min(1, "Артикул обязателен").max(100),
  name: z.string().min(1, "Название обязательно").max(200),
  quantity: z.coerce.number().int().min(0).default(0),
  minQuantity: z.coerce.number().int().min(0).default(0),
  costPrice: z.coerce.number().min(0).optional(),
  storageLocation: z.string().max(100).optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
});

type SparePartFormValues = z.infer<typeof sparePartSchema>;

export default function NewSparePartPage() {
  const t = useTranslations("equipment");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const form = useForm<SparePartFormValues>({
    resolver: zodResolver(sparePartSchema),
    defaultValues: {
      partNumber: "",
      name: "",
      quantity: 0,
      minQuantity: 1,
      costPrice: undefined,
      storageLocation: "",
      description: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: SparePartFormValues) => {
      const payload = {
        ...data,
        storageLocation: data.storageLocation || undefined,
        description: data.description || undefined,
      };
      return sparePartsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(t("addSparePart") + " ✓");
      router.push("/dashboard/equipment");
    },
    onError: () => toast.error(tCommon("error")),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/equipment">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t("addSparePart")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("tabSpareParts")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="partNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("colPartNumber")} *</FormLabel>
                      <FormControl>
                        <Input placeholder="SP-000001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("colName")} *</FormLabel>
                      <FormControl>
                        <Input placeholder="Название запчасти" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("colQuantity")} *</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("colMin")} *</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("colCost")} (UZS)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={100}
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="storageLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Место хранения</FormLabel>
                      <FormControl>
                        <Input placeholder="Склад A, полка 3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Описание запасной части..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {mutation.isPending ? "Сохранение..." : tCommon("save")}
                </Button>
                <Link href="/dashboard/equipment">
                  <Button type="button" variant="outline">
                    {tCommon("cancel")}
                  </Button>
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
