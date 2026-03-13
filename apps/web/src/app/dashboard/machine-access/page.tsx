"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  Plus,
  ShieldCheck,
  ShieldOff,
  Trash2,
  MoreHorizontal,
  AlertTriangle,
  LayoutTemplate,
  CheckCircle2,
  XCircle,
  Edit,
  Play,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { machineAccessApi } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────

interface MachineAccess {
  id: string;
  machineId: string;
  machine?: { id: string; name: string; machine_number: string };
  userId: string;
  user?: { id: string; first_name: string; last_name: string; email: string };
  accessLevel: AccessLevel;
  grantedAt: string;
  expiresAt?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface AccessTemplate {
  id: string;
  name: string;
  description?: string;
  accessLevel: AccessLevel;
  machineIds: string[];
  createdAt: string;
  updatedAt: string;
}

type AccessLevel = "read" | "operate" | "manage" | "admin";

// ─── Constants ──────────────────────────────────────────────────

const ACCESS_LEVELS: AccessLevel[] = ["read", "operate", "manage", "admin"];

const accessLevelColors: Record<AccessLevel, string> = {
  read: "bg-blue-500/10 text-blue-500",
  operate: "bg-green-500/10 text-green-500",
  manage: "bg-amber-500/10 text-amber-500",
  admin: "bg-red-500/10 text-red-500",
};

// ─── Main Page ──────────────────────────────────────────────────

export default function MachineAccessPage() {
  const t = useTranslations("machineAccess");
  const queryClient = useQueryClient();

  // Records tab state
  const [machineIdFilter, setMachineIdFilter] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);

  // Templates tab state
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AccessTemplate | null>(
    null,
  );
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [applyingTemplate, setApplyingTemplate] =
    useState<AccessTemplate | null>(null);

  // ─── Queries ───────────────────────────────────────────────────

  const {
    data: accessRecords,
    isLoading: recordsLoading,
    isError: recordsError,
  } = useQuery<MachineAccess[]>({
    queryKey: ["machine-access", machineIdFilter, userIdFilter],
    queryFn: async () => {
      const params: Record<string, string> = { page: "1", limit: "100" };
      if (machineIdFilter) params.machineId = machineIdFilter;
      if (userIdFilter) params.userId = userIdFilter;
      const res = await machineAccessApi.getAll(params);
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    },
  });

  const {
    data: templates,
    isLoading: templatesLoading,
    isError: templatesError,
  } = useQuery<AccessTemplate[]>({
    queryKey: ["machine-access-templates"],
    queryFn: async () => {
      const res = await machineAccessApi.getTemplates();
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    },
  });

  // ─── Mutations ─────────────────────────────────────────────────

  const revokeMutation = useMutation({
    mutationFn: (record: MachineAccess) =>
      machineAccessApi.revoke({
        machineId: record.machineId,
        userId: record.userId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine-access"] });
      toast.success(t("messages.revoked"));
    },
    onError: () => toast.error(t("messages.revokeError")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => machineAccessApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine-access"] });
      toast.success(t("messages.deleted"));
    },
    onError: () => toast.error(t("messages.deleteError")),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => machineAccessApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machine-access-templates"] });
      toast.success(t("messages.templateDeleted"));
    },
    onError: () => toast.error(t("messages.templateDeleteError")),
  });

  // ─── Helpers ───────────────────────────────────────────────────

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    return formatDateTime(dateStr);
  };

  const getUserDisplayName = (record: MachineAccess) => {
    if (record.user) {
      return `${record.user.first_name} ${record.user.last_name}`.trim();
    }
    return record.userId;
  };

  const getMachineDisplayName = (record: MachineAccess) => {
    if (record.machine) {
      return record.machine.name || record.machine.machine_number;
    }
    return record.machineId;
  };

  // ─── Error state ────────────────────────────────────────────────

  if (recordsError && templatesError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{t("loadError")}</p>
        <Button
          className="mt-4"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["machine-access"] });
            queryClient.invalidateQueries({
              queryKey: ["machine-access-templates"],
            });
          }}
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  // ─── Stats ──────────────────────────────────────────────────────

  const totalRecords = accessRecords?.length ?? 0;
  const activeRecords = accessRecords?.filter((r) => r.isActive).length ?? 0;
  const totalTemplates = templates?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalRecords}</p>
              <p className="text-sm text-muted-foreground">
                {t("stats.totalRecords")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeRecords}</p>
              <p className="text-sm text-muted-foreground">
                {t("stats.activeRecords")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <LayoutTemplate className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalTemplates}</p>
              <p className="text-sm text-muted-foreground">
                {t("stats.templates")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="records" className="space-y-6">
        <TabsList>
          <TabsTrigger value="records">{t("tabs.records")}</TabsTrigger>
          <TabsTrigger value="templates">{t("tabs.templates")}</TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Access Records ───────────────────────────── */}
        <TabsContent value="records" className="space-y-4">
          {/* Filters + Grant button */}
          <div className="flex items-center gap-4">
            <Input
              placeholder={t("filters.machineId")}
              value={machineIdFilter}
              onChange={(e) => setMachineIdFilter(e.target.value)}
              className="max-w-xs"
            />
            <Input
              placeholder={t("filters.userId")}
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              className="max-w-xs"
            />
            <div className="ml-auto">
              <Button onClick={() => setIsGrantDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("grantAccess")}
              </Button>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.machine")}</TableHead>
                  <TableHead>{t("columns.user")}</TableHead>
                  <TableHead>{t("columns.accessLevel")}</TableHead>
                  <TableHead>{t("columns.grantedAt")}</TableHead>
                  <TableHead>{t("columns.expiresAt")}</TableHead>
                  <TableHead>{t("columns.active")}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordsLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : accessRecords?.length ? (
                  accessRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <KeyRound className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium text-sm">
                            {getMachineDisplayName(record)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {getUserDisplayName(record)}
                          </p>
                          {record.user?.email && (
                            <p className="text-xs text-muted-foreground">
                              {record.user.email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            accessLevelColors[record.accessLevel] ??
                            "bg-muted text-muted-foreground"
                          }
                        >
                          {t(`accessLevels.${record.accessLevel}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(record.grantedAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(record.expiresAt)}
                      </TableCell>
                      <TableCell>
                        {record.isActive ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("actions.label")}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => revokeMutation.mutate(record)}
                              disabled={!record.isActive}
                            >
                              <ShieldOff className="w-4 h-4 mr-2" />
                              {t("revokeAccess")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(record.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t("actions.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <KeyRound className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">{t("noRecords")}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ─── Tab 2: Templates ────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("templatesDescription")}
            </p>
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setIsTemplateDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("createTemplate")}
            </Button>
          </div>

          {/* Templates Table */}
          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("templateColumns.name")}</TableHead>
                  <TableHead>{t("templateColumns.description")}</TableHead>
                  <TableHead>{t("templateColumns.machinesCount")}</TableHead>
                  <TableHead>{t("templateColumns.accessLevel")}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templatesLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : templates?.length ? (
                  templates.map((tpl) => (
                    <TableRow key={tpl.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <LayoutTemplate className="w-4 h-4 text-blue-500" />
                          </div>
                          <span className="font-medium">{tpl.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {tpl.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {tpl.machineIds?.length ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            accessLevelColors[tpl.accessLevel] ??
                            "bg-muted text-muted-foreground"
                          }
                        >
                          {t(`accessLevels.${tpl.accessLevel}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("actions.label")}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setApplyingTemplate(tpl);
                                setIsApplyDialogOpen(true);
                              }}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              {t("applyTemplate")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingTemplate(tpl);
                                setIsTemplateDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              {t("editTemplate")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                deleteTemplateMutation.mutate(tpl.id)
                              }
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t("actions.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <LayoutTemplate className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        {t("noTemplates")}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Grant Access Dialog ─────────────────────────────────── */}
      <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <ShieldCheck className="inline w-5 h-5 mr-2 text-primary" />
              {t("grantAccess")}
            </DialogTitle>
          </DialogHeader>
          <GrantAccessForm
            onSuccess={() => {
              setIsGrantDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["machine-access"] });
            }}
            onCancel={() => setIsGrantDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ─── Template Create/Edit Dialog ─────────────────────────── */}
      <Dialog
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <LayoutTemplate className="inline w-5 h-5 mr-2 text-blue-500" />
              {editingTemplate ? t("editTemplate") : t("createTemplate")}
            </DialogTitle>
          </DialogHeader>
          <TemplateForm
            template={editingTemplate}
            onSuccess={() => {
              setIsTemplateDialogOpen(false);
              setEditingTemplate(null);
              queryClient.invalidateQueries({
                queryKey: ["machine-access-templates"],
              });
            }}
            onCancel={() => {
              setIsTemplateDialogOpen(false);
              setEditingTemplate(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* ─── Apply Template Dialog ───────────────────────────────── */}
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <Play className="inline w-5 h-5 mr-2 text-green-500" />
              {t("applyTemplate")}
            </DialogTitle>
          </DialogHeader>
          {applyingTemplate && (
            <ApplyTemplateForm
              template={applyingTemplate}
              onSuccess={() => {
                setIsApplyDialogOpen(false);
                setApplyingTemplate(null);
                queryClient.invalidateQueries({ queryKey: ["machine-access"] });
              }}
              onCancel={() => {
                setIsApplyDialogOpen(false);
                setApplyingTemplate(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Grant Access Form ──────────────────────────────────────────

function GrantAccessForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("machineAccess");
  const [formData, setFormData] = useState({
    machineId: "",
    userId: "",
    accessLevel: "read" as AccessLevel,
    expiresAt: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      machineAccessApi.grant({
        machineId: formData.machineId,
        userId: formData.userId,
        accessLevel: formData.accessLevel,
        ...(formData.expiresAt ? { expiresAt: formData.expiresAt } : {}),
      }),
    onSuccess: () => {
      toast.success(t("messages.granted"));
      onSuccess();
    },
    onError: () => toast.error(t("messages.grantError")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">{t("form.machineId")}</label>
        <Input
          value={formData.machineId}
          onChange={(e) =>
            setFormData({ ...formData, machineId: e.target.value })
          }
          placeholder={t("form.machineIdPlaceholder")}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t("form.userId")}</label>
        <Input
          value={formData.userId}
          onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
          placeholder={t("form.userIdPlaceholder")}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t("form.accessLevel")}</label>
        <Select
          value={formData.accessLevel}
          onValueChange={(v) =>
            setFormData({ ...formData, accessLevel: v as AccessLevel })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCESS_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {t(`accessLevels.${level}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">
          {t("form.expiresAt")}{" "}
          <span className="text-muted-foreground text-xs">
            ({t("form.optional")})
          </span>
        </label>
        <Input
          type="datetime-local"
          value={formData.expiresAt}
          onChange={(e) =>
            setFormData({ ...formData, expiresAt: e.target.value })
          }
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          <ShieldCheck className="w-4 h-4 mr-2" />
          {mutation.isPending ? t("form.saving") : t("grantAccess")}
        </Button>
      </div>
    </form>
  );
}

// ─── Template Form ──────────────────────────────────────────────

function TemplateForm({
  template,
  onSuccess,
  onCancel,
}: {
  template: AccessTemplate | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("machineAccess");
  const [formData, setFormData] = useState({
    name: template?.name ?? "",
    description: template?.description ?? "",
    accessLevel: (template?.accessLevel ?? "read") as AccessLevel,
    machineIds: template?.machineIds?.join(", ") ?? "",
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        accessLevel: formData.accessLevel,
        machineIds: formData.machineIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (template) {
        return machineAccessApi.updateTemplate(template.id, payload);
      }
      return machineAccessApi.createTemplate(payload);
    },
    onSuccess: () => {
      toast.success(
        template
          ? t("messages.templateUpdated")
          : t("messages.templateCreated"),
      );
      onSuccess();
    },
    onError: () => toast.error(t("messages.templateSaveError")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">{t("form.templateName")}</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t("form.templateNamePlaceholder")}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">
          {t("form.description")}{" "}
          <span className="text-muted-foreground text-xs">
            ({t("form.optional")})
          </span>
        </label>
        <Textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder={t("form.descriptionPlaceholder")}
          className="h-20 resize-none"
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t("form.accessLevel")}</label>
        <Select
          value={formData.accessLevel}
          onValueChange={(v) =>
            setFormData({ ...formData, accessLevel: v as AccessLevel })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCESS_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {t(`accessLevels.${level}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">{t("form.machineIds")}</label>
        <Textarea
          value={formData.machineIds}
          onChange={(e) =>
            setFormData({ ...formData, machineIds: e.target.value })
          }
          placeholder={t("form.machineIdsPlaceholder")}
          className="h-20 resize-none font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t("form.machineIdsHint")}
        </p>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          <LayoutTemplate className="w-4 h-4 mr-2" />
          {mutation.isPending
            ? t("form.saving")
            : template
              ? t("form.update")
              : t("form.create")}
        </Button>
      </div>
    </form>
  );
}

// ─── Apply Template Form ────────────────────────────────────────

function ApplyTemplateForm({
  template,
  onSuccess,
  onCancel,
}: {
  template: AccessTemplate;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("machineAccess");
  const [userIds, setUserIds] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      machineAccessApi.applyTemplate({
        templateId: template.id,
        userIds: userIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      toast.success(t("messages.templateApplied"));
      onSuccess();
    },
    onError: () => toast.error(t("messages.templateApplyError")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
        <p>
          <span className="text-muted-foreground">
            {t("form.templateName")}:{" "}
          </span>
          <span className="font-medium">{template.name}</span>
        </p>
        <p>
          <span className="text-muted-foreground">
            {t("form.accessLevel")}:{" "}
          </span>
          <Badge
            className={
              accessLevelColors[template.accessLevel] ??
              "bg-muted text-muted-foreground"
            }
          >
            {t(`accessLevels.${template.accessLevel}`)}
          </Badge>
        </p>
        <p>
          <span className="text-muted-foreground">
            {t("templateColumns.machinesCount")}:{" "}
          </span>
          <span className="font-medium">
            {template.machineIds?.length ?? 0}
          </span>
        </p>
      </div>
      <div>
        <label className="text-sm font-medium">{t("form.userIds")}</label>
        <Textarea
          value={userIds}
          onChange={(e) => setUserIds(e.target.value)}
          placeholder={t("form.userIdsPlaceholder")}
          className="h-20 resize-none font-mono text-sm"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t("form.userIdsHint")}
        </p>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          <Play className="w-4 h-4 mr-2" />
          {mutation.isPending ? t("form.applying") : t("applyTemplate")}
        </Button>
      </div>
    </form>
  );
}
