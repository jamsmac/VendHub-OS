"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Car,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Gauge,
  AlertTriangle,
  ChevronDown,
  User,
  Wrench,
  CheckCircle2,
  XCircle,
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
import { vehiclesApi } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
  type: "COMPANY" | "PERSONAL";
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  currentOdometer: number;
  lastOdometerUpdate?: string;
  ownerEmployeeId?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-600 border-green-200",
  INACTIVE: "bg-red-500/10 text-red-600 border-red-200",
  MAINTENANCE: "bg-amber-500/10 text-amber-600 border-amber-200",
};

const typeColors: Record<string, string> = {
  COMPANY: "bg-blue-500/10 text-blue-600 border-blue-200",
  PERSONAL: "bg-purple-500/10 text-purple-600 border-purple-200",
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  const t = useTranslations("vehicles");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [odometerVehicle, setOdometerVehicle] = useState<Vehicle | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const {
    data: vehicles,
    isLoading,
    isError,
  } = useQuery<Vehicle[]>({
    queryKey: ["vehicles", debouncedSearch, typeFilter, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      return vehiclesApi.getAll(params);
    },
  });

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => vehiclesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success(t("messages.deleted"));
      setDeleteId(null);
    },
    onError: () => {
      toast.error(t("messages.deleteFailed"));
    },
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(
    () => ({
      total: vehicles?.length ?? 0,
      active: vehicles?.filter((v) => v.status === "ACTIVE").length ?? 0,
      maintenance:
        vehicles?.filter((v) => v.status === "MAINTENANCE").length ?? 0,
    }),
    [vehicles],
  );

  const formatOdometer = (km: number) =>
    formatNumber(km) + ` ${t("form.odometerUnit")}`;

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-semibold mb-1">{t("loadError")}</p>
        <p className="text-muted-foreground mb-4">{t("loadFailed")}</p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["vehicles"] })
          }
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t("createVehicle")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{t("createVehicle")}</DialogTitle>
            </DialogHeader>
            <VehicleForm
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["vehicles"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">{t("statsTotal")}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">
                {t("statsActive")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.maintenance}</p>
              <p className="text-sm text-muted-foreground">
                {t("statsMaintenance")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Type filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Car className="w-4 h-4 mr-2" />
              {typeFilter === "all"
                ? t("allTypes")
                : t(`types.${typeFilter.toLowerCase()}`)}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setTypeFilter("all")}>
              {t("allTypes")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypeFilter("COMPANY")}>
              {t("types.company")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypeFilter("PERSONAL")}>
              {t("types.personal")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              {statusFilter === "all"
                ? t("allStatuses")
                : t(`statuses.${statusFilter.toLowerCase()}`)}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>
              {t("allStatuses")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("ACTIVE")}>
              {t("statuses.active")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("INACTIVE")}>
              {t("statuses.inactive")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("MAINTENANCE")}>
              {t("statuses.maintenance")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.plateNumber")}</TableHead>
              <TableHead>
                {t("columns.brand")} / {t("columns.model")}
              </TableHead>
              <TableHead>{t("columns.type")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.odometer")}</TableHead>
              <TableHead>{t("columns.owner")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : vehicles?.length ? (
              vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  {/* Plate Number */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Car className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-mono font-semibold tracking-wide">
                        {vehicle.plateNumber}
                      </span>
                    </div>
                  </TableCell>

                  {/* Brand / Model */}
                  <TableCell>
                    <p className="font-medium">{vehicle.brand}</p>
                    <p className="text-sm text-muted-foreground">
                      {vehicle.model}
                    </p>
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={typeColors[vehicle.type]}
                    >
                      {t(`types.${vehicle.type.toLowerCase()}`)}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[vehicle.status]}
                    >
                      {t(`statuses.${vehicle.status.toLowerCase()}`)}
                    </Badge>
                  </TableCell>

                  {/* Odometer */}
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                      {formatOdometer(vehicle.currentOdometer ?? 0)}
                    </div>
                    {vehicle.lastOdometerUpdate && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(vehicle.lastOdometerUpdate)}
                      </p>
                    )}
                  </TableCell>

                  {/* Owner */}
                  <TableCell>
                    {vehicle.ownerEmployeeId ? (
                      <div className="flex items-center gap-1 text-sm">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                          {vehicle.ownerEmployeeId}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
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
                          onClick={() => setEditVehicle(vehicle)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {t("actionEdit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setOdometerVehicle(vehicle)}
                        >
                          <Gauge className="w-4 h-4 mr-2" />
                          {t("updateOdometer")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(vehicle.id)}
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
                <TableCell colSpan={7} className="text-center py-12">
                  <Car className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">{t("notFound")}</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Edit Dialog ────────────────────────────────────────────────────── */}
      <Dialog
        open={!!editVehicle}
        onOpenChange={(open) => !open && setEditVehicle(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("editVehicle")}</DialogTitle>
          </DialogHeader>
          {editVehicle && (
            <VehicleForm
              vehicle={editVehicle}
              onSuccess={() => {
                setEditVehicle(null);
                queryClient.invalidateQueries({ queryKey: ["vehicles"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Odometer Dialog ────────────────────────────────────────────────── */}
      <Dialog
        open={!!odometerVehicle}
        onOpenChange={(open) => !open && setOdometerVehicle(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("updateOdometer")}</DialogTitle>
          </DialogHeader>
          {odometerVehicle && (
            <OdometerForm
              vehicle={odometerVehicle}
              onSuccess={() => {
                setOdometerVehicle(null);
                queryClient.invalidateQueries({ queryKey: ["vehicles"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              {t("messages.confirmDelete")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("messages.confirmDeleteBody")}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? t("deleting") : t("actionDelete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Vehicle Form ─────────────────────────────────────────────────────────────

function VehicleForm({
  vehicle,
  onSuccess,
}: {
  vehicle?: Vehicle;
  onSuccess: () => void;
}) {
  const t = useTranslations("vehicles");
  const [formData, setFormData] = useState({
    brand: vehicle?.brand ?? "",
    model: vehicle?.model ?? "",
    plateNumber: vehicle?.plateNumber ?? "",
    type: vehicle?.type ?? "COMPANY",
    status: vehicle?.status ?? "ACTIVE",
    ownerEmployeeId: vehicle?.ownerEmployeeId ?? "",
    notes: vehicle?.notes ?? "",
  });

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => {
      const payload = {
        ...data,
        ownerEmployeeId: data.ownerEmployeeId || null,
        notes: data.notes || null,
      };
      if (vehicle) {
        return vehiclesApi.update(vehicle.id, payload);
      }
      return vehiclesApi.create(payload);
    },
    onSuccess: () => {
      toast.success(vehicle ? t("messages.updated") : t("messages.created"));
      onSuccess();
    },
    onError: () => {
      toast.error(t("messages.saveError"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Brand / Model */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium block mb-1">
            {t("form.brand")} <span className="text-destructive">*</span>
          </label>
          <Input
            value={formData.brand}
            onChange={(e) =>
              setFormData({ ...formData, brand: e.target.value })
            }
            placeholder={t("form.brandPlaceholder")}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">
            {t("form.model")} <span className="text-destructive">*</span>
          </label>
          <Input
            value={formData.model}
            onChange={(e) =>
              setFormData({ ...formData, model: e.target.value })
            }
            placeholder={t("form.modelPlaceholder")}
            required
          />
        </div>
      </div>

      {/* Plate Number */}
      <div>
        <label className="text-sm font-medium block mb-1">
          {t("form.plateNumber")} <span className="text-destructive">*</span>
        </label>
        <Input
          value={formData.plateNumber}
          onChange={(e) =>
            setFormData({ ...formData, plateNumber: e.target.value })
          }
          placeholder={t("form.plateNumberPlaceholder")}
          className="font-mono uppercase"
          required
        />
      </div>

      {/* Type / Status */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium block mb-1">
            {t("form.type")}
          </label>
          <Select
            value={formData.type}
            onValueChange={(val) =>
              setFormData({ ...formData, type: val as Vehicle["type"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COMPANY">{t("types.company")}</SelectItem>
              <SelectItem value="PERSONAL">{t("types.personal")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">
            {t("form.status")}
          </label>
          <Select
            value={formData.status}
            onValueChange={(val) =>
              setFormData({ ...formData, status: val as Vehicle["status"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">{t("statuses.active")}</SelectItem>
              <SelectItem value="INACTIVE">{t("statuses.inactive")}</SelectItem>
              <SelectItem value="MAINTENANCE">
                {t("statuses.maintenance")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Owner Employee ID */}
      <div>
        <label className="text-sm font-medium block mb-1">
          {t("form.ownerEmployeeId")}{" "}
          <span className="text-muted-foreground text-xs">
            ({t("form.optional")})
          </span>
        </label>
        <Input
          value={formData.ownerEmployeeId}
          onChange={(e) =>
            setFormData({ ...formData, ownerEmployeeId: e.target.value })
          }
          placeholder={t("form.ownerEmployeeIdPlaceholder")}
          className="font-mono"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-sm font-medium block mb-1">
          {t("form.notes")}{" "}
          <span className="text-muted-foreground text-xs">
            ({t("form.optional")})
          </span>
        </label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder={t("form.notesPlaceholder")}
          className="h-20 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? t("form.saving")
            : vehicle
              ? t("form.update")
              : t("form.create")}
        </Button>
      </div>
    </form>
  );
}

// ─── Odometer Form ────────────────────────────────────────────────────────────

function OdometerForm({
  vehicle,
  onSuccess,
}: {
  vehicle: Vehicle;
  onSuccess: () => void;
}) {
  const t = useTranslations("vehicles");
  const [odometer, setOdometer] = useState(
    String(vehicle.currentOdometer ?? 0),
  );

  const mutation = useMutation({
    mutationFn: (value: number) =>
      vehiclesApi.updateOdometer(vehicle.id, { currentOdometer: value }),
    onSuccess: () => {
      toast.success(t("messages.odometerUpdated"));
      onSuccess();
    },
    onError: () => {
      toast.error(t("messages.odometerError"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseInt(odometer, 10);
    if (isNaN(value) || value < 0) return;
    mutation.mutate(value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {vehicle.brand} {vehicle.model} —{" "}
        <span className="font-mono font-semibold">{vehicle.plateNumber}</span>
      </p>
      <div>
        <label className="text-sm font-medium block mb-1">
          {t("form.odometer")} ({t("form.odometerUnit")})
        </label>
        <Input
          type="number"
          min={0}
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          className="font-mono"
          required
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? t("form.saving") : t("form.update")}
        </Button>
      </div>
    </form>
  );
}
