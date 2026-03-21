/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * CustomFieldsRenderer — renders admin-defined custom fields for any entity.
 * Reads field definitions from /api/v1/custom-fields/fields?entityType=...
 * Reads/writes values from entity metadata.customFields JSONB.
 *
 * Usage:
 *   <CustomFieldsRenderer
 *     entityType="machine"
 *     entityId={machine.id}
 *     metadata={machine.metadata}
 *     tabName="custom_photos"   // optional: filter by tab
 *     onSave={(values) => updateMachine(id, { metadata: mergedMetadata })}
 *   />
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

interface CustomField {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  fieldLabelUz: string | null;
  fieldType: string;
  isRequired: boolean;
  options: string[] | null;
  defaultValue: string | null;
  placeholder: string | null;
  helpText: string | null;
  validationMin: number | null;
  validationMax: number | null;
}

interface CustomFieldsRendererProps {
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  tabName?: string;
  onSave?: (customFieldValues: Record<string, unknown>) => void;
  readOnly?: boolean;
}

export function CustomFieldsRenderer({
  entityType,
  entityId: _entityId,
  metadata,
  tabName,
  onSave,
  readOnly = false,
}: CustomFieldsRendererProps) {
  const { data: fields, isLoading } = useQuery({
    queryKey: ["custom-fields", entityType, tabName],
    queryFn: async () => {
      const params: any = { entityType };
      if (tabName) params.tabName = tabName;
      const res = await api.get("/custom-fields/fields", { params });
      return (res.data?.data ?? res.data ?? []) as CustomField[];
    },
  });

  const existingValues =
    (metadata?.customFields as Record<string, unknown>) || {};
  const [values, setValues] = useState<Record<string, unknown>>(existingValues);
  const [dirty, setDirty] = useState(false);

  // Sync when metadata changes externally
  useEffect(() => {
    const cv = (metadata?.customFields as Record<string, unknown>) || {};
    setValues(cv);
    setDirty(false);
  }, [metadata]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!fields || fields.length === 0) {
    return null; // No custom fields defined — render nothing
  }

  const updateValue = (key: string, value: unknown) => {
    setValues({ ...values, [key]: value });
    setDirty(true);
  };

  const handleSave = () => {
    onSave?.(values);
    setDirty(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          {tabName || "Дополнительные поля"}
        </CardTitle>
        {!readOnly && onSave && dirty && (
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Сохранить
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => (
            <div key={field.id}>
              <Label>
                {field.fieldLabel}
                {field.isRequired && (
                  <span className="text-red-500 ml-0.5">*</span>
                )}
              </Label>

              {/* TEXT / URL / EMAIL / PHONE */}
              {["text", "url", "email", "phone"].includes(field.fieldType) && (
                <Input
                  type={
                    field.fieldType === "email"
                      ? "email"
                      : field.fieldType === "url"
                        ? "url"
                        : field.fieldType === "phone"
                          ? "tel"
                          : "text"
                  }
                  placeholder={field.placeholder || field.fieldLabel}
                  value={(values[field.fieldKey] as string) || ""}
                  onChange={(e) => updateValue(field.fieldKey, e.target.value)}
                  disabled={readOnly}
                  className="mt-1"
                />
              )}

              {/* TEXTAREA */}
              {field.fieldType === "textarea" && (
                <textarea
                  placeholder={field.placeholder || field.fieldLabel}
                  value={(values[field.fieldKey] as string) || ""}
                  onChange={(e) => updateValue(field.fieldKey, e.target.value)}
                  disabled={readOnly}
                  className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                />
              )}

              {/* NUMBER */}
              {field.fieldType === "number" && (
                <Input
                  type="number"
                  placeholder={field.placeholder || "0"}
                  min={field.validationMin ?? undefined}
                  max={field.validationMax ?? undefined}
                  value={(values[field.fieldKey] as number) ?? ""}
                  onChange={(e) =>
                    updateValue(
                      field.fieldKey,
                      e.target.value ? parseFloat(e.target.value) : null,
                    )
                  }
                  disabled={readOnly}
                  className="mt-1"
                />
              )}

              {/* DATE */}
              {field.fieldType === "date" && (
                <Input
                  type="date"
                  value={(values[field.fieldKey] as string) || ""}
                  onChange={(e) => updateValue(field.fieldKey, e.target.value)}
                  disabled={readOnly}
                  className="mt-1"
                />
              )}

              {/* SELECT */}
              {field.fieldType === "select" && field.options && (
                <Select
                  value={(values[field.fieldKey] as string) || ""}
                  onValueChange={(v) => updateValue(field.fieldKey, v)}
                  disabled={readOnly}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue
                      placeholder={field.placeholder || "Выберите..."}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* BOOLEAN */}
              {field.fieldType === "boolean" && (
                <div className="flex items-center gap-2 mt-2">
                  <Checkbox
                    checked={!!values[field.fieldKey]}
                    onCheckedChange={(c) => updateValue(field.fieldKey, !!c)}
                    disabled={readOnly}
                  />
                  <span className="text-sm">{field.placeholder || "Да"}</span>
                </div>
              )}

              {/* FILE */}
              {field.fieldType === "file" && (
                <Input
                  type="text"
                  placeholder="URL файла"
                  value={(values[field.fieldKey] as string) || ""}
                  onChange={(e) => updateValue(field.fieldKey, e.target.value)}
                  disabled={readOnly}
                  className="mt-1"
                />
              )}

              {/* Help text */}
              {field.helpText && (
                <p className="text-xs text-muted-foreground mt-1">
                  {field.helpText}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
