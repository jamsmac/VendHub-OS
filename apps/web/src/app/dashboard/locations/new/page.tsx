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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { api } from "@/lib/api";

/**
 * Zod schema aligned with CreateLocationDto
 * Required: name, address (AddressDto), city, latitude, longitude
 * Optional: primary_contact_name, primary_contact_phone
 * Note: Backend address field is a complex AddressDto object (country, region, city, street, building)
 *       We use a flat 'street' field in the form and build the AddressDto in the mutation
 */
const locationSchema = z.object({
  name: z.string().min(1, "Название обязательно").max(255),
  street: z.string().min(1, "Адрес обязателен").max(255),
  building: z.string().max(50).optional().or(z.literal("")),
  city: z.string().min(1, "Город обязателен").max(100),
  region: z.string().max(100).optional().or(z.literal("")),
  latitude: z.coerce.number({ invalid_type_error: "Должно быть числом" }),
  longitude: z.coerce.number({ invalid_type_error: "Должно быть числом" }),
  primary_contact_name: z.string().max(255).optional().or(z.literal("")),
  primary_contact_phone: z.string().max(50).optional().or(z.literal("")),
});

type LocationFormValues = z.infer<typeof locationSchema>;

export default function NewLocationPage() {
  const t = useTranslations("locations");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: "",
      street: "",
      building: "",
      city: "Tashkent",
      region: "Toshkent viloyati",
      latitude: 0,
      longitude: 0,
      primary_contact_name: "",
      primary_contact_phone: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: LocationFormValues) => {
      // Build AddressDto object from flat form fields
      const payload = {
        name: data.name,
        city: data.city,
        region: data.region || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        primary_contact_name: data.primary_contact_name || undefined,
        primary_contact_phone: data.primary_contact_phone || undefined,
        address: {
          country: "Uzbekistan",
          region: data.region || "Toshkent viloyati",
          city: data.city,
          street: data.street,
          building: data.building || "1",
        },
      };
      return api.post("/locations", payload);
    },
    onSuccess: () => {
      toast.success("Location created");
      router.push("/dashboard/locations");
    },
    onError: () => toast.error("Failed to create location"),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/locations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {t("newLocation") || "New Location"}
        </h1>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("locationInfo") || "Location Info"}
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("city") || "City"}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("address") || "Улица"} *</FormLabel>
                      <FormControl>
                        <Input placeholder="Amir Temur ko'chasi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="building"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Здание</FormLabel>
                      <FormControl>
                        <Input placeholder="15A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Регион</FormLabel>
                    <FormControl>
                      <Input placeholder="Toshkent viloyati" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="primary_contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contactPerson") || "Контактное лицо"}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="primary_contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("phone") || "Телефон"}</FormLabel>
                      <FormControl>
                        <Input placeholder="+998901234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-3 mt-6">
            <Link href="/dashboard/locations">
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
