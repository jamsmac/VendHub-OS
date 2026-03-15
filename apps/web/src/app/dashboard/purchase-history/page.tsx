"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Package,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  PackageCheck,
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
  DropdownMenuSeparator,
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
import { purchaseHistoryApi } from "@/lib/api";

interface Purchase {
  id: string;
  purchaseDate: string;
  invoiceNumber: string | null;
  productId: string;
  product?: { name: string };
  supplierId: string | null;
  supplier?: { name: string };
  warehouseId: string | null;
  warehouse?: { name: string };
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  status: "PENDING" | "RECEIVED" | "CANCELLED" | "RETURNED";
  notes: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: typeof Clock; label: string }
> = {
  PENDING: {
    color: "bg-amber-100 text-amber-700",
    icon: Clock,
    label: "statusPending",
  },
  RECEIVED: {
    color: "bg-emerald-100 text-emerald-700",
    icon: PackageCheck,
    label: "statusReceived",
  },
  CANCELLED: {
    color: "bg-red-100 text-red-700",
    icon: XCircle,
    label: "statusCancelled",
  },
  RETURNED: {
    color: "bg-blue-100 text-blue-700",
    icon: RotateCcw,
    label: "statusReturned",
  },
};

export default function PurchaseHistoryPage() {
  const t = useTranslations("purchaseHistory");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery<{
    data: Purchase[];
    total: number;
  }>({
    queryKey: ["purchase-history", search, statusFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: pageSize };
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await purchaseHistoryApi.getAll(params);
      return res.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["purchase-history-stats"],
    queryFn: async () => {
      const res = await purchaseHistoryApi.getStats();
      return res.data;
    },
  });

  const purchases = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const receiveMutation = useMutation({
    mutationFn: (id: string) => purchaseHistoryApi.receive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-history"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-history-stats"] });
      toast.success(t("received"));
    },
    onError: () => toast.error(t("errorAction")),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => purchaseHistoryApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-history"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-history-stats"] });
      toast.success(t("cancelled"));
    },
    onError: () => toast.error(t("errorAction")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => purchaseHistoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-history"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-history-stats"] });
      toast.success(t("deleted"));
    },
    onError: () => toast.error(t("errorAction")),
  });

  const fmtCurrency = (n: number) => new Intl.NumberFormat("ru-RU").format(n);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-espresso-dark flex items-center gap-2">
            <Package className="h-6 w-6" />
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-espresso-light">{t("subtitle")}</p>
        </div>
        <CreatePurchaseDialog
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["purchase-history"] });
            queryClient.invalidateQueries({
              queryKey: ["purchase-history-stats"],
            });
          }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          {
            label: t("statsTotal"),
            value: stats?.totalPurchases ?? 0,
            color: "text-espresso-dark",
          },
          {
            label: t("statsPending"),
            value: stats?.pendingCount ?? 0,
            color: "text-amber-600",
          },
          {
            label: t("statsReceived"),
            value: stats?.receivedCount ?? 0,
            color: "text-emerald-600",
          },
          {
            label: t("statsTotalAmount"),
            value: `${fmtCurrency(stats?.totalAmount ?? 0)} UZS`,
            color: "text-espresso-dark",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-espresso/10 bg-white p-4"
          >
            <p className="text-xs text-espresso-light">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>
              {typeof s.value === "number" ? s.value : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso-light" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          {["all", "PENDING", "RECEIVED", "CANCELLED", "RETURNED"].map((f) => (
            <Button
              key={f}
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter(f);
                setPage(1);
              }}
              className={
                statusFilter === f
                  ? "bg-espresso text-white hover:bg-espresso-dark"
                  : "bg-espresso-50 text-espresso-light hover:bg-espresso-100"
              }
            >
              {f === "all"
                ? t("filterAll")
                : t(`filter${f.charAt(0)}${f.slice(1).toLowerCase()}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-espresso/10 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-espresso/10">
              {[
                t("colDate"),
                t("colInvoice"),
                t("colProduct"),
                t("colSupplier"),
                t("colQuantity"),
                t("colUnitPrice"),
                t("colTotal"),
                t("colStatus"),
                "",
              ].map((h, i) => (
                <TableHead
                  key={h || i}
                  className="px-3 py-3 text-xs font-medium text-espresso-light"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={j} className="px-3 py-3">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : purchases.map((p) => {
                  const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.PENDING;
                  const StatusIcon = cfg.icon;
                  return (
                    <TableRow
                      key={p.id}
                      className="border-b border-espresso/5 hover:bg-espresso-50/50 transition-colors"
                    >
                      <TableCell className="px-3 py-3 text-sm text-espresso whitespace-nowrap">
                        {fmtDate(p.purchaseDate)}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-sm text-espresso-light">
                        {p.invoiceNumber || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-sm font-medium text-espresso-dark">
                        {p.product?.name ?? p.productId}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-sm text-espresso-light">
                        {p.supplier?.name ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-sm text-espresso">
                        {p.quantity} {p.unit}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-sm text-espresso text-right">
                        {fmtCurrency(p.unitPrice)}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-sm font-medium text-espresso-dark text-right">
                        {fmtCurrency(p.totalPrice)} UZS
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <Badge
                          variant="secondary"
                          className={`${cfg.color} gap-1 text-xs`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {t(cfg.label)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {p.status === "PENDING" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => receiveMutation.mutate(p.id)}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                                  {t("actionReceive")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => cancelMutation.mutate(p.id)}
                                >
                                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                  {t("actionCancel")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {p.status === "PENDING" && (
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                {t("actionEdit")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => deleteMutation.mutate(p.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("actionDelete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
            {!isLoading && purchases.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-12 text-center text-espresso-light"
                >
                  {t("noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-espresso/10 px-4 py-3 text-sm">
            <span className="text-espresso-light">
              {t("paginationText", {
                count: total,
                page,
                total: totalPages,
              })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t("prevPage")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                {t("nextPage")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Create Purchase Dialog ──

function CreatePurchaseDialog({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslations("purchaseHistory");
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    purchaseDate: new Date().toISOString().slice(0, 10),
    productId: "",
    quantity: "",
    unitPrice: "",
    unit: "pcs",
    invoiceNumber: "",
    supplierId: "",
    warehouseId: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return purchaseHistoryApi.create({
        purchaseDate: data.purchaseDate,
        productId: data.productId,
        quantity: Number(data.quantity),
        unitPrice: Number(data.unitPrice),
        unit: data.unit,
        invoiceNumber: data.invoiceNumber || undefined,
        supplierId: data.supplierId || undefined,
        warehouseId: data.warehouseId || undefined,
        notes: data.notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success(t("created"));
      onSuccess();
      setOpen(false);
      setFormData({
        purchaseDate: new Date().toISOString().slice(0, 10),
        productId: "",
        quantity: "",
        unitPrice: "",
        unit: "pcs",
        invoiceNumber: "",
        supplierId: "",
        warehouseId: "",
        notes: "",
      });
    },
    onError: () => toast.error(t("errorAction")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-espresso text-white hover:bg-espresso-dark">
          <Plus className="h-4 w-4" />
          {t("createPurchase")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("newPurchase")}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(formData);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-espresso">
                {t("purchaseDate")}
              </label>
              <Input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) =>
                  setFormData({ ...formData, purchaseDate: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-espresso">
                {t("invoiceNumber")}
              </label>
              <Input
                value={formData.invoiceNumber}
                onChange={(e) =>
                  setFormData({ ...formData, invoiceNumber: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-espresso">
              {t("product")} *
            </label>
            <Input
              placeholder="Product ID"
              value={formData.productId}
              onChange={(e) =>
                setFormData({ ...formData, productId: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-espresso">
                {t("quantity")} *
              </label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-espresso">
                {t("unitPrice")} *
              </label>
              <Input
                type="number"
                min="0"
                value={formData.unitPrice}
                onChange={(e) =>
                  setFormData({ ...formData, unitPrice: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-espresso">
                {t("unit")}
              </label>
              <Select
                value={formData.unit}
                onValueChange={(v) => setFormData({ ...formData, unit: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">pcs</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="l">L</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                  <SelectItem value="pack">pack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-espresso">
              {t("notes")}
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t("actionCancel")}
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-espresso text-white hover:bg-espresso-dark"
            >
              {t("createPurchase")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
