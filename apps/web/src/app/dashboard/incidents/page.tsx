"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  UserCheck,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ShieldAlert,
  Zap,
  Wifi,
  Wrench,
  Droplets,
  Package,
  HelpCircle,
  Clock,
} from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { incidentsApi } from "@/lib/api";

// ---- Types ----
type IncidentType =
  | "VANDALISM"
  | "THEFT"
  | "WATER_DAMAGE"
  | "POWER_FAILURE"
  | "NETWORK_FAILURE"
  | "MECHANICAL_FAILURE"
  | "OTHER";

type IncidentStatus = "REPORTED" | "INVESTIGATING" | "RESOLVED" | "CLOSED";
type IncidentPriority = "LOW" | "MEDIUM" | "HIGH";

interface Incident {
  id: string;
  title: string;
  description?: string;
  type: IncidentType;
  status: IncidentStatus;
  priority: IncidentPriority;
  machine_id?: string;
  machine?: { id: string; machine_number: string; name?: string };
  reported_by_user_id?: string;
  reported_by_user?: { id: string; first_name: string; last_name: string };
  assigned_to_user_id?: string;
  assigned_to_user?: { id: string; first_name: string; last_name: string };
  resolved_by_user?: { id: string; first_name: string; last_name: string };
  reported_at?: string;
  resolved_at?: string;
  repair_cost?: number;
  insurance_claim?: boolean;
  insurance_claim_number?: string;
  photos?: string[];
  resolution?: string;
  created_at: string;
}

interface IncidentStatistics {
  total: number;
  reported: number;
  investigating: number;
  resolved: number;
  closed: number;
}

// ---- Badge configs ----
const statusColors: Record<IncidentStatus, string> = {
  REPORTED: "bg-amber-500/10 text-amber-500",
  INVESTIGATING: "bg-blue-500/10 text-blue-500",
  RESOLVED: "bg-green-500/10 text-green-500",
  CLOSED: "bg-muted text-muted-foreground",
};

const priorityColors: Record<IncidentPriority, string> = {
  LOW: "bg-green-500/10 text-green-500",
  MEDIUM: "bg-amber-500/10 text-amber-500",
  HIGH: "bg-red-500/10 text-red-500",
};

const typeColors: Record<IncidentType, string> = {
  VANDALISM: "bg-red-500/10 text-red-500",
  THEFT: "bg-orange-500/10 text-orange-500",
  WATER_DAMAGE: "bg-cyan-500/10 text-cyan-500",
  POWER_FAILURE: "bg-yellow-500/10 text-yellow-500",
  NETWORK_FAILURE: "bg-purple-500/10 text-purple-500",
  MECHANICAL_FAILURE: "bg-blue-500/10 text-blue-500",
  OTHER: "bg-muted text-muted-foreground",
};

const typeIcons: Record<IncidentType, React.ReactNode> = {
  VANDALISM: <ShieldAlert className="w-3 h-3" />,
  THEFT: <Package className="w-3 h-3" />,
  WATER_DAMAGE: <Droplets className="w-3 h-3" />,
  POWER_FAILURE: <Zap className="w-3 h-3" />,
  NETWORK_FAILURE: <Wifi className="w-3 h-3" />,
  MECHANICAL_FAILURE: <Wrench className="w-3 h-3" />,
  OTHER: <HelpCircle className="w-3 h-3" />,
};

const INCIDENT_TYPES: IncidentType[] = [
  "VANDALISM",
  "THEFT",
  "WATER_DAMAGE",
  "POWER_FAILURE",
  "NETWORK_FAILURE",
  "MECHANICAL_FAILURE",
  "OTHER",
];

const INCIDENT_STATUSES: IncidentStatus[] = [
  "REPORTED",
  "INVESTIGATING",
  "RESOLVED",
  "CLOSED",
];

const INCIDENT_PRIORITIES: IncidentPriority[] = ["LOW", "MEDIUM", "HIGH"];

// ---- Helpers ----
function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function userName(
  user?: { first_name: string; last_name: string } | null,
): string {
  if (!user) return "—";
  return `${user.first_name} ${user.last_name}`.trim();
}

// ---- Main page ----
export default function IncidentsPage() {
  const t = useTranslations("incidents");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [assigningIncident, setAssigningIncident] = useState<Incident | null>(
    null,
  );
  const [resolvingIncident, setResolvingIncident] = useState<Incident | null>(
    null,
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch incidents
  const {
    data: incidentsData,
    isLoading,
    isError,
  } = useQuery<Incident[]>({
    queryKey: [
      "incidents",
      debouncedSearch,
      statusFilter,
      typeFilter,
      priorityFilter,
    ],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== "all") params.status = statusFilter;
      if (typeFilter !== "all") params.type = typeFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;
      const res = await incidentsApi.getAll(params);
      return res.data?.data ?? res.data ?? [];
    },
  });

  // Fetch statistics
  const { data: statistics } = useQuery<IncidentStatistics>({
    queryKey: ["incidents", "statistics"],
    queryFn: async () => {
      const res = await incidentsApi.getStatistics();
      return res.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => incidentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success(t("deleted"));
    },
    onError: () => {
      toast.error(t("deleteFailed"));
    },
  });

  // Close mutation
  const closeMutation = useMutation({
    mutationFn: (id: string) => incidentsApi.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success(t("closedSuccess"));
    },
    onError: () => {
      toast.error(t("closedError"));
    },
  });

  const incidents = useMemo(() => incidentsData ?? [], [incidentsData]);

  const stats = useMemo(
    () => ({
      total: statistics?.total ?? incidents.length,
      reported:
        statistics?.reported ??
        incidents.filter((i) => i.status === "REPORTED").length,
      investigating:
        statistics?.investigating ??
        incidents.filter((i) => i.status === "INVESTIGATING").length,
      resolved:
        statistics?.resolved ??
        incidents.filter((i) => i.status === "RESOLVED").length,
    }),
    [statistics, incidents],
  );

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{t("loadError")}</p>
        <p className="text-muted-foreground mb-4">{t("loadFailed")}</p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["incidents"] })
          }
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t("createIncident")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("createIncident")}</DialogTitle>
            </DialogHeader>
            <IncidentForm
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["incidents"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">{t("statsTotal")}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.reported}</p>
              <p className="text-sm text-muted-foreground">
                {t("statsReported")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Search className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.investigating}</p>
              <p className="text-sm text-muted-foreground">
                {t("statsInvestigating")}
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
              <p className="text-2xl font-bold">{stats.resolved}</p>
              <p className="text-sm text-muted-foreground">
                {t("statsResolved")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              {statusFilter === "all"
                ? t("filterStatus")
                : t(`status_${statusFilter}`)}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>
              {t("allStatuses")}
            </DropdownMenuItem>
            {INCIDENT_STATUSES.map((s) => (
              <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
                {t(`status_${s}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Type filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {typeFilter === "all" ? t("filterType") : t(`type_${typeFilter}`)}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setTypeFilter("all")}>
              {t("allTypes")}
            </DropdownMenuItem>
            {INCIDENT_TYPES.map((tp) => (
              <DropdownMenuItem key={tp} onClick={() => setTypeFilter(tp)}>
                {t(`type_${tp}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <ShieldAlert className="w-4 h-4 mr-2" />
              {priorityFilter === "all"
                ? t("filterPriority")
                : t(`priority_${priorityFilter}`)}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setPriorityFilter("all")}>
              {t("allPriorities")}
            </DropdownMenuItem>
            {INCIDENT_PRIORITIES.map((p) => (
              <DropdownMenuItem key={p} onClick={() => setPriorityFilter(p)}>
                {t(`priority_${p}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colTitle")}</TableHead>
              <TableHead>{t("colMachine")}</TableHead>
              <TableHead>{t("colType")}</TableHead>
              <TableHead>{t("colPriority")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead>{t("colAssignedTo")}</TableHead>
              <TableHead>{t("colReportedAt")}</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : incidents.length ? (
              incidents.map((incident) => (
                <TableRow key={incident.id}>
                  {/* Title */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium leading-tight">
                          {incident.title}
                        </p>
                        {incident.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                            {incident.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Machine */}
                  <TableCell>
                    {incident.machine ? (
                      <div>
                        <p className="font-medium text-sm">
                          {incident.machine.machine_number}
                        </p>
                        {incident.machine.name && (
                          <p className="text-xs text-muted-foreground">
                            {incident.machine.name}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <Badge
                      className={`${typeColors[incident.type]} flex items-center gap-1 w-fit`}
                    >
                      {typeIcons[incident.type]}
                      {t(`type_${incident.type}`)}
                    </Badge>
                  </TableCell>

                  {/* Priority */}
                  <TableCell>
                    <Badge className={priorityColors[incident.priority]}>
                      {t(`priority_${incident.priority}`)}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge className={statusColors[incident.status]}>
                      {t(`status_${incident.status}`)}
                    </Badge>
                  </TableCell>

                  {/* Assigned To */}
                  <TableCell>
                    <span className="text-sm">
                      {userName(incident.assigned_to_user)}
                    </span>
                  </TableCell>

                  {/* Reported At */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(incident.reported_at ?? incident.created_at)}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("actionsLabel")}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditingIncident(incident)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {t("actionEdit")}
                        </DropdownMenuItem>

                        {/* Assign — available when not CLOSED */}
                        {incident.status !== "CLOSED" && (
                          <DropdownMenuItem
                            onClick={() => setAssigningIncident(incident)}
                          >
                            <UserCheck className="w-4 h-4 mr-2" />
                            {t("actionAssign")}
                          </DropdownMenuItem>
                        )}

                        {/* Resolve — available when REPORTED or INVESTIGATING */}
                        {(incident.status === "REPORTED" ||
                          incident.status === "INVESTIGATING") && (
                          <DropdownMenuItem
                            onClick={() => setResolvingIncident(incident)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {t("actionResolve")}
                          </DropdownMenuItem>
                        )}

                        {/* Close — available only when RESOLVED */}
                        {incident.status === "RESOLVED" && (
                          <DropdownMenuItem
                            onClick={() => closeMutation.mutate(incident.id)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            {t("actionClose")}
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(incident.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t("actionDelete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">{t("notFound")}</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingIncident}
        onOpenChange={(open) => !open && setEditingIncident(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("editIncident")}</DialogTitle>
          </DialogHeader>
          {editingIncident && (
            <IncidentForm
              incident={editingIncident}
              onSuccess={() => {
                setEditingIncident(null);
                queryClient.invalidateQueries({ queryKey: ["incidents"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog
        open={!!assigningIncident}
        onOpenChange={(open) => !open && setAssigningIncident(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("actionAssign")}</DialogTitle>
          </DialogHeader>
          {assigningIncident && (
            <AssignForm
              incident={assigningIncident}
              onSuccess={() => {
                setAssigningIncident(null);
                queryClient.invalidateQueries({ queryKey: ["incidents"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog
        open={!!resolvingIncident}
        onOpenChange={(open) => !open && setResolvingIncident(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("actionResolve")}</DialogTitle>
          </DialogHeader>
          {resolvingIncident && (
            <ResolveForm
              incident={resolvingIncident}
              onSuccess={() => {
                setResolvingIncident(null);
                queryClient.invalidateQueries({ queryKey: ["incidents"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Create / Edit Form ----
function IncidentForm({
  incident,
  onSuccess,
}: {
  incident?: Incident;
  onSuccess: () => void;
}) {
  const t = useTranslations("incidents");
  const [formData, setFormData] = useState({
    title: incident?.title ?? "",
    description: incident?.description ?? "",
    type: incident?.type ?? ("MECHANICAL_FAILURE" as IncidentType),
    priority: incident?.priority ?? ("MEDIUM" as IncidentPriority),
    machine_id: incident?.machine_id ?? "",
    repair_cost: incident?.repair_cost?.toString() ?? "",
    insurance_claim: incident?.insurance_claim ?? false,
    insurance_claim_number: incident?.insurance_claim_number ?? "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        repair_cost: data.repair_cost ? Number(data.repair_cost) : undefined,
        machine_id: data.machine_id || undefined,
        insurance_claim_number: data.insurance_claim_number || undefined,
      };
      if (incident) {
        return incidentsApi.update(incident.id, payload);
      }
      return incidentsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(incident ? t("updated") : t("created"));
      onSuccess();
    },
    onError: () => {
      toast.error(t("saveError"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">{t("formTitle")}</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder={t("formTitlePlaceholder")}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t("formType")}</label>
          <Select
            value={formData.type}
            onValueChange={(v) =>
              setFormData({ ...formData, type: v as IncidentType })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INCIDENT_TYPES.map((tp) => (
                <SelectItem key={tp} value={tp}>
                  {t(`type_${tp}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">{t("formPriority")}</label>
          <Select
            value={formData.priority}
            onValueChange={(v) =>
              setFormData({ ...formData, priority: v as IncidentPriority })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INCIDENT_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`priority_${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">{t("formMachineId")}</label>
        <Input
          value={formData.machine_id}
          onChange={(e) =>
            setFormData({ ...formData, machine_id: e.target.value })
          }
          placeholder={t("formMachineIdPlaceholder")}
        />
      </div>

      <div>
        <label className="text-sm font-medium">{t("formDescription")}</label>
        <Textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder={t("formDescriptionPlaceholder")}
          className="h-24 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t("formRepairCost")}</label>
          <Input
            type="number"
            min="0"
            value={formData.repair_cost}
            onChange={(e) =>
              setFormData({ ...formData, repair_cost: e.target.value })
            }
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-sm font-medium">
            {t("formInsuranceClaim")}
          </label>
          <Select
            value={formData.insurance_claim ? "yes" : "no"}
            onValueChange={(v) =>
              setFormData({ ...formData, insurance_claim: v === "yes" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">{t("formInsuranceNo")}</SelectItem>
              <SelectItem value="yes">{t("formInsuranceYes")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.insurance_claim && (
        <div>
          <label className="text-sm font-medium">
            {t("formInsuranceClaimNumber")}
          </label>
          <Input
            value={formData.insurance_claim_number}
            onChange={(e) =>
              setFormData({
                ...formData,
                insurance_claim_number: e.target.value,
              })
            }
            placeholder={t("formInsuranceClaimNumberPlaceholder")}
          />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? t("formSaving")
            : incident
              ? t("formUpdate")
              : t("formCreate")}
        </Button>
      </div>
    </form>
  );
}

// ---- Assign Form ----
function AssignForm({
  incident,
  onSuccess,
}: {
  incident: Incident;
  onSuccess: () => void;
}) {
  const t = useTranslations("incidents");
  const [userId, setUserId] = useState(incident.assigned_to_user_id ?? "");

  const mutation = useMutation({
    mutationFn: () => incidentsApi.assign(incident.id, { user_id: userId }),
    onSuccess: () => {
      toast.success(t("assignedSuccess"));
      onSuccess();
    },
    onError: () => {
      toast.error(t("assignedError"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("assignDescription")}:{" "}
        <span className="font-medium text-foreground">{incident.title}</span>
      </p>
      <div>
        <label className="text-sm font-medium">{t("formUserId")}</label>
        <Input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder={t("formUserIdPlaceholder")}
          required
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={mutation.isPending || !userId}>
          {mutation.isPending ? t("formSaving") : t("actionAssign")}
        </Button>
      </div>
    </form>
  );
}

// ---- Resolve Form ----
function ResolveForm({
  incident,
  onSuccess,
}: {
  incident: Incident;
  onSuccess: () => void;
}) {
  const t = useTranslations("incidents");
  const [resolution, setResolution] = useState(incident.resolution ?? "");

  const mutation = useMutation({
    mutationFn: () => incidentsApi.resolve(incident.id, { resolution }),
    onSuccess: () => {
      toast.success(t("resolvedSuccess"));
      onSuccess();
    },
    onError: () => {
      toast.error(t("resolvedError"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("resolveDescription")}:{" "}
        <span className="font-medium text-foreground">{incident.title}</span>
      </p>
      <div>
        <label className="text-sm font-medium">{t("formResolution")}</label>
        <Textarea
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          placeholder={t("formResolutionPlaceholder")}
          className="h-28 resize-none"
          required
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={mutation.isPending || !resolution}>
          {mutation.isPending ? t("formSaving") : t("actionResolve")}
        </Button>
      </div>
    </form>
  );
}
