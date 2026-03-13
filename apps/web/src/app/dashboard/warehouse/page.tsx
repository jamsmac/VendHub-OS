"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Warehouse,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Box,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { warehouseApi } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type WarehouseType = "main" | "transit" | "mobile" | "virtual";

interface WarehouseItem {
  id: string;
  name: string;
  type: WarehouseType;
  address?: string;
  description?: string;
  is_active: boolean;
  capacity?: number;
  created_at: string;
}

interface StockItem {
  product_id: string;
  product_name: string;
  sku?: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  unit?: string;
}

interface Movement {
  id: string;
  type: "in" | "out" | "transfer" | "adjustment" | "write_off";
  status: "pending" | "completed" | "cancelled";
  product_name: string;
  quantity: number;
  note?: string;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WAREHOUSE_TYPES: WarehouseType[] = [
  "main",
  "transit",
  "mobile",
  "virtual",
];

const typeColors: Record<WarehouseType, string> = {
  main: "bg-blue-500/10 text-blue-500",
  transit: "bg-amber-500/10 text-amber-500",
  mobile: "bg-purple-500/10 text-purple-500",
  virtual: "bg-muted text-muted-foreground",
};

const movementTypeColors: Record<string, string> = {
  in: "bg-green-500/10 text-green-500",
  out: "bg-red-500/10 text-red-500",
  transfer: "bg-blue-500/10 text-blue-500",
  adjustment: "bg-amber-500/10 text-amber-500",
  write_off: "bg-destructive/10 text-destructive",
};

const movementStatusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500",
  completed: "bg-green-500/10 text-green-500",
  cancelled: "bg-muted text-muted-foreground",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WarehousePage() {
  const t = useTranslations("warehouse");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] =
    useState<WarehouseItem | null>(null);

  // Stock tab state
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");

  // Movements tab state
  const [movementsWarehouseId, setMovementsWarehouseId] = useState<string>("");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");
  const [isCreateMovementOpen, setIsCreateMovementOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Warehouses query ──────────────────────────────────────────────────────
  const {
    data: warehousesResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["warehouses", debouncedSearch, typeFilter, activeFilter],
    queryFn: async () => {
      const params: Record<string, string | boolean> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (typeFilter !== "all") params.type = typeFilter;
      if (activeFilter !== "all") params.isActive = activeFilter === "active";
      const res = await warehouseApi.getAll(params);
      return res.data;
    },
  });

  const warehouses: WarehouseItem[] = Array.isArray(warehousesResponse)
    ? warehousesResponse
    : (warehousesResponse?.data ?? []);

  // ── Stock query ───────────────────────────────────────────────────────────
  const { data: stockResponse, isLoading: isStockLoading } = useQuery({
    queryKey: ["warehouse-stock", selectedWarehouseId],
    queryFn: async () => {
      const res = await warehouseApi.getStock(selectedWarehouseId);
      return res.data;
    },
    enabled: !!selectedWarehouseId,
  });

  const stockItems: StockItem[] = Array.isArray(stockResponse)
    ? stockResponse
    : (stockResponse?.items ?? []);

  // ── Movements query ───────────────────────────────────────────────────────
  const { data: movementsResponse, isLoading: isMovementsLoading } = useQuery({
    queryKey: ["warehouse-movements", movementsWarehouseId, movementTypeFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (movementTypeFilter !== "all") params.type = movementTypeFilter;
      const res = await warehouseApi.getMovements(movementsWarehouseId, params);
      return res.data;
    },
    enabled: !!movementsWarehouseId,
  });

  const movements: Movement[] = Array.isArray(movementsResponse)
    ? movementsResponse
    : (movementsResponse?.data ?? []);

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await warehouseApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success(t("deleted"));
    },
    onError: () => {
      toast.error(t("deleteFailed"));
    },
  });

  const handleDelete = (warehouse: WarehouseItem) => {
    if (window.confirm(t("confirmDelete", { name: warehouse.name }))) {
      deleteMutation.mutate(warehouse.id);
    }
  };

  const stats = {
    total: warehouses.length,
    active: warehouses.filter((w) => w.is_active).length,
    byType: WAREHOUSE_TYPES.reduce(
      (acc, type) => ({
        ...acc,
        [type]: warehouses.filter((w) => w.type === type).length,
      }),
      {} as Record<WarehouseType, number>,
    ),
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{t("loadError")}</p>
        <p className="text-muted-foreground mb-4">{t("loadFailed")}</p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["warehouses"] })
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
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) setEditingWarehouse(null);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t("createWarehouse")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingWarehouse ? t("editWarehouse") : t("createWarehouse")}
              </DialogTitle>
            </DialogHeader>
            <WarehouseForm
              warehouse={editingWarehouse ?? undefined}
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                setEditingWarehouse(null);
                queryClient.invalidateQueries({ queryKey: ["warehouses"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-primary" />
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
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Box className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.byType.main}</p>
              <p className="text-sm text-muted-foreground">{t("types.main")}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.byType.transit}</p>
              <p className="text-sm text-muted-foreground">
                {t("types.transit")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="warehouses">
        <TabsList>
          <TabsTrigger value="warehouses">{t("tabs.warehouses")}</TabsTrigger>
          <TabsTrigger value="stock">{t("tabs.stock")}</TabsTrigger>
          <TabsTrigger value="movements">{t("tabs.movements")}</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Warehouses ───────────────────────────────────────────── */}
        <TabsContent value="warehouses" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
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
                  <Warehouse className="w-4 h-4 mr-2" />
                  {typeFilter === "all"
                    ? t("allTypes")
                    : t(`types.${typeFilter}`)}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setTypeFilter("all")}>
                  {t("allTypes")}
                </DropdownMenuItem>
                {WAREHOUSE_TYPES.map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => setTypeFilter(type)}
                  >
                    {t(`types.${type}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Active filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <ChevronDown className="w-4 h-4 mr-2" />
                  {activeFilter === "all"
                    ? t("allStatuses")
                    : activeFilter === "active"
                      ? t("statusActive")
                      : t("statusInactive")}
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setActiveFilter("all")}>
                  {t("allStatuses")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveFilter("active")}>
                  {t("statusActive")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveFilter("inactive")}>
                  {t("statusInactive")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.name")}</TableHead>
                  <TableHead>{t("columns.type")}</TableHead>
                  <TableHead>{t("columns.address")}</TableHead>
                  <TableHead>{t("columns.isActive")}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : warehouses.length ? (
                  warehouses.map((warehouse) => (
                    <TableRow key={warehouse.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Warehouse className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{warehouse.name}</p>
                            {warehouse.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {warehouse.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={typeColors[warehouse.type]}>
                          {t(`types.${warehouse.type}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {warehouse.address || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {warehouse.is_active ? (
                          <Badge className="bg-green-500/10 text-green-500">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {t("statusActive")}
                          </Badge>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground">
                            <XCircle className="w-3 h-3 mr-1" />
                            {t("statusInactive")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("columns.actions")}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingWarehouse(warehouse);
                                setIsCreateDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              {t("actionEdit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedWarehouseId(warehouse.id);
                              }}
                            >
                              <Package className="w-4 h-4 mr-2" />
                              {t("actionViewStock")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(warehouse)}
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
                    <TableCell colSpan={5} className="text-center py-12">
                      <Warehouse className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">{t("notFound")}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Tab 2: Stock ────────────────────────────────────────────────── */}
        <TabsContent value="stock" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Select
              value={selectedWarehouseId}
              onValueChange={setSelectedWarehouseId}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder={t("selectWarehouse")} />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedWarehouseId ? (
            <div className="bg-card rounded-xl border flex flex-col items-center justify-center py-16">
              <Package className="w-12 h-12 mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {t("selectWarehousePrompt")}
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("stock.product")}</TableHead>
                    <TableHead>{t("stock.sku")}</TableHead>
                    <TableHead className="text-right">
                      {t("stock.quantity")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("stock.reserved")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("stock.available")}
                    </TableHead>
                    <TableHead>{t("stock.unit")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isStockLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : stockItems.length ? (
                    stockItems.map((item) => (
                      <TableRow key={item.product_id}>
                        <TableCell className="font-medium">
                          {item.product_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.sku ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right font-mono text-amber-600">
                          {item.reserved_quantity}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          {item.available_quantity}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.unit ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-muted-foreground">
                          {t("stock.empty")}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Tab 3: Movements ────────────────────────────────────────────── */}
        <TabsContent value="movements" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={movementsWarehouseId}
              onValueChange={setMovementsWarehouseId}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder={t("selectWarehouse")} />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Movement type filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={!movementsWarehouseId}>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  {movementTypeFilter === "all"
                    ? t("allMovementTypes")
                    : t(`movementTypes.${movementTypeFilter}`)}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setMovementTypeFilter("all")}>
                  {t("allMovementTypes")}
                </DropdownMenuItem>
                {["in", "out", "transfer", "adjustment", "write_off"].map(
                  (type) => (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => setMovementTypeFilter(type)}
                    >
                      {t(`movementTypes.${type}`)}
                    </DropdownMenuItem>
                  ),
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {movementsWarehouseId && (
              <Dialog
                open={isCreateMovementOpen}
                onOpenChange={setIsCreateMovementOpen}
              >
                <DialogTrigger asChild>
                  <Button className="ml-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    {t("createMovement")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t("createMovement")}</DialogTitle>
                  </DialogHeader>
                  <MovementForm
                    warehouseId={movementsWarehouseId}
                    onSuccess={() => {
                      setIsCreateMovementOpen(false);
                      queryClient.invalidateQueries({
                        queryKey: ["warehouse-movements"],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["warehouse-stock"],
                      });
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>

          {!movementsWarehouseId ? (
            <div className="bg-card rounded-xl border flex flex-col items-center justify-center py-16">
              <ArrowRightLeft className="w-12 h-12 mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {t("selectWarehousePrompt")}
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("movements.product")}</TableHead>
                    <TableHead>{t("movements.type")}</TableHead>
                    <TableHead className="text-right">
                      {t("movements.quantity")}
                    </TableHead>
                    <TableHead>{t("movements.status")}</TableHead>
                    <TableHead>{t("movements.note")}</TableHead>
                    <TableHead>{t("movements.date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isMovementsLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : movements.length ? (
                    movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell className="font-medium">
                          {movement.product_name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              movementTypeColors[movement.type] ??
                              "bg-muted text-muted-foreground"
                            }
                          >
                            {t(`movementTypes.${movement.type}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {movement.quantity}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              movementStatusColors[movement.status] ??
                              "bg-muted text-muted-foreground"
                            }
                          >
                            {t(`movementStatuses.${movement.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                          {movement.note ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(movement.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-muted-foreground">
                          {t("movements.empty")}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Warehouse Form ────────────────────────────────────────────────────────────

function WarehouseForm({
  warehouse,
  onSuccess,
}: {
  warehouse?: WarehouseItem;
  onSuccess: () => void;
}) {
  const t = useTranslations("warehouse");
  const [formData, setFormData] = useState({
    name: warehouse?.name ?? "",
    type: warehouse?.type ?? ("main" as WarehouseType),
    address: warehouse?.address ?? "",
    description: warehouse?.description ?? "",
    is_active: warehouse?.is_active ?? true,
    capacity: warehouse?.capacity?.toString() ?? "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        name: data.name,
        type: data.type,
        address: data.address || undefined,
        description: data.description || undefined,
        is_active: data.is_active,
        capacity: data.capacity ? Number(data.capacity) : undefined,
      };
      if (warehouse) {
        return warehouseApi.update(warehouse.id, payload);
      }
      return warehouseApi.create(payload);
    },
    onSuccess: () => {
      toast.success(warehouse ? t("updated") : t("created"));
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
        <label className="text-sm font-medium">{t("form.name")}</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t("form.type")}</label>
          <Select
            value={formData.type}
            onValueChange={(value) =>
              setFormData({ ...formData, type: value as WarehouseType })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WAREHOUSE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">{t("form.capacity")}</label>
          <Input
            type="number"
            min={0}
            value={formData.capacity}
            onChange={(e) =>
              setFormData({ ...formData, capacity: e.target.value })
            }
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">{t("form.address")}</label>
        <Input
          value={formData.address}
          onChange={(e) =>
            setFormData({ ...formData, address: e.target.value })
          }
          className="mt-1"
        />
      </div>

      <div>
        <label className="text-sm font-medium">{t("form.description")}</label>
        <Textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="mt-1 h-20 resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          id="is_active"
          type="checkbox"
          checked={formData.is_active}
          onChange={(e) =>
            setFormData({ ...formData, is_active: e.target.checked })
          }
          className="h-4 w-4 rounded border-border"
        />
        <label
          htmlFor="is_active"
          className="text-sm font-medium cursor-pointer"
        >
          {t("form.isActive")}
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? t("form.saving")
            : warehouse
              ? t("form.update")
              : t("form.create")}
        </Button>
      </div>
    </form>
  );
}

// ─── Movement Form ─────────────────────────────────────────────────────────────

function MovementForm({
  warehouseId,
  onSuccess,
}: {
  warehouseId: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("warehouse");
  const [formData, setFormData] = useState({
    type: "in" as "in" | "out" | "transfer" | "adjustment" | "write_off",
    product_id: "",
    quantity: "",
    note: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return warehouseApi.createMovement(warehouseId, {
        type: data.type,
        product_id: data.product_id,
        quantity: Number(data.quantity),
        note: data.note || undefined,
      });
    },
    onSuccess: () => {
      toast.success(t("movementCreated"));
      onSuccess();
    },
    onError: () => {
      toast.error(t("movementCreateError"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">{t("movements.type")}</label>
        <Select
          value={formData.type}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              type: value as typeof formData.type,
            })
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["in", "out", "transfer", "adjustment", "write_off"].map(
              (type) => (
                <SelectItem key={type} value={type}>
                  {t(`movementTypes.${type}`)}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">{t("form.productId")}</label>
        <Input
          value={formData.product_id}
          onChange={(e) =>
            setFormData({ ...formData, product_id: e.target.value })
          }
          required
          className="mt-1"
          placeholder={t("form.productIdPlaceholder")}
        />
      </div>

      <div>
        <label className="text-sm font-medium">{t("form.quantity")}</label>
        <Input
          type="number"
          min={1}
          value={formData.quantity}
          onChange={(e) =>
            setFormData({ ...formData, quantity: e.target.value })
          }
          required
          className="mt-1"
        />
      </div>

      <div>
        <label className="text-sm font-medium">{t("form.note")}</label>
        <Textarea
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          className="mt-1 h-16 resize-none"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? t("form.saving") : t("form.create")}
        </Button>
      </div>
    </form>
  );
}
