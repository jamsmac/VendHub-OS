"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { washingSchedulesApi, machinesApi } from "@/lib/api";

/**
 * Frequency presets map to frequencyDays (integer) in CreateWashingScheduleDto
 * The backend stores frequency as an integer (number of days between washes)
 */
const FREQUENCY_PRESETS = [
  { value: "1", label: "Ежедневно", days: 1 },
  { value: "7", label: "Еженедельно", days: 7 },
  { value: "14", label: "Каждые 2 недели", days: 14 },
  { value: "30", label: "Ежемесячно", days: 30 },
] as const;

/**
 * Zod schema aligned with CreateWashingScheduleDto
 * Required: machineId (UUID), frequencyDays (int ≥ 1), nextWashDate (Date)
 * Optional: notes
 */
const washingSchema = z.object({
  machineId: z.string().min(1, "Автомат обязателен"),
  frequencyDays: z.string().min(1, "Частота обязательна"),
  nextWashDate: z.string().min(1, "Дата следующей мойки обязательна"),
  notes: z.string().optional().or(z.literal("")),
});

type WashingFormValues = z.infer<typeof washingSchema>;

export default function NewWashingSchedulePage() {
  const t = useTranslations("equipment");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const { data: machines } = useQuery({
    queryKey: ["machines-list"],
    queryFn: () => machinesApi.getAll().then((res) => res.data?.data || []),
  });

  const form = useForm<WashingFormValues>({
    resolver: zodResolver(washingSchema),
    defaultValues: {
      machineId: "",
      frequencyDays: "7",
      nextWashDate: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: WashingFormValues) => {
      const payload = {
        machineId: data.machineId,
        frequencyDays: parseInt(data.frequencyDays, 10),
        nextWashDate: new Date(data.nextWashDate).toISOString(),
        notes: data.notes || undefined,
      };
      return washingSchedulesApi.create(payload);
    },
    onSuccess: () => {
      toast.success(t("createSchedule") + " ✓");
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
          <h1 className="text-2xl font-bold">{t("createSchedule")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("tabWashing")}</CardTitle>
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
                  name="machineId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("colMachine")} *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите автомат" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(machines as Array<{ id: string; name: string }> || []).map(
                            (m: { id: string; name: string }) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="frequencyDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("colFrequency")} *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FREQUENCY_PRESETS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label} ({f.days} дн.)
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
                  name="nextWashDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("colNextWash")} *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Заметки</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Инструкции по мойке..."
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
