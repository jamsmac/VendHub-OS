"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Search,
  Edit,
  Trash2,
  Lock,
  Box,
  Layers,
  Cpu,
  Banknote,
  CreditCard,
  QrCode,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { machineTemplatesApi } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ContainerTemplate {
  slotNumber: number;
  name: string;
  capacity: number;
  unit: string;
  minLevel?: number;
}

interface SlotTemplate {
  slotNumber: string;
  capacity: number;
}

interface ComponentTemplate {
  componentType: string;
  name: string;
}

interface MachineTemplate {
  id: string;
  name: string;
  type: string;
  contentModel: string;
  manufacturer?: string;
  model?: string;
  description?: string;
  imageUrl?: string;
  maxProductSlots: number;
  defaultContainers: ContainerTemplate[];
  defaultSlots: SlotTemplate[];
  defaultComponents: ComponentTemplate[];
  acceptsCash: boolean;
  acceptsCard: boolean;
  acceptsQr: boolean;
  acceptsNfc: boolean;
  isSystem: boolean;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MACHINE_TYPE_KEYS: Record<string, string> = {
  coffee: "machineTypeCoffee",
  snack: "machineTypeSnack",
  drink: "machineTypeDrink",
  combo: "machineTypeCombo",
  fresh: "machineTypeFresh",
  ice_cream: "machineTypeIceCream",
  water: "machineTypeWater",
};

const MACHINE_TYPE_ICONS: Record<string, string> = {
  coffee: "☕",
  snack: "🍫",
  drink: "🥤",
  combo: "🍱",
  fresh: "🥗",
  ice_cream: "🍦",
  water: "💧",
};

const CONTENT_MODEL_KEYS: Record<string, string> = {
  containers: "contentModelContainers",
  slots: "contentModelSlots",
  mixed: "contentModelMixed",
};

const CONTENT_MODEL_COLORS: Record<string, string> = {
  containers: "bg-amber-500/10 text-amber-600",
  slots: "bg-blue-500/10 text-blue-600",
  mixed: "bg-purple-500/10 text-purple-600",
};

// ─── Create/Edit Form State ─────────────────────────────────────────────────

interface TemplateFormData {
  name: string;
  type: string;
  contentModel: string;
  manufacturer: string;
  model: string;
  description: string;
  maxProductSlots: number;
  acceptsCash: boolean;
  acceptsCard: boolean;
  acceptsQr: boolean;
  acceptsNfc: boolean;
  isActive: boolean;
  defaultContainers: ContainerTemplate[];
  defaultSlots: SlotTemplate[];
  defaultComponents: ComponentTemplate[];
}

const EMPTY_FORM: TemplateFormData = {
  name: "",
  type: "coffee",
  contentModel: "containers",
  manufacturer: "",
  model: "",
  description: "",
  maxProductSlots: 0,
  acceptsCash: true,
  acceptsCard: false,
  acceptsQr: false,
  acceptsNfc: false,
  isActive: true,
  defaultContainers: [],
  defaultSlots: [],
  defaultComponents: [],
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function MachineTemplatesPage() {
  const t = useTranslations("references.machineTemplates");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] =
    useState<MachineTemplate | null>(null);
  const [viewTemplate, setViewTemplate] = useState<MachineTemplate | null>(
    null,
  );
  const [form, setForm] = useState<TemplateFormData>(EMPTY_FORM);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const { data: templates = [], isLoading } = useQuery<MachineTemplate[]>({
    queryKey: ["machine-templates"],
    queryFn: () =>
      machineTemplatesApi.getAll().then((res) => res.data?.data ?? res.data),
  });

  const filtered = templates.filter((tpl) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const typeLabel = MACHINE_TYPE_KEYS[tpl.type]
      ? t(MACHINE_TYPE_KEYS[tpl.type])
      : "";
    return (
      tpl.name.toLowerCase().includes(q) ||
      (tpl.manufacturer ?? "").toLowerCase().includes(q) ||
      (tpl.model ?? "").toLowerCase().includes(q) ||
      typeLabel.toLowerCase().includes(q)
    );
  });

  // ─── Mutations ──────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: TemplateFormData) => machineTemplatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine-templates"] });
      toast.success(t("toastCreated"));
      closeDialog();
    },
    onError: () => toast.error(t("toastCreateError")),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<TemplateFormData>;
    }) => machineTemplatesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine-templates"] });
      toast.success(t("toastUpdated"));
      closeDialog();
    },
    onError: () => toast.error(t("toastUpdateError")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => machineTemplatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine-templates"] });
      toast.success(t("toastDeleted"));
      setDeleteId(null);
    },
    onError: () => toast.error(t("toastDeleteError")),
  });

  // ─── Dialog Helpers ─────────────────────────────────────────────────────

  function openCreate() {
    setEditingTemplate(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(t: MachineTemplate) {
    setEditingTemplate(t);
    setForm({
      name: t.name,
      type: t.type,
      contentModel: t.contentModel,
      manufacturer: t.manufacturer ?? "",
      model: t.model ?? "",
      description: t.description ?? "",
      maxProductSlots: t.maxProductSlots,
      acceptsCash: t.acceptsCash,
      acceptsCard: t.acceptsCard,
      acceptsQr: t.acceptsQr,
      acceptsNfc: t.acceptsNfc,
      isActive: t.isActive,
      defaultContainers: t.defaultContainers ?? [],
      defaultSlots: t.defaultSlots ?? [],
      defaultComponents: t.defaultComponents ?? [],
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingTemplate(null);
    setForm(EMPTY_FORM);
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  // ─── Container/Slot/Component Editors ───────────────────────────────────

  function addContainer() {
    setForm((f) => ({
      ...f,
      defaultContainers: [
        ...f.defaultContainers,
        {
          slotNumber: f.defaultContainers.length + 1,
          name: "",
          capacity: 1000,
          unit: "g",
        },
      ],
    }));
  }

  function updateContainer(idx: number, patch: Partial<ContainerTemplate>) {
    setForm((f) => ({
      ...f,
      defaultContainers: f.defaultContainers.map((c, i) =>
        i === idx ? { ...c, ...patch } : c,
      ),
    }));
  }

  function removeContainer(idx: number) {
    setForm((f) => ({
      ...f,
      defaultContainers: f.defaultContainers.filter((_, i) => i !== idx),
    }));
  }

  function addSlot() {
    const nextNum = form.defaultSlots.length + 1;
    const letter = String.fromCharCode(65 + Math.floor((nextNum - 1) / 10));
    const digit = ((nextNum - 1) % 10) + 1;
    setForm((f) => ({
      ...f,
      defaultSlots: [
        ...f.defaultSlots,
        { slotNumber: `${letter}${digit}`, capacity: 10 },
      ],
    }));
  }

  function updateSlot(idx: number, patch: Partial<SlotTemplate>) {
    setForm((f) => ({
      ...f,
      defaultSlots: f.defaultSlots.map((s, i) =>
        i === idx ? { ...s, ...patch } : s,
      ),
    }));
  }

  function removeSlot(idx: number) {
    setForm((f) => ({
      ...f,
      defaultSlots: f.defaultSlots.filter((_, i) => i !== idx),
    }));
  }

  function addComponent() {
    setForm((f) => ({
      ...f,
      defaultComponents: [
        ...f.defaultComponents,
        { componentType: "other", name: "" },
      ],
    }));
  }

  function updateComponent(idx: number, patch: Partial<ComponentTemplate>) {
    setForm((f) => ({
      ...f,
      defaultComponents: f.defaultComponents.map((c, i) =>
        i === idx ? { ...c, ...patch } : c,
      ),
    }));
  }

  function removeComponent(idx: number) {
    setForm((f) => ({
      ...f,
      defaultComponents: f.defaultComponents.filter((_, i) => i !== idx),
    }));
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/references">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          {t("newTemplate")}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? t("notFoundSearch") : t("noTemplates")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">{t("colType")}</TableHead>
                <TableHead>{t("colName")}</TableHead>
                <TableHead>{t("colContentModel")}</TableHead>
                <TableHead className="text-center">
                  {t("colContainers")}
                </TableHead>
                <TableHead className="text-center">{t("colSlots")}</TableHead>
                <TableHead className="text-center">
                  {t("colComponents")}
                </TableHead>
                <TableHead>{t("colPayment")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setViewTemplate(t);
                    setDetailOpen(true);
                  }}
                >
                  <TableCell className="text-2xl text-center">
                    {MACHINE_TYPE_ICONS[t.type] ?? "📦"}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.manufacturer && t.model
                          ? `${t.manufacturer} ${t.model}`
                          : t.manufacturer ||
                            t.model ||
                            MACHINE_TYPE_KEYS[t.type]}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        CONTENT_MODEL_COLORS[t.contentModel] ?? "bg-gray-100"
                      }
                    >
                      {CONTENT_MODEL_KEYS[t.contentModel] ?? t.contentModel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {t.defaultContainers?.length ?? 0}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {t.defaultSlots?.length ?? 0}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {t.defaultComponents?.length ?? 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {t.acceptsCash && (
                        <Banknote className="w-4 h-4 text-green-600" />
                      )}
                      {t.acceptsCard && (
                        <CreditCard className="w-4 h-4 text-blue-600" />
                      )}
                      {t.acceptsQr && (
                        <QrCode className="w-4 h-4 text-purple-600" />
                      )}
                      {t.acceptsNfc && (
                        <Smartphone className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {t.isSystem && (
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      {t.isActive ? (
                        <Badge className="bg-green-500/10 text-green-600 text-xs">
                          Активен
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-500 text-xs">
                          Неактивен
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      className="flex gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(t)}
                        disabled={t.isSystem}
                        title={
                          t.isSystem
                            ? "Системный шаблон нельзя редактировать"
                            : "Редактировать"
                        }
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(t.id)}
                        disabled={t.isSystem}
                        title={
                          t.isSystem
                            ? "Системный шаблон нельзя удалить"
                            : "Удалить"
                        }
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ─── Detail View Dialog ──────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">
                    {MACHINE_TYPE_ICONS[viewTemplate.type] ?? "📦"}
                  </span>
                  {viewTemplate.name}
                  {viewTemplate.isSystem && (
                    <Badge variant="outline" className="ml-2 gap-1">
                      <Lock className="w-3 h-3" /> {t("systemBadge")}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {viewTemplate.manufacturer} {viewTemplate.model} &middot;{" "}
                  {MACHINE_TYPE_KEYS[viewTemplate.type]
                    ? t(MACHINE_TYPE_KEYS[viewTemplate.type])
                    : viewTemplate.type}{" "}
                  &middot;{" "}
                  {CONTENT_MODEL_KEYS[viewTemplate.contentModel]
                    ? t(CONTENT_MODEL_KEYS[viewTemplate.contentModel])
                    : viewTemplate.contentModel}
                </DialogDescription>
              </DialogHeader>

              {viewTemplate.description && (
                <p className="text-sm text-muted-foreground">
                  {viewTemplate.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Payment methods */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {t("paymentMethods")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {viewTemplate.acceptsCash && (
                      <Badge variant="outline" className="gap-1">
                        <Banknote className="w-3.5 h-3.5" /> {t("paymentCash")}
                      </Badge>
                    )}
                    {viewTemplate.acceptsCard && (
                      <Badge variant="outline" className="gap-1">
                        <CreditCard className="w-3.5 h-3.5" />{" "}
                        {t("paymentCard")}
                      </Badge>
                    )}
                    {viewTemplate.acceptsQr && (
                      <Badge variant="outline" className="gap-1">
                        <QrCode className="w-3.5 h-3.5" /> QR
                      </Badge>
                    )}
                    {viewTemplate.acceptsNfc && (
                      <Badge variant="outline" className="gap-1">
                        <Smartphone className="w-3.5 h-3.5" /> NFC
                      </Badge>
                    )}
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {t("structure")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("containersLabel")}
                      </span>
                      <span className="font-mono">
                        {viewTemplate.defaultContainers?.length ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("slotsLabel")}
                      </span>
                      <span className="font-mono">
                        {viewTemplate.defaultSlots?.length ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("componentsLabel")}
                      </span>
                      <span className="font-mono">
                        {viewTemplate.defaultComponents?.length ?? 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Containers */}
              {viewTemplate.defaultContainers?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Box className="w-4 h-4" /> {t("defaultContainers")}
                  </h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">
                            {t("containerColNumber")}
                          </TableHead>
                          <TableHead>{t("containerColName")}</TableHead>
                          <TableHead className="text-right">
                            {t("containerColCapacity")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("containerColMinLevel")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewTemplate.defaultContainers.map((c, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono">
                              {c.slotNumber}
                            </TableCell>
                            <TableCell>{c.name}</TableCell>
                            <TableCell className="text-right font-mono">
                              {c.capacity} {c.unit}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {c.minLevel != null
                                ? `${c.minLevel} ${c.unit}`
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Slots */}
              {viewTemplate.defaultSlots?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Layers className="w-4 h-4" /> {t("defaultSlots")}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {viewTemplate.defaultSlots.map((s, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="font-mono text-xs"
                      >
                        {s.slotNumber} (×{s.capacity})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Components */}
              {viewTemplate.defaultComponents?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Cpu className="w-4 h-4" /> {t("defaultComponents")}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {viewTemplate.defaultComponents.map((c, i) => (
                      <Badge key={i} variant="secondary">
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Create/Edit Dialog ──────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? t("editTemplate") : t("newTemplateDialog")}
            </DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tpl-name">{t("nameLabel")}</Label>
                <Input
                  id="tpl-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Necta Korinto Prime"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("machineTypeLabel")}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MACHINE_TYPE_KEYS).map(([val, key]) => (
                      <SelectItem key={val} value={val}>
                        {MACHINE_TYPE_ICONS[val]} {t(key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("contentModelLabel")}</Label>
                <Select
                  value={form.contentModel}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, contentModel: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTENT_MODEL_KEYS).map(([val, key]) => (
                      <SelectItem key={val} value={val}>
                        {t(key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("maxSlotsLabel")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.maxProductSlots}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxProductSlots: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("manufacturerLabel")}</Label>
                <Input
                  value={form.manufacturer}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, manufacturer: e.target.value }))
                  }
                  placeholder="Necta"
                />
              </div>
              <div className="space-y-2">
                <Label>Модель</Label>
                <Input
                  value={form.model}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, model: e.target.value }))
                  }
                  placeholder="Korinto Prime"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Описание шаблона..."
                rows={2}
              />
            </div>

            {/* Payment methods */}
            <div>
              <Label className="mb-3 block">Способы оплаты</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.acceptsCash}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, acceptsCash: v }))
                    }
                  />
                  <span className="text-sm">Наличные</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.acceptsCard}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, acceptsCard: v }))
                    }
                  />
                  <span className="text-sm">Карта</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.acceptsQr}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, acceptsQr: v }))
                    }
                  />
                  <span className="text-sm">QR</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.acceptsNfc}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, acceptsNfc: v }))
                    }
                  />
                  <span className="text-sm">NFC</span>
                </div>
              </div>
            </div>

            {/* Default Containers */}
            {(form.contentModel === "containers" ||
              form.contentModel === "mixed") && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2">
                    <Box className="w-4 h-4" /> {t("defaultContainers")}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addContainer}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Добавить
                  </Button>
                </div>
                {form.defaultContainers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Нет бункеров. Нажмите «Добавить» для создания.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {form.defaultContainers.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-md border p-2"
                      >
                        <span className="text-xs text-muted-foreground w-6 text-center font-mono">
                          {c.slotNumber}
                        </span>
                        <Input
                          className="flex-1"
                          placeholder="Название бункера"
                          value={c.name}
                          onChange={(e) =>
                            updateContainer(i, { name: e.target.value })
                          }
                        />
                        <Input
                          className="w-20"
                          type="number"
                          min={1}
                          placeholder="Ёмкость"
                          value={c.capacity}
                          onChange={(e) =>
                            updateContainer(i, {
                              capacity: Number(e.target.value),
                            })
                          }
                        />
                        <Select
                          value={c.unit}
                          onValueChange={(v) => updateContainer(i, { unit: v })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="g">г</SelectItem>
                            <SelectItem value="ml">мл</SelectItem>
                            <SelectItem value="pcs">шт</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeContainer(i)}
                          className="text-destructive hover:text-destructive h-8 w-8"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Default Slots */}
            {(form.contentModel === "slots" ||
              form.contentModel === "mixed") && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2">
                    <Layers className="w-4 h-4" /> {t("defaultSlots")}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSlot}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Добавить
                  </Button>
                </div>
                {form.defaultSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Нет ячеек. Нажмите «Добавить» для создания.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {form.defaultSlots.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1 rounded-md border px-2 py-1"
                      >
                        <Input
                          className="w-14 h-7 text-xs font-mono p-1"
                          value={s.slotNumber}
                          onChange={(e) =>
                            updateSlot(i, { slotNumber: e.target.value })
                          }
                        />
                        <span className="text-xs text-muted-foreground">×</span>
                        <Input
                          className="w-12 h-7 text-xs font-mono p-1"
                          type="number"
                          min={1}
                          value={s.capacity}
                          onChange={(e) =>
                            updateSlot(i, {
                              capacity: Number(e.target.value),
                            })
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSlot(i)}
                          className="text-destructive hover:text-destructive h-6 w-6"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Default Components */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> {t("defaultComponents")}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addComponent}
                >
                  <Plus className="w-3 h-3 mr-1" /> Добавить
                </Button>
              </div>
              {form.defaultComponents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Нет компонентов. Нажмите «Добавить» для создания.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.defaultComponents.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-md border p-2"
                    >
                      <Select
                        value={c.componentType}
                        onValueChange={(v) =>
                          updateComponent(i, { componentType: v })
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="grinder">Кофемолка</SelectItem>
                          <SelectItem value="brew_unit">
                            Заварочный блок
                          </SelectItem>
                          <SelectItem value="pump">Насос</SelectItem>
                          <SelectItem value="heater">Нагреватель</SelectItem>
                          <SelectItem value="mixer">Миксер</SelectItem>
                          <SelectItem value="compressor">Компрессор</SelectItem>
                          <SelectItem value="coin_acceptor">
                            Монетоприёмник
                          </SelectItem>
                          <SelectItem value="bill_acceptor">
                            Купюроприёмник
                          </SelectItem>
                          <SelectItem value="card_reader">Картридер</SelectItem>
                          <SelectItem value="display">Дисплей</SelectItem>
                          <SelectItem value="modem">Модем</SelectItem>
                          <SelectItem value="other">Другое</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        className="flex-1"
                        placeholder="Название компонента"
                        value={c.name}
                        onChange={(e) =>
                          updateComponent(i, { name: e.target.value })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeComponent(i)}
                        className="text-destructive hover:text-destructive h-8 w-8"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <Label>Активен (доступен для выбора)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending
                ? "Сохранение..."
                : editingTemplate
                  ? "Сохранить"
                  : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить шаблон?</AlertDialogTitle>
            <AlertDialogDescription>
              Шаблон будет деактивирован. Уже созданные по нему автоматы не
              пострадают.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
