"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import { api } from "@/lib/api";

const locationFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  street: z.string().min(1, "Street is required").max(255),
  building: z.string().max(50).optional().default(""),
  city: z.string().min(1, "City is required").max(100),
  region: z.string().max(100).optional().default(""),
  latitude: z.coerce.number().min(-90).max(90).default(0),
  longitude: z.coerce.number().min(-180).max(180).default(0),
  primaryContactName: z.string().max(200).optional().default(""),
  primaryContactPhone: z.string().max(20).optional().default(""),
  machinesCount: z.coerce.number().default(0),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

export default function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("locations");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: "",
      street: "",
      building: "",
      city: "",
      region: "",
      latitude: 0,
      longitude: 0,
      primaryContactName: "",
      primaryContactPhone: "",
      machinesCount: 0,
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["location", id],
    queryFn: async () => {
      const res = await api.get(`/locations/${id}`);
      return res.data?.data ?? res.data;
    },
  });

  useEffect(() => {
    if (!data) return;
    // Extract street/building from AddressDto if present
    const addr = data.address;
    const street =
      typeof addr === "object" && addr
        ? addr.street || ""
        : typeof addr === "string"
          ? addr
          : "";
    const building =
      typeof addr === "object" && addr ? addr.building || "" : "";
    form.reset({
      name: data.name || "",
      street,
      building,
      city: data.city || "",
      region: data.region || "",
      latitude: data.latitude ?? 0,
      longitude: data.longitude ?? 0,
      primaryContactName: data.primary_contact_name || data.contactPerson || "",
      primaryContactPhone:
        data.primary_contact_phone || data.contactPhone || data.phone || "",
      machinesCount: data.machinesCount ?? data.machines?.length ?? 0,
    });
  }, [data, form]);

  const updateMutation = useMutation({
    mutationFn: (values: LocationFormValues) => {
      const city = values.city || "Tashkent";
      const region = values.region || "";
      return api.patch(`/locations/${id}`, {
        name: values.name,
        city,
        region: region || undefined,
        latitude: values.latitude,
        longitude: values.longitude,
        primary_contact_name: values.primaryContactName || undefined,
        primary_contact_phone: values.primaryContactPhone || undefined,
        address: {
          country: "Uzbekistan",
          region: region || "Toshkent viloyati",
          city,
          street: values.street || "",
          building: values.building || "1",
        },
      });
    },
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
          <Link href="/dashboard/locations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{form.watch("name")}</h1>
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
      <form onSubmit={onSubmit}>
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
                <Input {...form.register("name")} className="mt-1" />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("city") || "City"}
                </label>
                <Input {...form.register("city")} className="mt-1" />
                {form.formState.errors.city && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.city.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("address") || "Улица"} *
                </label>
                <Input
                  {...form.register("street")}
                  placeholder="Amir Temur ko'chasi"
                  className="mt-1"
                />
                {form.formState.errors.street && (
                  <p className="text-xs text-destructive mt-1">
                    {form.formState.errors.street.message}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Здание</label>
                <Input
                  {...form.register("building")}
                  placeholder="15A"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Регион</label>
              <Input
                {...form.register("region")}
                placeholder="Toshkent viloyati"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("contactPerson") || "Контактное лицо"}
                </label>
                <Input
                  {...form.register("primaryContactName")}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("phone") || "Телефон"}
                </label>
                <Input
                  {...form.register("primaryContactPhone")}
                  placeholder="+998901234567"
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
                  {...form.register("latitude")}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Longitude</label>
                <Input
                  type="number"
                  step="any"
                  {...form.register("longitude")}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("machines") || "Machines"}
                </label>
                <Input
                  value={form.watch("machinesCount")}
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
