"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  BanknoteIcon,
  CreditCard,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Controller } from "react-hook-form";
import {
  usePayoutRequests,
  useCreatePayoutRequest,
  useReviewPayoutRequest,
  useCancelPayoutRequest,
  type PayoutRequestItem,
} from "@/lib/hooks/use-finance";

// ─── Schemas ────────────────────────────────────────────────────────────────

const PAYOUT_METHODS = ["bank_transfer", "card", "cash"] as const;

const createPayoutSchema = z.object({
  amount: z.coerce.number().min(1),
  payoutMethod: z.enum(PAYOUT_METHODS).default("bank_transfer"),
  reason: z.string().max(1000).optional().default(""),
  payoutDestination: z.string().max(255).optional().default(""),
});
type CreatePayoutValues = z.infer<typeof createPayoutSchema>;

const rejectSchema = z.object({
  comment: z.string().min(1).max(1000),
});
type RejectValues = z.infer<typeof rejectSchema>;

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { i18nKey: string; variant: string; icon: React.ElementType }
> = {
  pending: {
    i18nKey: "statusPending",
    variant: "bg-yellow-500/10 text-yellow-600",
    icon: Clock,
  },
  approved: {
    i18nKey: "statusApproved",
    variant: "bg-blue-500/10 text-blue-600",
    icon: CheckCircle2,
  },
  processing: {
    i18nKey: "statusProcessing",
    variant: "bg-indigo-500/10 text-indigo-600",
    icon: Loader2,
  },
  completed: {
    i18nKey: "statusCompleted",
    variant: "bg-green-500/10 text-green-600",
    icon: CheckCircle2,
  },
  rejected: {
    i18nKey: "statusRejected",
    variant: "bg-red-500/10 text-red-600",
    icon: XCircle,
  },
  cancelled: {
    i18nKey: "statusCancelled",
    variant: "bg-gray-500/10 text-gray-500",
    icon: XCircle,
  },
  failed: {
    i18nKey: "statusFailed",
    variant: "bg-red-500/10 text-red-600",
    icon: AlertCircle,
  },
};

const METHOD_I18N: Record<string, string> = {
  bank_transfer: "methodBankTransfer",
  card: "methodCard",
  cash: "methodCash",
};
const METHOD_ICONS: Record<string, React.ElementType> = {
  bank_transfer: BanknoteIcon,
  card: CreditCard,
  cash: Wallet,
};

function formatUZS(amount: number) {
  return new Intl.NumberFormat("ru-RU").format(amount) + " UZS";
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({
  status,
  t,
}: {
  status: string;
  t: (key: string) => string;
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <Badge className={`${config.variant} gap-1`}>
      <Icon className="w-3 h-3" />
      {t(config.i18nKey)}
    </Badge>
  );
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const axiosErr = error as {
      response?: { data?: { message?: string | string[] } };
      message?: string;
    };
    const msg = axiosErr.response?.data?.message;
    if (Array.isArray(msg)) return msg.join("; ");
    if (typeof msg === "string") return msg;
    if (typeof axiosErr.message === "string") return axiosErr.message;
  }
  return fallback;
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function PayoutRequestsPage() {
  const t = useTranslations("payoutRequests");
  const tCommon = useTranslations("common");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<PayoutRequestItem | null>(
    null,
  );
  const [rejectTarget, setRejectTarget] = useState<PayoutRequestItem | null>(
    null,
  );

  const { data, isLoading } = usePayoutRequests({
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    limit: 20,
  });

  const cancelMutation = useCancelPayoutRequest();
  const reviewMutation = useReviewPayoutRequest();

  const handleApprove = (item: PayoutRequestItem) => {
    reviewMutation.mutate(
      { id: item.id, action: "approve" },
      {
        onSuccess: () => {
          toast.success(t("requestApproved"));
          setReviewTarget(null);
        },
        onError: (err) =>
          toast.error(extractErrorMessage(err, t("approveError"))),
      },
    );
  };

  const handleCancel = (item: PayoutRequestItem) => {
    cancelMutation.mutate(item.id, {
      onSuccess: () => toast.success(t("requestCancelled")),
      onError: (err) => toast.error(extractErrorMessage(err, t("cancelError"))),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">
            Управление запросами на вывод средств
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t("newRequest")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "all", label: t("filterAll") },
          { value: "pending", label: t("filterPending") },
          { value: "approved", label: t("filterApproved") },
          { value: "processing", label: t("filterProcessing") },
          { value: "completed", label: t("filterCompleted") },
          { value: "rejected", label: t("filterRejected") },
        ].map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(f.value);
              setPage(1);
            }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colDate")}</TableHead>
              <TableHead>{t("colAmount")}</TableHead>
              <TableHead>{t("colMethod")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead>{t("colReason")}</TableHead>
              <TableHead className="text-right">{t("colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.data?.length ? (
              data.data.map((item) => {
                const methodKey =
                  METHOD_I18N[item.payoutMethod] || METHOD_I18N.bank_transfer;
                const MethodIcon =
                  METHOD_ICONS[item.payoutMethod] || METHOD_ICONS.bank_transfer;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatUZS(item.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <MethodIcon className="w-4 h-4 text-muted-foreground" />
                        {t(methodKey)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} t={t} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {item.reason || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {item.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => setReviewTarget(item)}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              {t("approve")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => setRejectTarget(item)}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              {t("reject")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancel(item)}
                              disabled={cancelMutation.isPending}
                            >
                              {t("cancel")}
                            </Button>
                          </>
                        )}
                        {item.status === "completed" &&
                          item.transactionReference && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {item.transactionReference}
                            </span>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <ArrowUpRight className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">{t("noRequests")}</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("pageOf", {
              page: data.meta.page,
              totalPages: data.meta.totalPages,
              total: data.meta.total,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {tCommon("back")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {tCommon("next")}
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("newRequestTitle")}</DialogTitle>
          </DialogHeader>
          <CreatePayoutForm
            t={t}
            onSuccess={() => {
              setCreateOpen(false);
              toast.success(t("requestCreated"));
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation */}
      <Dialog open={!!reviewTarget} onOpenChange={() => setReviewTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("confirmApproval")}</DialogTitle>
          </DialogHeader>
          {reviewTarget && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("confirmApprovalText", {
                  amount: formatUZS(reviewTarget.amount),
                })}
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReviewTarget(null)}>
                  {tCommon("cancel")}
                </Button>
                <Button
                  onClick={() => handleApprove(reviewTarget)}
                  disabled={reviewMutation.isPending}
                >
                  {reviewMutation.isPending ? t("approving") : t("approve")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("rejectRequest")}</DialogTitle>
          </DialogHeader>
          {rejectTarget && (
            <RejectForm
              t={t}
              item={rejectTarget}
              onSuccess={() => {
                setRejectTarget(null);
                toast.success(t("requestRejected"));
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Create Form ────────────────────────────────────────────────────────────

function CreatePayoutForm({
  onSuccess,
  t,
}: {
  onSuccess: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const createMutation = useCreatePayoutRequest();
  const form = useForm<CreatePayoutValues>({
    resolver: zodResolver(createPayoutSchema),
    defaultValues: {
      amount: 0,
      payoutMethod: "bank_transfer",
      reason: "",
      payoutDestination: "",
    },
  });

  const handleSave = form.handleSubmit((values) => {
    createMutation.mutate(values, {
      onSuccess,
      onError: (err) => toast.error(extractErrorMessage(err, t("createError"))),
    });
  });

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t("amountLabel")}</Label>
        <Input type="number" min={1} {...form.register("amount")} />
        {form.formState.errors.amount && (
          <p className="text-xs text-destructive">
            {form.formState.errors.amount.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>{t("payoutMethodLabel")}</Label>
        <Controller
          name="payoutMethod"
          control={form.control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">
                  {t("methodBankTransfer")}
                </SelectItem>
                <SelectItem value="card">{t("methodCard")}</SelectItem>
                <SelectItem value="cash">{t("methodCash")}</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t("destinationLabel")}</Label>
        <Input
          {...form.register("payoutDestination")}
          placeholder="HUMO **** 1234"
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t("colReason")}</Label>
        <Textarea
          {...form.register("reason")}
          placeholder={t("reasonPlaceholder")}
          className="h-20 resize-none"
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? t("creating") : t("createRequest")}
        </Button>
      </div>
    </form>
  );
}

// ─── Reject Form ────────────────────────────────────────────────────────────

function RejectForm({
  item,
  onSuccess,
  t,
}: {
  item: PayoutRequestItem;
  onSuccess: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const reviewMutation = useReviewPayoutRequest();
  const form = useForm<RejectValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { comment: "" },
  });

  const handleReject = form.handleSubmit((values) => {
    reviewMutation.mutate(
      { id: item.id, action: "reject", comment: values.comment },
      {
        onSuccess,
        onError: (err) =>
          toast.error(extractErrorMessage(err, t("rejectError"))),
      },
    );
  });

  return (
    <form onSubmit={handleReject} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("rejectPaymentText", { amount: formatUZS(item.amount) })}
      </p>
      <div className="space-y-1.5">
        <Label>{t("rejectReasonLabel")}</Label>
        <Textarea
          {...form.register("comment")}
          placeholder={t("rejectReasonPlaceholder")}
          className="h-20 resize-none"
        />
        {form.formState.errors.comment && (
          <p className="text-xs text-destructive">
            {form.formState.errors.comment.message}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button
          type="submit"
          variant="destructive"
          disabled={reviewMutation.isPending}
        >
          {reviewMutation.isPending ? t("rejecting") : t("reject")}
        </Button>
      </DialogFooter>
    </form>
  );
}
