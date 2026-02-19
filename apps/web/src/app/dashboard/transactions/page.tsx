"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  ArrowDownUp,
  Search,
  MoreVertical,
  Eye,
  FileText,
  Download,
  DollarSign,
  TrendingUp,
  Receipt,
  Wallet,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { transactionsApi } from "@/lib/api";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

// --- Types ---

interface Transaction {
  id: string;
  transaction_number: string;
  type: TransactionType;
  amount: number;
  payment_method: PaymentMethod;
  status: TransactionStatus;
  machine_id: string;
  machine_name?: string;
  machine_number?: string;
  created_at: string;
  description?: string;
}

interface TransactionsResponse {
  data: Transaction[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats?: {
    total_revenue: number;
    today_count: number;
    average_check: number;
    collections_count: number;
  };
}

type TransactionType =
  | "SALE"
  | "REFUND"
  | "COLLECTION"
  | "ENCASHMENT"
  | "EXPENSE"
  | "TRANSFER"
  | "COMMISSION"
  | "ADJUSTMENT";

type TransactionStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "DISPUTED";

type PaymentMethod =
  | "CASH"
  | "PAYME"
  | "CLICK"
  | "UZUM"
  | "CARD"
  | "QR_CODE"
  | "TELEGRAM_STARS"
  | "MIXED"
  | "OTHER";

// --- Colors only (module-level, no translatable strings) ---

const typeColors: Record<TransactionType, { color: string; bgColor: string }> =
  {
    SALE: { color: "text-green-700", bgColor: "bg-green-100" },
    REFUND: { color: "text-purple-700", bgColor: "bg-purple-100" },
    COLLECTION: { color: "text-blue-700", bgColor: "bg-blue-100" },
    ENCASHMENT: { color: "text-indigo-700", bgColor: "bg-indigo-100" },
    EXPENSE: { color: "text-red-700", bgColor: "bg-red-100" },
    TRANSFER: { color: "text-cyan-700", bgColor: "bg-cyan-100" },
    COMMISSION: { color: "text-orange-700", bgColor: "bg-orange-100" },
    ADJUSTMENT: { color: "text-muted-foreground", bgColor: "bg-muted" },
  };

const statusColors: Record<
  TransactionStatus,
  { color: string; bgColor: string }
> = {
  PENDING: { color: "text-yellow-700", bgColor: "bg-yellow-100" },
  PROCESSING: { color: "text-blue-700", bgColor: "bg-blue-100" },
  COMPLETED: { color: "text-green-700", bgColor: "bg-green-100" },
  FAILED: { color: "text-red-700", bgColor: "bg-red-100" },
  CANCELLED: { color: "text-muted-foreground", bgColor: "bg-muted" },
  REFUNDED: { color: "text-purple-700", bgColor: "bg-purple-100" },
  DISPUTED: { color: "text-orange-700", bgColor: "bg-orange-100" },
};

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const t = useTranslations("transactions");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // --- Localized config maps (derived inside component) ---

  const transactionTypeConfig = useMemo(
    () => ({
      SALE: { ...typeColors.SALE, label: t("typeSale") },
      REFUND: { ...typeColors.REFUND, label: t("typeRefund") },
      COLLECTION: { ...typeColors.COLLECTION, label: t("typeCollection") },
      ENCASHMENT: { ...typeColors.ENCASHMENT, label: t("typeEncashment") },
      EXPENSE: { ...typeColors.EXPENSE, label: t("typeExpense") },
      TRANSFER: { ...typeColors.TRANSFER, label: t("typeTransfer") },
      COMMISSION: { ...typeColors.COMMISSION, label: t("typeCommission") },
      ADJUSTMENT: { ...typeColors.ADJUSTMENT, label: t("typeAdjustment") },
    }),
    [t],
  );

  const transactionStatusConfig = useMemo(
    () => ({
      PENDING: { ...statusColors.PENDING, label: t("statusPending") },
      PROCESSING: { ...statusColors.PROCESSING, label: t("statusProcessing") },
      COMPLETED: { ...statusColors.COMPLETED, label: t("statusCompleted") },
      FAILED: { ...statusColors.FAILED, label: t("statusFailed") },
      CANCELLED: { ...statusColors.CANCELLED, label: t("statusCancelled") },
      REFUNDED: { ...statusColors.REFUNDED, label: t("statusRefunded") },
      DISPUTED: { ...statusColors.DISPUTED, label: t("statusDisputed") },
    }),
    [t],
  );

  const paymentMethodLabels = useMemo<Record<PaymentMethod, string>>(
    () => ({
      CASH: t("payCash"),
      PAYME: t("payPayme"),
      CLICK: t("payClick"),
      UZUM: t("payUzum"),
      CARD: t("payCard"),
      QR_CODE: t("payQr"),
      TELEGRAM_STARS: t("payTelegramStars"),
      MIXED: t("payMixed"),
      OTHER: t("payOther"),
    }),
    [t],
  );

  const paymentMethodOptions = useMemo(
    () => [
      { value: "ALL", label: t("allMethods") },
      { value: "CASH", label: t("payCash") },
      { value: "PAYME", label: t("payPayme") },
      { value: "CLICK", label: t("payClick") },
      { value: "UZUM", label: t("payUzum") },
      { value: "CARD", label: t("payCard") },
      { value: "QR_CODE", label: t("payQr") },
      { value: "TELEGRAM_STARS", label: t("payTelegramStars") },
      { value: "MIXED", label: t("payMixed") },
      { value: "OTHER", label: t("payOther") },
    ],
    [t],
  );

  const statusOptions = useMemo(
    () => [
      { value: "ALL", label: t("allStatuses") },
      { value: "PENDING", label: t("statusPending") },
      { value: "PROCESSING", label: t("statusProcessing") },
      { value: "COMPLETED", label: t("statusCompleted") },
      { value: "FAILED", label: t("statusFailed") },
      { value: "CANCELLED", label: t("statusCancelled") },
      { value: "REFUNDED", label: t("statusRefunded") },
      { value: "DISPUTED", label: t("statusDisputed") },
    ],
    [t],
  );

  const queryParams = {
    search: debouncedSearch || undefined,
    payment_method: paymentMethod !== "ALL" ? paymentMethod : undefined,
    status: status !== "ALL" ? status : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page,
    limit: PAGE_SIZE,
  };

  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["transactions", queryParams],
    queryFn: () =>
      transactionsApi
        .getAll(queryParams)
        .then((res) => res.data as TransactionsResponse),
  });

  const transactions = response?.data || [];
  const meta = response?.meta || {
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
  };
  const stats = response?.stats || {
    total_revenue: 0,
    today_count: 0,
    average_check: 0,
    collections_count: 0,
  };

  const handleExport = () => {
    toast.info(t("exportHint"));
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{tCommon("loadError")}</p>
        <p className="text-muted-foreground mb-4">{t("loadFailed")}</p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["transactions"] })
          }
        >
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          {tCommon("export")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("totalRevenue")}
                </p>
                <p className="text-2xl font-bold">
                  {formatPrice(stats.total_revenue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("todayCount")}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.today_count}
                </p>
              </div>
              <Receipt className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("averageCheck")}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatPrice(stats.average_check)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("collections")}
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.collections_count}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
        <div className="flex gap-2 flex-wrap">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
            placeholder={tCommon("dateFrom")}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
            placeholder={tCommon("dateTo")}
          />
          <Select
            value={paymentMethod}
            onValueChange={(value) => {
              setPaymentMethod(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("paymentMethodPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {paymentMethodOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder={tCommon("status")} />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dateTime")}</TableHead>
                  <TableHead>{t("number")}</TableHead>
                  <TableHead>{t("type")}</TableHead>
                  <TableHead>{t("machine")}</TableHead>
                  <TableHead className="text-right">{t("amount")}</TableHead>
                  <TableHead>{t("paymentMethod")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-right">
                    {tCommon("actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-8 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ArrowDownUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t("notFound")}</p>
            <p className="text-muted-foreground">{t("changeFilters")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dateTime")}</TableHead>
                  <TableHead>{t("number")}</TableHead>
                  <TableHead>{t("type")}</TableHead>
                  <TableHead>{t("machine")}</TableHead>
                  <TableHead className="text-right">{t("amount")}</TableHead>
                  <TableHead>{t("paymentMethod")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-right">
                    {tCommon("actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const typeConf =
                    transactionTypeConfig[tx.type] ||
                    transactionTypeConfig.SALE;
                  const statusConf =
                    transactionStatusConfig[tx.status] ||
                    transactionStatusConfig.PENDING;

                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(tx.created_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-sm">
                        {tx.transaction_number}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ${typeConf.bgColor} ${typeConf.color}`}
                        >
                          {typeConf.label}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {tx.machine_name || tx.machine_number || "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm font-medium text-right">
                        {tx.type === "REFUND" || tx.type === "EXPENSE"
                          ? `- ${formatPrice(tx.amount)}`
                          : formatPrice(tx.amount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {paymentMethodLabels[tx.payment_method] ||
                          tx.payment_method}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${statusConf.bgColor} ${statusConf.color} border-0`}
                        >
                          {statusConf.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={tCommon("actions")}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/dashboard/transactions/${tx.id}`}>
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                {tCommon("view")}
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/dashboard/transactions/${tx.id}`}>
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                {tCommon("details")}
                              </DropdownMenuItem>
                            </Link>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              {t("showingRange", {
                from: (meta.page - 1) * meta.limit + 1,
                to: Math.min(meta.page * meta.limit, meta.total),
                total: meta.total,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {tCommon("back")}
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {meta.page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {tCommon("forward")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
