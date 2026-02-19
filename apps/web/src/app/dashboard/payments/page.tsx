"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  CreditCard,
  MoreVertical,
  Eye,
  DollarSign,
  TrendingUp,
  Receipt,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  Wallet,
  Zap,
  Star,
  ChevronDown,
  ChevronUp,
  AlertCircle,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { paymentsApi } from "@/lib/api";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

// --- Types ---

interface PaymentTransaction {
  id: string;
  transaction_id: string;
  provider: PaymentProvider;
  amount: number;
  status: PaymentStatus;
  order_id?: string;
  customer_id?: string;
  error_message?: string;
  provider_transaction_id?: string;
  request_payload?: Record<string, unknown>;
  response_payload?: Record<string, unknown>;
  refund_amount?: number;
  refund_reason?: string;
  created_at: string;
  updated_at: string;
}

interface TransactionsResponse {
  data: PaymentTransaction[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface TransactionStats {
  total_revenue: number;
  transactions_today: number;
  refund_rate: number;
  average_amount: number;
  by_provider: Record<string, { count: number; revenue: number }>;
}

type PaymentProvider = "PAYME" | "CLICK" | "UZUM" | "TELEGRAM_STARS";
type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

// --- Config Maps ---

const providerConfig: Record<
  PaymentProvider,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    iconColor: string;
  }
> = {
  PAYME: {
    label: "Payme",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-500",
  },
  CLICK: {
    label: "Click",
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    iconColor: "text-green-500",
  },
  UZUM: {
    label: "Uzum Bank",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    iconColor: "text-amber-500",
  },
  TELEGRAM_STARS: {
    label: "Telegram Stars",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    iconColor: "text-purple-500",
  },
};

const statusStyleConfig: Record<
  PaymentStatus,
  { color: string; bgColor: string }
> = {
  PENDING: {
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  PROCESSING: {
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  COMPLETED: {
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  FAILED: { color: "text-red-700", bgColor: "bg-red-100" },
  CANCELLED: {
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  REFUNDED: {
    color: "text-violet-700",
    bgColor: "bg-violet-100",
  },
};

const statusKeys: Record<PaymentStatus, string> = {
  PENDING: "statusPending",
  PROCESSING: "statusProcessing",
  COMPLETED: "statusCompleted",
  FAILED: "statusFailed",
  CANCELLED: "statusCancelled",
  REFUNDED: "statusRefunded",
};

const providerOptionValues: {
  value: string;
  labelKey?: string;
  label?: string;
}[] = [
  { value: "ALL", labelKey: "allProviders" },
  { value: "PAYME", label: "Payme" },
  { value: "CLICK", label: "Click" },
  { value: "UZUM", label: "Uzum Bank" },
  { value: "TELEGRAM_STARS", label: "Telegram Stars" },
];

const statusOptionValues: { value: string; labelKey: string }[] = [
  { value: "ALL", labelKey: "allStatuses" },
  { value: "PENDING", labelKey: "statusPending" },
  { value: "PROCESSING", labelKey: "statusProcessing" },
  { value: "COMPLETED", labelKey: "statusCompleted" },
  { value: "FAILED", labelKey: "statusFailed" },
  { value: "CANCELLED", labelKey: "statusCancelled" },
  { value: "REFUNDED", labelKey: "statusRefunded" },
];

const refundReasonKeys: { value: string; labelKey: string }[] = [
  { value: "CUSTOMER_REQUEST", labelKey: "refundReasonCustomerRequest" },
  {
    value: "PRODUCT_NOT_DISPENSED",
    labelKey: "refundReasonProductNotDispensed",
  },
  { value: "WRONG_AMOUNT", labelKey: "refundReasonWrongAmount" },
  { value: "DUPLICATE_CHARGE", labelKey: "refundReasonDuplicateCharge" },
  { value: "TECHNICAL_ERROR", labelKey: "refundReasonTechnicalError" },
  { value: "OTHER", labelKey: "refundReasonOther" },
];

const PAGE_SIZE = 20;

export default function PaymentsPage() {
  const t = useTranslations("payments");
  const [provider, setProvider] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] =
    useState<PaymentTransaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const [showResponse, setShowResponse] = useState(false);

  const queryClient = useQueryClient();

  // --- Queries ---

  const queryParams = {
    provider: provider !== "ALL" ? provider : undefined,
    status: status !== "ALL" ? status : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page,
    limit: PAGE_SIZE,
  };

  const { data: response, isLoading } = useQuery({
    queryKey: ["payment-transactions", queryParams],
    queryFn: () =>
      paymentsApi
        .getTransactions(queryParams)
        .then((res) => res.data as TransactionsResponse),
  });

  const { data: stats } = useQuery({
    queryKey: ["payment-stats"],
    queryFn: () =>
      paymentsApi
        .getTransactionStats()
        .then((res) => res.data as TransactionStats),
  });

  const transactions = response?.data || [];
  const meta = response?.meta || {
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
  };
  const txStats = stats || {
    total_revenue: 0,
    transactions_today: 0,
    refund_rate: 0,
    average_amount: 0,
    by_provider: {},
  };

  // --- Mutations ---

  const refundMutation = useMutation({
    mutationFn: (data: {
      transaction_id: string;
      amount: number;
      reason: string;
    }) => paymentsApi.initiateRefund(data),
    onSuccess: () => {
      toast.success(t("refundSuccess"));
      setRefundOpen(false);
      setSelectedTransaction(null);
      setDetailOpen(false);
      setRefundReason("");
      setRefundAmount("");
      queryClient.invalidateQueries({ queryKey: ["payment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
    },
    onError: () => {
      toast.error(t("refundError"));
    },
  });

  // --- Handlers ---

  const handleViewTransaction = (tx: PaymentTransaction) => {
    setSelectedTransaction(tx);
    setShowRequest(false);
    setShowResponse(false);
    setDetailOpen(true);
  };

  const handleOpenRefund = () => {
    if (selectedTransaction) {
      setRefundAmount(String(selectedTransaction.amount));
      setRefundReason("");
      setRefundOpen(true);
    }
  };

  const handleSubmitRefund = () => {
    if (!selectedTransaction || !refundReason || !refundAmount) {
      toast.error(t("refundFillAll"));
      return;
    }
    refundMutation.mutate({
      transaction_id: selectedTransaction.id,
      amount: Number(refundAmount),
      reason: refundReason,
    });
  };

  // --- Provider icon ---

  const getProviderIcon = (prov: PaymentProvider) => {
    switch (prov) {
      case "PAYME":
        return <CreditCard className="h-5 w-5 text-blue-500" />;
      case "CLICK":
        return <Zap className="h-5 w-5 text-green-500" />;
      case "UZUM":
        return <Wallet className="h-5 w-5 text-amber-500" />;
      case "TELEGRAM_STARS":
        return <Star className="h-5 w-5 text-purple-500" />;
      default:
        return <CreditCard className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          {t("export")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsTotalRevenue")}
                </p>
                <p className="text-2xl font-bold">
                  {formatPrice(txStats.total_revenue)}
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
                  {t("statsTransactionsToday")}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {txStats.transactions_today}
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
                  {t("statsRefundRate")}
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {txStats.refund_rate.toFixed(1)}%
                </p>
              </div>
              <RotateCcw className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsAverageAmount")}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatPrice(txStats.average_amount)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {(Object.keys(providerConfig) as PaymentProvider[]).map((prov) => {
          const cfg = providerConfig[prov];
          const provStats = txStats.by_provider[prov] || {
            count: 0,
            revenue: 0,
          };
          return (
            <Card key={prov} className={`border ${cfg.borderColor}`}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  {getProviderIcon(prov)}
                  <div className="flex-1">
                    <h3 className="font-medium">{cfg.label}</h3>
                  </div>
                  <Badge className={`${cfg.bgColor} ${cfg.color} border-0`}>
                    {t("providerActive")}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">
                      {t("providerTransactions")}
                    </p>
                    <p className="font-medium">{provStats.count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      {t("providerRevenue")}
                    </p>
                    <p className="font-medium">
                      {formatPrice(provStats.revenue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
            placeholder={t("filterDateFrom")}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
            placeholder={t("filterDateTo")}
          />
          <Select
            value={provider}
            onValueChange={(value) => {
              setProvider(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("filterProvider")} />
            </SelectTrigger>
            <SelectContent>
              {providerOptionValues.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.labelKey
                    ? t(opt.labelKey as Parameters<typeof t>[0])
                    : opt.label}
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
              <SelectValue placeholder={t("filterStatus")} />
            </SelectTrigger>
            <SelectContent>
              {statusOptionValues.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey as Parameters<typeof t>[0])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transactions Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colDate")}</TableHead>
                  <TableHead>{t("colId")}</TableHead>
                  <TableHead>{t("colProvider")}</TableHead>
                  <TableHead className="text-right">{t("colAmount")}</TableHead>
                  <TableHead>{t("colStatus")}</TableHead>
                  <TableHead className="text-right">
                    {t("colActions")}
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
                      <Skeleton className="h-5 w-24 ml-auto" />
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
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t("notFound")}</p>
            <p className="text-muted-foreground">{t("notFoundHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colIdProvider")}</TableHead>
                  <TableHead className="text-right">{t("colAmount")}</TableHead>
                  <TableHead>{t("colStatus")}</TableHead>
                  <TableHead>{t("colOrder")}</TableHead>
                  <TableHead>{t("colDate")}</TableHead>
                  <TableHead className="text-right">
                    {t("colActions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const stCfg =
                    statusStyleConfig[tx.status] || statusStyleConfig.PENDING;
                  const provCfg =
                    providerConfig[tx.provider] || providerConfig.PAYME;

                  return (
                    <TableRow
                      key={tx.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewTransaction(tx)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-muted-foreground">
                            {tx.id.substring(0, 8)}...
                          </span>
                          <Badge
                            className={`${provCfg.bgColor} ${provCfg.color} border-0 text-xs`}
                          >
                            {provCfg.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {formatPrice(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${stCfg.bgColor} ${stCfg.color} border-0`}
                        >
                          {t(statusKeys[tx.status] as Parameters<typeof t>[0])}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {tx.order_id
                          ? tx.order_id.substring(0, 8) + "..."
                          : "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(tx.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical
                                className="h-4 w-4"
                                aria-label={t("actionsLabel")}
                              />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewTransaction(tx);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {t("actionView")}
                            </DropdownMenuItem>
                            {tx.status === "COMPLETED" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTransaction(tx);
                                  setRefundAmount(String(tx.amount));
                                  setRefundReason("");
                                  setRefundOpen(true);
                                }}
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                {t("actionRefund")}
                              </DropdownMenuItem>
                            )}
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
              {t("paginationShowing")} {(meta.page - 1) * meta.limit + 1} -{" "}
              {Math.min(meta.page * meta.limit, meta.total)} {t("paginationOf")}{" "}
              {meta.total} {t("paginationTransactions")}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t("paginationBack")}
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
                {t("paginationForward")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Transaction Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("detailTitle")}</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6">
              {/* Main Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("detailTransactionId")}
                  </p>
                  <p className="font-mono text-sm">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("detailProvider")}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {getProviderIcon(selectedTransaction.provider)}
                    <span className="font-medium">
                      {providerConfig[selectedTransaction.provider]?.label ||
                        selectedTransaction.provider}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("detailAmount")}
                  </p>
                  <p className="text-lg font-bold">
                    {formatPrice(selectedTransaction.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("detailStatus")}
                  </p>
                  <Badge
                    className={`mt-1 ${statusStyleConfig[selectedTransaction.status]?.bgColor} ${statusStyleConfig[selectedTransaction.status]?.color} border-0`}
                  >
                    {t(
                      statusKeys[selectedTransaction.status] as Parameters<
                        typeof t
                      >[0],
                    )}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("detailOrderId")}
                  </p>
                  <p className="font-mono text-sm">
                    {selectedTransaction.order_id || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("detailProviderTxId")}
                  </p>
                  <p className="font-mono text-sm">
                    {selectedTransaction.provider_transaction_id || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("detailCreated")}
                  </p>
                  <p className="text-sm">
                    {formatDateTime(selectedTransaction.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("detailUpdated")}
                  </p>
                  <p className="text-sm">
                    {formatDateTime(selectedTransaction.updated_at)}
                  </p>
                </div>
              </div>

              {/* Error message */}
              {selectedTransaction.error_message && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <p className="text-sm font-medium text-red-700">
                      {t("detailError")}
                    </p>
                  </div>
                  <p className="text-sm text-red-600">
                    {selectedTransaction.error_message}
                  </p>
                </div>
              )}

              {/* Refund info */}
              {selectedTransaction.status === "REFUNDED" &&
                selectedTransaction.refund_amount && (
                  <div className="p-3 rounded-lg bg-violet-50 border border-violet-200">
                    <div className="flex items-center gap-2 mb-1">
                      <RotateCcw className="h-4 w-4 text-violet-600" />
                      <p className="text-sm font-medium text-violet-700">
                        {t("detailRefund")}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          {t("detailRefundAmount")}:{" "}
                        </span>
                        <span className="font-medium">
                          {formatPrice(selectedTransaction.refund_amount)}
                        </span>
                      </div>
                      {selectedTransaction.refund_reason && (
                        <div>
                          <span className="text-muted-foreground">
                            {t("detailRefundReason")}:{" "}
                          </span>
                          <span className="font-medium">
                            {selectedTransaction.refund_reason}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Request Payload */}
              <div className="border rounded-lg">
                <button
                  className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors"
                  onClick={() => setShowRequest(!showRequest)}
                >
                  <span className="text-sm font-medium">
                    {t("detailRequest")}
                  </span>
                  {showRequest ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {showRequest && (
                  <div className="p-3 border-t bg-muted/30">
                    <pre className="text-xs overflow-auto max-h-48 whitespace-pre-wrap font-mono">
                      {selectedTransaction.request_payload
                        ? JSON.stringify(
                            selectedTransaction.request_payload,
                            null,
                            2,
                          )
                        : t("detailNoData")}
                    </pre>
                  </div>
                )}
              </div>

              {/* Response Payload */}
              <div className="border rounded-lg">
                <button
                  className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors"
                  onClick={() => setShowResponse(!showResponse)}
                >
                  <span className="text-sm font-medium">
                    {t("detailResponse")}
                  </span>
                  {showResponse ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {showResponse && (
                  <div className="p-3 border-t bg-muted/30">
                    <pre className="text-xs overflow-auto max-h-48 whitespace-pre-wrap font-mono">
                      {selectedTransaction.response_payload
                        ? JSON.stringify(
                            selectedTransaction.response_payload,
                            null,
                            2,
                          )
                        : t("detailNoData")}
                    </pre>
                  </div>
                )}
              </div>

              {/* Refund Button */}
              {selectedTransaction.status === "COMPLETED" && (
                <div className="flex justify-end">
                  <Button variant="outline" onClick={handleOpenRefund}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t("detailInitiateRefund")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("refundTitle")}</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">
                    {t("refundTransaction")}
                  </span>
                  <span className="font-mono">
                    {selectedTransaction.id.substring(0, 12)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("refundTxAmount")}
                  </span>
                  <span className="font-medium">
                    {formatPrice(selectedTransaction.amount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  {t("refundReasonLabel")}
                </label>
                <Select value={refundReason} onValueChange={setRefundReason}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("refundReasonPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {refundReasonKeys.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {t(r.labelKey as Parameters<typeof t>[0])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  {t("refundAmountLabel")}
                </label>
                <Input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  max={selectedTransaction.amount}
                  min={1}
                  placeholder={t("refundAmountPlaceholder")}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("refundMax")} {formatPrice(selectedTransaction.amount)}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRefundOpen(false)}>
                  {t("refundCancel")}
                </Button>
                <Button
                  onClick={handleSubmitRefund}
                  disabled={
                    !refundReason || !refundAmount || refundMutation.isPending
                  }
                >
                  {refundMutation.isPending
                    ? t("refundProcessing")
                    : t("refundConfirm")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
