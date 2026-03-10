"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle2,
  ChevronDown,
  AlertTriangle,
  ClipboardList,
  Clock,
  TrendingUp,
  PlayCircle,
  ChevronsRight,
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
import { openingBalancesApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OpeningBalance {
  id: string;
  entityReference: string;
  entityType: string;
  type: string;
  amount: number;
  date: string;
  isApplied: boolean;
  appliedAt?: string;
  notes?: string;
  createdAt: string;
}

interface OpeningBalanceStats {
  totalRecords: number;
  applied: number;
  pending: number;
  totalValue: number;
}

interface OpeningBalancesResponse {
  data: OpeningBalance[];
  total: number;
  page: number;
  limit: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  applied: "bg-green-500/10 text-green-500",
  unapplied: "bg-amber-500/10 text-amber-500",
};

// ─── Page Component ──────────────────────────────────────────────────────────

export default function OpeningBalancesPage() {
  const t = useTranslations("openingBalances");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [applyAllDate, setApplyAllDate] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingBalance, setEditingBalance] = useState<OpeningBalance | null>(
    null,
  );
  const [isApplyAllDialogOpen, setIsApplyAllDialogOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Queries ──────────────────────────────────────────────────────────────

  const {
    data: balancesResponse,
    isLoading,
    isError,
  } = useQuery<OpeningBalancesResponse | OpeningBalance[]>({
    queryKey: [
      "opening-balances",
      debouncedSearch,
      statusFilter,
      dateFrom,
      dateTo,
    ],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== "all") params.isApplied = statusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await openingBalancesApi.getAll(params);
      return res.data;
    },
  });

  const { data: stats } = useQuery<OpeningBalanceStats>({
    queryKey: ["opening-balances-stats"],
    queryFn: async () => {
      const res = await openingBalancesApi.getStats();
      return res.data;
    },
  });

  // Normalise both array and paginated responses
  const balances: OpeningBalance[] = Array.isArray(balancesResponse)
    ? balancesResponse
    : (balancesResponse?.data ?? []);

  // ── Mutations ────────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: string) => openingBalancesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opening-balances"] });
      queryClient.invalidateQueries({ queryKey: ["opening-balances-stats"] });
      toast.success(t("messages.deleted"));
    },
    onError: () => toast.error(t("messages.deleteFailed")),
  });

  const applyMutation = useMutation({
    mutationFn: (id: string) => openingBalancesApi.apply(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opening-balances"] });
      queryClient.invalidateQueries({ queryKey: ["opening-balances-stats"] });
      toast.success(t("messages.applied"));
    },
    onError: () => toast.error(t("messages.applyFailed")),
  });

  const applyAllMutation = useMutation({
    mutationFn: (date: string) => openingBalancesApi.applyAll({ date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opening-balances"] });
      queryClient.invalidateQueries({ queryKey: ["opening-balances-stats"] });
      setIsApplyAllDialogOpen(false);
      setApplyAllDate("");
      toast.success(t("messages.allApplied"));
    },
    onError: () => toast.error(t("messages.applyAllFailed")),
  });

  // ── Helpers ──────────────────────────────────────────────────────────────

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("ru-RU").format(amount) + " UZS";

  const formatDateShort = (dateStr: string) =>
    formatDate(dateStr, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const formatDateTime = (dateStr: string) =>
    formatDate(dateStr, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleDelete = (balance: OpeningBalance) => {
    if (!confirm(t("messages.confirmDelete"))) return;
    deleteMutation.mutate(balance.id);
  };

  const handleApplyAll = () => {
    if (!applyAllDate) return;
    if (!confirm(t("messages.confirmApplyAll"))) return;
    applyAllMutation.mutate(applyAllDate);
  };

  // ── Error state ──────────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{t("loadError")}</p>
        <p className="text-muted-foreground mb-4">{t("loadFailed")}</p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["opening-balances"] })
          }
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Apply All dialog trigger */}
          <Dialog
            open={isApplyAllDialogOpen}
            onOpenChange={setIsApplyAllDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <ChevronsRight className="w-4 h-4 mr-2" />
                {t("actions.applyAll")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{t("actions.applyAll")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium">
                    {t("form.date")}
                  </label>
                  <Input
                    type="date"
                    value={applyAllDate}
                    onChange={(e) => setApplyAllDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsApplyAllDialogOpen(false)}
                  >
                    {t("form.cancel")}
                  </Button>
                  <Button
                    onClick={handleApplyAll}
                    disabled={!applyAllDate || applyAllMutation.isPending}
                  >
                    <ChevronsRight className="w-4 h-4 mr-2" />
                    {applyAllMutation.isPending
                      ? t("form.applying")
                      : t("actions.applyAll")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create dialog trigger */}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) setEditingBalance(null);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t("createBalance")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingBalance ? t("editBalance") : t("createBalance")}
                </DialogTitle>
              </DialogHeader>
              <OpeningBalanceForm
                balance={editingBalance ?? undefined}
                onSuccess={() => {
                  setIsCreateDialogOpen(false);
                  setEditingBalance(null);
                  queryClient.invalidateQueries({
                    queryKey: ["opening-balances"],
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["opening-balances-stats"],
                  });
                }}
                onCancel={() => {
                  setIsCreateDialogOpen(false);
                  setEditingBalance(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalRecords ?? "—"}</p>
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
              <p className="text-2xl font-bold">{stats?.applied ?? "—"}</p>
              <p className="text-sm text-muted-foreground">
                {t("stats.applied")}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.pending ?? "—"}</p>
              <p className="text-sm text-muted-foreground">
                {t("stats.pending")}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold leading-tight">
                {stats?.totalValue != null
                  ? formatMoney(stats.totalValue)
                  : "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("stats.totalValue")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
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
                ? t("filters.allStatuses")
                : t(
                    `statuses.${statusFilter === "true" ? "applied" : "unapplied"}`,
                  )}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>
              {t("filters.allStatuses")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("true")}>
              {t("statuses.applied")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("false")}>
              {t("statuses.unapplied")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36"
            placeholder={t("filters.dateFrom")}
            title={t("filters.dateFrom")}
          />
          <span className="text-muted-foreground text-sm">—</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36"
            placeholder={t("filters.dateTo")}
            title={t("filters.dateTo")}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.date")}</TableHead>
              <TableHead>{t("columns.entity")}</TableHead>
              <TableHead>{t("columns.type")}</TableHead>
              <TableHead className="text-right">
                {t("columns.amount")}
              </TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.appliedAt")}</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : balances.length > 0 ? (
              balances.map((balance) => (
                <TableRow key={balance.id}>
                  {/* Date */}
                  <TableCell className="font-medium">
                    {formatDateShort(balance.date)}
                  </TableCell>

                  {/* Entity */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {balance.entityReference}
                        </p>
                        {balance.entityType && (
                          <p className="text-xs text-muted-foreground">
                            {balance.entityType}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {balance.type}
                    </span>
                  </TableCell>

                  {/* Amount */}
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatMoney(balance.amount)}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      className={
                        statusColors[
                          balance.isApplied ? "applied" : "unapplied"
                        ]
                      }
                    >
                      {balance.isApplied
                        ? t("statuses.applied")
                        : t("statuses.unapplied")}
                    </Badge>
                  </TableCell>

                  {/* Applied At */}
                  <TableCell className="text-sm text-muted-foreground">
                    {balance.appliedAt
                      ? formatDateTime(balance.appliedAt)
                      : "—"}
                  </TableCell>

                  {/* Actions */}
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
                        {/* Apply (only if unapplied) */}
                        {!balance.isApplied && (
                          <DropdownMenuItem
                            onClick={() => applyMutation.mutate(balance.id)}
                            disabled={applyMutation.isPending}
                          >
                            <PlayCircle className="w-4 h-4 mr-2 text-green-500" />
                            {t("actions.apply")}
                          </DropdownMenuItem>
                        )}

                        {/* Edit (only if unapplied) */}
                        {!balance.isApplied && (
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingBalance(balance);
                              setIsCreateDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {t("actions.edit")}
                          </DropdownMenuItem>
                        )}

                        {/* Delete (only if unapplied) */}
                        {!balance.isApplied && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(balance)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t("actions.delete")}
                          </DropdownMenuItem>
                        )}

                        {/* If applied — no destructive actions, show a disabled label */}
                        {balance.isApplied && (
                          <DropdownMenuItem disabled>
                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                            {t("statuses.applied")}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Wallet className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">{t("notFound")}</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Form Component ───────────────────────────────────────────────────────────

interface OpeningBalanceFormProps {
  balance?: OpeningBalance;
  onSuccess: () => void;
  onCancel: () => void;
}

function OpeningBalanceForm({
  balance,
  onSuccess,
  onCancel,
}: OpeningBalanceFormProps) {
  const t = useTranslations("openingBalances");

  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    entityReference: balance?.entityReference ?? "",
    entityType: balance?.entityType ?? "",
    type: balance?.type ?? "",
    amount: balance?.amount?.toString() ?? "",
    date: balance?.date ? balance.date.split("T")[0] : today,
    notes: balance?.notes ?? "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        amount: parseFloat(data.amount),
      };
      if (balance) {
        return openingBalancesApi.update(balance.id, payload);
      }
      return openingBalancesApi.create(payload);
    },
    onSuccess: () => {
      toast.success(balance ? t("messages.updated") : t("messages.created"));
      onSuccess();
    },
    onError: () => {
      toast.error(t("messages.saveFailed"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.entityReference || !formData.amount || !formData.date) return;
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {/* Entity reference */}
      <div>
        <label className="text-sm font-medium">
          {t("form.entityReference")}
        </label>
        <Input
          value={formData.entityReference}
          onChange={(e) =>
            setFormData({ ...formData, entityReference: e.target.value })
          }
          placeholder={t("form.entityReferencePlaceholder")}
          required
          className="mt-1"
        />
      </div>

      {/* Entity type + Balance type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t("form.entityType")}</label>
          <Input
            value={formData.entityType}
            onChange={(e) =>
              setFormData({ ...formData, entityType: e.target.value })
            }
            placeholder={t("form.entityTypePlaceholder")}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("form.type")}</label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={t("form.typePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">{t("form.type_cash")}</SelectItem>
              <SelectItem value="non_cash">
                {t("form.type_non_cash")}
              </SelectItem>
              <SelectItem value="debt">{t("form.type_debt")}</SelectItem>
              <SelectItem value="inventory">
                {t("form.type_inventory")}
              </SelectItem>
              <SelectItem value="other">{t("form.type_other")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Amount + Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t("form.amount")}</label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            placeholder="0"
            required
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("form.date")}</label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            className="mt-1"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-sm font-medium">
          {t("form.notes")}{" "}
          <span className="text-muted-foreground font-normal text-xs">
            ({t("form.optional")})
          </span>
        </label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder={t("form.notesPlaceholder")}
          className="mt-1 h-20 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("form.cancel")}
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? t("form.saving")
            : balance
              ? t("form.update")
              : t("form.create")}
        </Button>
      </div>
    </form>
  );
}
