"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  ClipboardCheck,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  CalendarDays,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Trash2,
  FileCheck,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────

interface ReconciliationRun {
  id: string;
  date_from: string;
  date_to: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  match_rate: number;
  matched_count: number;
  mismatch_count: number;
  missing_count: number;
  sources: string[];
  created_at: string;
}

interface Mismatch {
  id: string;
  order_number: string;
  machine_code: string;
  mismatch_type: MismatchType;
  hw_amount: number | null;
  sw_amount: number | null;
  discrepancy: number | null;
  status: "unresolved" | "resolved";
  resolution_notes: string | null;
}

type MismatchType =
  | "AMOUNT_MISMATCH"
  | "MISSING_IN_HW"
  | "MISSING_IN_SW"
  | "DUPLICATE"
  | "TIME_MISMATCH"
  | "STATUS_MISMATCH";

interface CreateRunPayload {
  date_from: string;
  date_to: string;
  machine_ids?: string[];
  time_tolerance_minutes: number;
  amount_tolerance_percent: number;
  sources: string[];
}

// ─── Constants ────────────────────────────────────────────────────────

const runStatusVariants: Record<
  ReconciliationRun["status"],
  "warning" | "info" | "success" | "destructive"
> = {
  PENDING: "warning",
  PROCESSING: "info",
  COMPLETED: "success",
  FAILED: "destructive",
};

const mismatchTypeVariants: Record<
  MismatchType,
  "warning" | "info" | "destructive" | "secondary" | "default"
> = {
  AMOUNT_MISMATCH: "warning",
  MISSING_IN_HW: "destructive",
  MISSING_IN_SW: "destructive",
  DUPLICATE: "info",
  TIME_MISMATCH: "secondary",
  STATUS_MISMATCH: "default",
};

const ALL_SOURCES = ["SOFTWARE", "HARDWARE", "PAYMENT_PROVIDER"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────

const formatUZS = (
  amount: number | null | undefined,
  currencyLabel: string,
): string => {
  if (amount == null) return "\u2014";
  return new Intl.NumberFormat("uz-UZ").format(amount) + " " + currencyLabel;
};

const formatDateShort = (iso: string): string => {
  return formatDate(iso, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (iso: string): string => {
  return formatDate(iso, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const shortId = (id: string): string => id.slice(0, 8);

// ─── Page Component ───────────────────────────────────────────────────

export default function ReconciliationPage() {
  const t = useTranslations("reconciliation");
  const queryClient = useQueryClient();

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    action: () => void;
  } | null>(null);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  // Form state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [machineIdsInput, setMachineIdsInput] = useState("");
  const [timeTolerance, setTimeTolerance] = useState(5);
  const [amountTolerance, setAmountTolerance] = useState(1);
  const [selectedSources, setSelectedSources] = useState<string[]>([
    "SOFTWARE",
    "HARDWARE",
    "PAYMENT_PROVIDER",
  ]);

  // ─── Queries ──────────────────────────────────────────────────────

  const {
    data: runsData,
    isLoading: runsLoading,
    isError: _runsError,
  } = useQuery({
    queryKey: ["reconciliation-runs"],
    queryFn: () => api.get("/reconciliation/runs").then((res) => res.data),
  });

  const runs: ReconciliationRun[] = runsData?.data ?? runsData ?? [];

  const { data: mismatchesData, isLoading: mismatchesLoading } = useQuery({
    queryKey: ["reconciliation-mismatches", expandedRunId],
    queryFn: () =>
      api
        .get(`/reconciliation/runs/${expandedRunId}/mismatches`)
        .then((res) => res.data),
    enabled: !!expandedRunId,
  });

  const mismatches: Mismatch[] = mismatchesData?.data ?? mismatchesData ?? [];

  // ─── Mutations ────────────────────────────────────────────────────

  const createRunMutation = useMutation({
    mutationFn: (payload: CreateRunPayload) =>
      api.post("/reconciliation/runs", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation-runs"] });
      setShowForm(false);
      setDateFrom("");
      setDateTo("");
      setMachineIdsInput("");
      setTimeTolerance(5);
      setAmountTolerance(1);
      setSelectedSources(["SOFTWARE", "HARDWARE", "PAYMENT_PROVIDER"]);
    },
  });

  const resolveMatchMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      api.patch(`/reconciliation/mismatches/${id}/resolve`, {
        resolution_notes: notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["reconciliation-mismatches", expandedRunId],
      });
      queryClient.invalidateQueries({ queryKey: ["reconciliation-runs"] });
      setResolvingId(null);
      setResolutionNotes("");
    },
  });

  const deleteRunMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/reconciliation/runs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation-runs"] });
      if (expandedRunId) setExpandedRunId(null);
    },
  });

  // ─── Computed stats ───────────────────────────────────────────────

  const stats = {
    totalRuns: runs.length,
    lastRunDate:
      runs.length > 0
        ? formatDateTime(
            [...runs].sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )[0].created_at,
          )
        : "\u2014",
    averageMatchRate:
      runs.length > 0
        ? (
            runs.reduce((sum, r) => sum + (r.match_rate ?? 0), 0) / runs.length
          ).toFixed(1)
        : "0",
    totalMismatches: runs.reduce((sum, r) => sum + (r.mismatch_count ?? 0), 0),
  };

  // ─── Handlers ─────────────────────────────────────────────────────

  const handleCreateRun = () => {
    if (!dateFrom || !dateTo) return;

    const machineIds = machineIdsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    createRunMutation.mutate({
      date_from: dateFrom,
      date_to: dateTo,
      ...(machineIds.length > 0 && { machine_ids: machineIds }),
      time_tolerance_minutes: timeTolerance,
      amount_tolerance_percent: amountTolerance,
      sources: selectedSources,
    });
  };

  const toggleSource = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source],
    );
  };

  const toggleExpand = (runId: string) => {
    setExpandedRunId((prev) => (prev === runId ? null : runId));
    setResolvingId(null);
    setResolutionNotes("");
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setShowForm((prev) => !prev)}>
          {showForm ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              {t("hide")}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              {t("newRun")}
            </>
          )}
        </Button>
      </div>

      {/* ─── New Reconciliation Form ─────────────────────────────── */}
      {showForm && (
        <Card>
          <CardContent className="pt-6 space-y-5">
            <h2 className="text-lg font-semibold">{t("formTitle")}</h2>

            {/* Date range */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">{t("dateStart")}</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">{t("dateEnd")}</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            {/* Machine IDs */}
            <div className="space-y-2">
              <Label htmlFor="machineIds">{t("machineIdsLabel")}</Label>
              <Input
                id="machineIds"
                placeholder="e.g. VM-001, VM-002"
                value={machineIdsInput}
                onChange={(e) => setMachineIdsInput(e.target.value)}
              />
            </div>

            {/* Tolerance settings */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timeTolerance">{t("timeToleranceLabel")}</Label>
                <Input
                  id="timeTolerance"
                  type="number"
                  min={0}
                  value={timeTolerance}
                  onChange={(e) => setTimeTolerance(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amountTolerance">
                  {t("amountToleranceLabel")}
                </Label>
                <Input
                  id="amountTolerance"
                  type="number"
                  min={0}
                  step={0.1}
                  value={amountTolerance}
                  onChange={(e) => setAmountTolerance(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Sources */}
            <div className="space-y-2">
              <Label>{t("dataSources")}</Label>
              <div className="flex flex-wrap gap-3">
                {ALL_SOURCES.map((source) => (
                  <label
                    key={source}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSources.includes(source)}
                      onChange={() => toggleSource(source)}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="text-sm">{t(`source_${source}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <Button
                onClick={handleCreateRun}
                disabled={
                  !dateFrom ||
                  !dateTo ||
                  selectedSources.length === 0 ||
                  createRunMutation.isPending
                }
              >
                {createRunMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("starting")}
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    {t("start")}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Stats Cards ─────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsTotalRuns")}
                </p>
                <p className="text-2xl font-bold">{stats.totalRuns}</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsLastRun")}
                </p>
                <p className="text-lg font-bold">{stats.lastRunDate}</p>
              </div>
              <CalendarDays className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsAvgMatchRate")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.averageMatchRate}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsTotalMismatches")}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.totalMismatches}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Runs List ───────────────────────────────────────────── */}
      {runsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-16 w-full" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t("noRuns")}</p>
            <p className="text-muted-foreground mb-4">{t("noRunsHint")}</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("newRun")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colId")}</TableHead>
                  <TableHead>{t("colPeriod")}</TableHead>
                  <TableHead>{t("colStatus")}</TableHead>
                  <TableHead>{t("colMatchRate")}</TableHead>
                  <TableHead>{t("colMatched")}</TableHead>
                  <TableHead>{t("colMismatches")}</TableHead>
                  <TableHead>{t("colMissing")}</TableHead>
                  <TableHead>{t("colCreated")}</TableHead>
                  <TableHead className="text-right">
                    {t("colActions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => {
                  const variant = runStatusVariants[run.status];
                  const isExpanded = expandedRunId === run.id;

                  return (
                    <TableRow key={run.id}>
                      <TableCell colSpan={9} className="p-0">
                        {/* Main row content */}
                        <div
                          className="grid items-center cursor-pointer hover:bg-muted/50 transition-colors px-4 py-3"
                          style={{
                            gridTemplateColumns:
                              "80px 1fr 110px 100px 80px 100px 80px 130px 100px",
                          }}
                          onClick={() => toggleExpand(run.id)}
                        >
                          <span className="text-sm font-mono text-muted-foreground">
                            {shortId(run.id)}
                          </span>
                          <span className="text-sm">
                            {formatDateShort(run.date_from)} &mdash;{" "}
                            {formatDateShort(run.date_to)}
                          </span>
                          <span>
                            <Badge variant={variant}>
                              {t(`runStatus_${run.status}`)}
                            </Badge>
                          </span>
                          <span className="text-sm font-medium">
                            {run.match_rate != null
                              ? `${run.match_rate.toFixed(1)}%`
                              : "\u2014"}
                          </span>
                          <span className="text-sm text-green-600">
                            {run.matched_count ?? 0}
                          </span>
                          <span className="text-sm text-red-600">
                            {run.mismatch_count ?? 0}
                          </span>
                          <span className="text-sm text-yellow-600">
                            {run.missing_count ?? 0}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(run.created_at)}
                          </span>
                          <span className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmState({
                                  title: t("deleteRunConfirm"),
                                  action: () =>
                                    deleteRunMutation.mutate(run.id),
                                });
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </span>
                        </div>

                        {/* Expanded mismatch details */}
                        {isExpanded && (
                          <div className="border-t bg-muted/30 px-6 py-4">
                            <h3 className="text-sm font-semibold mb-3">
                              {t("mismatchesForRun", { id: shortId(run.id) })}
                            </h3>

                            {mismatchesLoading ? (
                              <div className="flex items-center gap-2 text-muted-foreground py-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t("loadingMismatches")}
                              </div>
                            ) : mismatches.length === 0 ? (
                              <div className="flex items-center gap-2 text-muted-foreground py-4">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                {t("noMismatches")}
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>
                                        {t("colOrderNumber")}
                                      </TableHead>
                                      <TableHead>
                                        {t("colMachineCode")}
                                      </TableHead>
                                      <TableHead>{t("colType")}</TableHead>
                                      <TableHead>{t("colHwAmount")}</TableHead>
                                      <TableHead>{t("colSwAmount")}</TableHead>
                                      <TableHead>
                                        {t("colDifference")}
                                      </TableHead>
                                      <TableHead>
                                        {t("colMismatchStatus")}
                                      </TableHead>
                                      <TableHead className="text-right">
                                        {t("colAction")}
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {mismatches.map((m) => {
                                      const typeVariant =
                                        mismatchTypeVariants[m.mismatch_type];
                                      const isResolving = resolvingId === m.id;

                                      return (
                                        <TableRow key={m.id}>
                                          <TableCell className="font-mono text-sm">
                                            {m.order_number || "\u2014"}
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            {m.machine_code || "\u2014"}
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant={typeVariant}>
                                              {t(
                                                `mismatchType_${m.mismatch_type}`,
                                              )}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            {formatUZS(
                                              m.hw_amount,
                                              t("currency"),
                                            )}
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            {formatUZS(
                                              m.sw_amount,
                                              t("currency"),
                                            )}
                                          </TableCell>
                                          <TableCell className="text-sm font-medium">
                                            {m.discrepancy != null ? (
                                              <span
                                                className={
                                                  m.discrepancy > 0
                                                    ? "text-red-600"
                                                    : m.discrepancy < 0
                                                      ? "text-yellow-600"
                                                      : ""
                                                }
                                              >
                                                {formatUZS(
                                                  m.discrepancy,
                                                  t("currency"),
                                                )}
                                              </span>
                                            ) : (
                                              "\u2014"
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {m.status === "resolved" ? (
                                              <Badge variant="success">
                                                {t("statusResolved")}
                                              </Badge>
                                            ) : (
                                              <Badge variant="destructive">
                                                {t("statusUnresolved")}
                                              </Badge>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {m.status === "resolved" ? (
                                              <span className="text-xs text-muted-foreground italic">
                                                {m.resolution_notes ||
                                                  t("statusResolved")}
                                              </span>
                                            ) : isResolving ? (
                                              <div className="flex items-center gap-2 justify-end">
                                                <Input
                                                  placeholder={t(
                                                    "commentPlaceholder",
                                                  )}
                                                  className="w-48 h-8 text-sm"
                                                  value={resolutionNotes}
                                                  onChange={(e) =>
                                                    setResolutionNotes(
                                                      e.target.value,
                                                    )
                                                  }
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                />
                                                <Button
                                                  size="sm"
                                                  disabled={
                                                    resolveMatchMutation.isPending
                                                  }
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    resolveMatchMutation.mutate(
                                                      {
                                                        id: m.id,
                                                        notes: resolutionNotes,
                                                      },
                                                    );
                                                  }}
                                                >
                                                  {resolveMatchMutation.isPending ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                  ) : (
                                                    <CheckCircle className="h-3 w-3" />
                                                  )}
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setResolvingId(null);
                                                    setResolutionNotes("");
                                                  }}
                                                >
                                                  <XCircle className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            ) : (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setResolvingId(m.id);
                                                  setResolutionNotes("");
                                                }}
                                              >
                                                {t("resolve")}
                                              </Button>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
        title={confirmState?.title ?? ""}
        onConfirm={() => confirmState?.action()}
      />
    </div>
  );
}
