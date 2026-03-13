"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  ShoppingCart,
  Search,
  Filter,
  ChevronDown,
  Clock,
  CheckCircle2,
  Package,
  CreditCard,
  User,
  Coffee,
  Eye,
  Download,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatCurrency,
} from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    telegramId?: string;
  };
  machine: {
    id: string;
    name: string;
    serialNumber: string;
    address: string;
  };
  items: {
    id: string;
    product: {
      name: string;
      imageUrl?: string;
    };
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  paymentMethod: "payme" | "click" | "uzum" | "telegram_stars" | "cash";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "ready"
    | "completed"
    | "cancelled";
  createdAt: string;
  completedAt?: string;
}

const paymentMethodKeys: Record<string, string> = {
  payme: "payMethodPayme",
  click: "payMethodClick",
  uzum: "payMethodUzum",
  telegram_stars: "payMethodTelegramStars",
  cash: "payMethodCash",
};

const paymentStatusKeys: Record<string, string> = {
  pending: "payStatusPending",
  paid: "payStatusPaid",
  failed: "payStatusFailed",
  refunded: "payStatusRefunded",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500",
  paid: "bg-green-500/10 text-green-500",
  failed: "bg-red-500/10 text-red-500",
  refunded: "bg-purple-500/10 text-purple-500",
};

const statusKeys: Record<string, string> = {
  pending: "statusPending",
  confirmed: "statusConfirmed",
  processing: "statusProcessing",
  ready: "statusReady",
  completed: "statusCompleted",
  cancelled: "statusCancelled",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500",
  confirmed: "bg-blue-500/10 text-blue-500",
  processing: "bg-purple-500/10 text-purple-500",
  ready: "bg-green-500/10 text-green-500",
  completed: "bg-emerald-500/10 text-emerald-500",
  cancelled: "bg-red-500/10 text-red-500",
};

export default function OrdersPage() {
  const t = useTranslations("orders");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch orders
  const {
    data: orders,
    isLoading,
    isError,
    refetch,
  } = useQuery<Order[]>({
    queryKey: ["orders", debouncedSearch, statusFilter, paymentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (paymentFilter !== "all")
        params.append("paymentStatus", paymentFilter);
      const res = await api.get(`/orders?${params}`);
      return res.data;
    },
  });

  const stats = useMemo(
    () => ({
      total: orders?.length || 0,
      pending: orders?.filter((o) => o.status === "pending").length || 0,
      completed: orders?.filter((o) => o.status === "completed").length || 0,
      totalRevenue:
        orders
          ?.filter((o) => o.paymentStatus === "paid")
          .reduce((sum, o) => sum + o.totalAmount, 0) || 0,
    }),
    [orders],
  );

  const formatMoney = formatCurrency;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{t("loadError")}</p>
        <p className="text-muted-foreground mb-4">{t("loadFailed")}</p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["orders"] })
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("refresh")}
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {t("export")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary" />
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
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">
                {t("statsPending")}
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
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">
                {t("statsCompleted")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatMoney(stats.totalRevenue)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("statsRevenue")}
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              {t("filterStatus")}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>
              {t("allStatuses")}
            </DropdownMenuItem>
            {Object.entries(statusKeys).map(([value, key]) => (
              <DropdownMenuItem
                key={value}
                onClick={() => setStatusFilter(value)}
              >
                {t(key as Parameters<typeof t>[0])}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <CreditCard className="w-4 h-4 mr-2" />
              {t("filterPayment")}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setPaymentFilter("all")}>
              {t("allPaymentStatuses")}
            </DropdownMenuItem>
            {Object.entries(paymentStatusKeys).map(([value, key]) => (
              <DropdownMenuItem
                key={value}
                onClick={() => setPaymentFilter(value)}
              >
                {t(key as Parameters<typeof t>[0])}
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
              <TableHead>{t("colOrder")}</TableHead>
              <TableHead>{t("colCustomer")}</TableHead>
              <TableHead>{t("colMachine")}</TableHead>
              <TableHead>{t("colAmount")}</TableHead>
              <TableHead>{t("colPayment")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead>{t("colDate")}</TableHead>
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
            ) : orders?.length ? (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">#{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.items.length} {t("itemsCount")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {order.customer.firstName || t("guest")}
                        </p>
                        {order.customer.phone && (
                          <p className="text-sm text-muted-foreground">
                            {order.customer.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium line-clamp-1">
                          {order.machine.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.machine.serialNumber}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold">
                      {formatMoney(order.totalAmount)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge
                        className={paymentStatusColors[order.paymentStatus]}
                      >
                        {t(
                          paymentStatusKeys[order.paymentStatus] as Parameters<
                            typeof t
                          >[0],
                        )}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          paymentMethodKeys[order.paymentMethod] as Parameters<
                            typeof t
                          >[0],
                        )}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[order.status]}>
                      {t(statusKeys[order.status] as Parameters<typeof t>[0])}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{formatDate(order.createdAt)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(order.createdAt, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">{t("notFound")}</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Order Details Dialog */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("dialogTitle")} #{selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <Badge className={statusColors[selectedOrder.status]}>
                  {t(
                    statusKeys[selectedOrder.status] as Parameters<typeof t>[0],
                  )}
                </Badge>
                <Badge
                  className={paymentStatusColors[selectedOrder.paymentStatus]}
                >
                  {t(
                    paymentStatusKeys[
                      selectedOrder.paymentStatus
                    ] as Parameters<typeof t>[0],
                  )}
                </Badge>
              </div>

              {/* Customer */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">
                  {t("dialogCustomer")}
                </h4>
                <p className="font-medium">
                  {selectedOrder.customer.firstName || t("guest")}
                </p>
                {selectedOrder.customer.phone && (
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.customer.phone}
                  </p>
                )}
              </div>

              {/* Machine */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">
                  {t("dialogMachine")}
                </h4>
                <p className="font-medium">{selectedOrder.machine.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.machine.address}
                </p>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{t("dialogItems")}</h4>
                {selectedOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × {formatMoney(item.price)}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">
                      {formatMoney(item.quantity * item.price)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
                <span className="font-medium">{t("dialogTotal")}</span>
                <span className="text-xl font-bold text-primary">
                  {formatMoney(selectedOrder.totalAmount)}
                </span>
              </div>

              {/* Payment Info */}
              <div className="text-sm text-muted-foreground">
                <p>
                  {t("dialogPaymentMethod")}:{" "}
                  {t(
                    paymentMethodKeys[
                      selectedOrder.paymentMethod
                    ] as Parameters<typeof t>[0],
                  )}
                </p>
                <p>
                  {t("dialogCreated")}:{" "}
                  {formatDateTime(selectedOrder.createdAt)}
                </p>
                {selectedOrder.completedAt && (
                  <p>
                    {t("dialogCompleted")}:{" "}
                    {formatDateTime(selectedOrder.completedAt)}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
