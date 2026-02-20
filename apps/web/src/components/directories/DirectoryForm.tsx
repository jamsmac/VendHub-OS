"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type DirectoryFormData = {
  name: string;
  slug: string;
  description?: string;
  type: "MANUAL" | "EXTERNAL" | "PARAM" | "TEMPLATE";
  scope?: "HQ" | "ORGANIZATION" | "LOCATION";
  isHierarchical?: boolean;
};

interface DirectoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DirectoryFormData) => void;
  defaultValues?: Partial<DirectoryFormData>;
  isSubmitting?: boolean;
  title?: string;
  mode?: "create" | "edit";
}

export function DirectoryForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isSubmitting = false,
  title,
  mode = "create",
}: DirectoryFormProps) {
  const t = useTranslations("directories");
  const tCommon = useTranslations("common");

  const directorySchema = React.useMemo(
    () =>
      z.object({
        name: z.string().min(1, t("nameRequired")).max(500),
        slug: z
          .string()
          .min(1, t("slugRequired"))
          .max(200)
          .regex(/^[a-z][a-z0-9_]*$/, t("slugPattern")),
        description: z.string().max(2000).optional().or(z.literal("")),
        type: z.enum(["MANUAL", "EXTERNAL", "PARAM", "TEMPLATE"]),
        scope: z.enum(["HQ", "ORGANIZATION", "LOCATION"]).optional(),
        isHierarchical: z.boolean().optional(),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DirectoryFormData>({
    resolver: zodResolver(directorySchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      type: "MANUAL",
      scope: "HQ",
      isHierarchical: false,
      ...defaultValues,
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        name: "",
        slug: "",
        description: "",
        type: "MANUAL",
        scope: "HQ",
        isHierarchical: false,
        ...defaultValues,
      });
    }
  }, [open, defaultValues, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title || (mode === "create" ? t("createTitle") : t("editTitle"))}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dir-name">{t("formName")} *</Label>
            <Input
              id="dir-name"
              {...register("name")}
              placeholder={t("formNamePlaceholder")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {mode === "create" && (
            <div className="space-y-2">
              <Label htmlFor="dir-slug">{t("formSlug")} *</Label>
              <Input id="dir-slug" {...register("slug")} placeholder="units" />
              {errors.slug && (
                <p className="text-sm text-destructive">
                  {errors.slug.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="dir-description">{t("formDescription")}</Label>
            <Input
              id="dir-description"
              {...register("description")}
              placeholder={t("formDescriptionPlaceholder")}
            />
          </div>

          {mode === "create" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dir-type">{t("formType")} *</Label>
                <select
                  id="dir-type"
                  {...register("type")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="MANUAL">{t("type_manual")}</option>
                  <option value="EXTERNAL">{t("type_external")}</option>
                  <option value="PARAM">{t("type_param")}</option>
                  <option value="TEMPLATE">{t("type_template")}</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dir-scope">{t("formScope")}</Label>
                <select
                  id="dir-scope"
                  {...register("scope")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="HQ">{t("scope_hq")}</option>
                  <option value="ORGANIZATION">
                    {t("scope_organization")}
                  </option>
                  <option value="LOCATION">{t("scope_location")}</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dir-hierarchical"
              {...register("isHierarchical")}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="dir-hierarchical" className="font-normal">
              {t("hierarchical")}
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mode === "create" ? tCommon("create") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
