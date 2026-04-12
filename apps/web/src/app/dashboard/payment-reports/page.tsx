"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Archive,
  History,
  RefreshCw,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  GitCompare,
  X,
  AlertCircle,
  Loader2,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ReportType,
  ReportUpload,
  PaginatedRows,
  RowFilters,
  ReconcileResult,
  REPORT_TYPE_CONFIG,
  UPLOAD_STATUS_CONFIG,
  REPORT_COLUMNS,
  formatAmount,
  formatDate,
  formatFileSize,
} from "./_components/report-types";
import { AnalyticsTab } from "./_components/analytics-tab";

// ─────────────────────────────────────────────────────────
// API helpers (uses shared api client with auth + baseURL)
// ─────────────────────────────────────────────────────────

async function apiGet<T>(path: string): Promise<T> {
  const res = await api.get(path);
  return res.data as T;
}

async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await api.post(path, body);
  return res.data as T;
}

async function apiDelete(path: string): Promise<void> {
  await api.delete(path);
}

async function uploadFile(file: File): Promise<ReportUpload> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/payment-reports/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  if (res.status >= 400) {
    throw new Error(res.data?.message ?? "Upload error");
  }
  return res.data as ReportUpload;
}

// ─────────────────────────────────────────────────────────
// Компонент: Drag & Drop зона загрузки
// ─────────────────────────────────────────────────────────
function UploadZone({
  onUploaded,
  t,
}: {
  onUploaded: (upload: ReportUpload) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;
      setUploading(true);

      for (const file of arr) {
        setProgress(t("uploadingFile", { name: file.name }));
        try {
          const result = await uploadFile(file);
          const cfg = REPORT_TYPE_CONFIG[result.reportType];
          toast.success(
            `${cfg.icon} ${file.name} — определён как ${cfg.label} (${result.detectionConfidence}%)`,
          );
          onUploaded(result);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (
            msg.includes("already") ||
            msg.includes("уже загружен") ||
            msg.includes("already")
          ) {
            toast.warning(t("fileAlreadyUploaded", { name: file.name }));
          } else {
            toast.error(t("errorPrefix", { message: msg }));
          }
        }
      }

      setUploading(false);
      setProgress("");
    },
    [onUploaded],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !uploading && fileInputRef.current?.click()}
      className={cn(
        "relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 select-none",
        isDragging
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/30",
        uploading && "pointer-events-none opacity-70",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".xlsx,.xls,.csv,.zip"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{progress}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2 text-muted-foreground/60">
            <FileSpreadsheet className="h-8 w-8" />
            <FileText className="h-8 w-8" />
            <Archive className="h-8 w-8" />
          </div>
          <p className="text-base font-medium">
            {isDragging ? t("dropFileHere") : t("dragOrClick")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("supportedFormats")}
          </p>
          <div className="flex gap-2 mt-1 flex-wrap justify-center">
            {(
              [
                "PAYME",
                "CLICK",
                "VENDHUB_ORDERS",
                "VENDHUB_CSV",
                "KASSA_FISCAL",
              ] as ReportType[]
            ).map((t) => {
              const cfg = REPORT_TYPE_CONFIG[t];
              return (
                <span
                  key={t}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    cfg.bgColor,
                    cfg.color,
                  )}
                >
                  {cfg.icon} {cfg.label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Компонент: таблица данных отчёта
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// Типы для импорта
// ─────────────────────────────────────────────────────────

interface ImportResult {
  uploadId: string;
  batchId: string | null;
  totalRows: number;
  imported: number;
  skipped: number;
  machineNotFound: number;
  duplicateTransactions: number;
  errors: {
    rowId: string;
    rowIndex: number;
    machineCode: string | null;
    reason: string;
    details?: string;
  }[];
}

interface ImportStatusData {
  uploadId: string;
  totalRows: number;
  importedRows: number;
  pendingRows: number;
  errorRows: number;
  importedAt: string | null;
  importedBy: string | null;
}

function ReportDataTable({
  upload,
  t,
}: {
  upload: ReportUpload;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("rowIndex");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("ASC");
  const [filterMethod, setFilterMethod] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const queryClient = useQueryClient();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery<PaginatedRows>({
    queryKey: [
      "report-rows",
      upload.id,
      page,
      debouncedSearch,
      sortBy,
      sortDir,
      filterMethod,
      filterStatus,
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "100",
        sortBy,
        sortDir,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filterMethod && { paymentMethod: filterMethod }),
        ...(filterStatus && { paymentStatus: filterStatus }),
      });
      return apiGet<PaginatedRows>(
        `/payment-reports/${upload.id}/rows?${params}`,
      );
    },
    enabled: upload.status === "COMPLETED",
  });

  const { data: filters } = useQuery<RowFilters>({
    queryKey: ["report-filters", upload.id],
    queryFn: () => apiGet<RowFilters>(`/payment-reports/${upload.id}/filters`),
    enabled: upload.status === "COMPLETED",
  });

  // Import status
  const { data: importStatus } = useQuery<ImportStatusData>({
    queryKey: ["import-status", upload.id],
    queryFn: () =>
      apiGet<ImportStatusData>(`/payment-reports/${upload.id}/import-status`),
    enabled: upload.status === "COMPLETED",
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: () =>
      apiPost<ImportResult>(`/payment-reports/${upload.id}/import`),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["import-status", upload.id] });
      queryClient.invalidateQueries({ queryKey: ["report-rows", upload.id] });
      queryClient.invalidateQueries({ queryKey: ["payment-reports"] });
      setShowImportDialog(false);
      if (result.imported > 0) {
        toast.success(
          `Импортировано ${result.imported} из ${result.totalRows} строк` +
            (result.machineNotFound > 0
              ? ` (${result.machineNotFound} - машина не найдена)`
              : ""),
        );
      } else if (result.totalRows === 0) {
        toast.info(t("allRowsImported"));
      } else {
        toast.warning(
          `Не удалось импортировать: ${result.machineNotFound} строк - машина не найдена`,
        );
      }
    },
    onError: (err: Error) => {
      toast.error(t("importError", { message: err.message }));
    },
  });

  const columns = REPORT_COLUMNS[upload.reportType] ?? REPORT_COLUMNS.UNKNOWN;

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(key);
      setSortDir("ASC");
    }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <ChevronUp className="h-3 w-3 opacity-30" />;
    return sortDir === "ASC" ? (
      <ChevronUp className="h-3 w-3 text-primary" />
    ) : (
      <ChevronDown className="h-3 w-3 text-primary" />
    );
  };

  if (upload.status !== "COMPLETED") {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p>
          {upload.status === "FAILED"
            ? t("processingError", { message: upload.errorMessage ?? "" })
            : upload.status === "DUPLICATE"
              ? t("fileDuplicate")
              : t("processing")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Import button + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {importStatus && importStatus.totalRows > 0 && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                importStatus.importedRows === importStatus.totalRows
                  ? "text-green-600 border-green-300"
                  : importStatus.importedRows > 0
                    ? "text-orange-600 border-orange-300"
                    : "text-muted-foreground",
              )}
            >
              {importStatus.importedRows === importStatus.totalRows
                ? `Импортировано ${importStatus.importedRows}/${importStatus.totalRows}`
                : importStatus.importedRows > 0
                  ? `${importStatus.importedRows}/${importStatus.totalRows} импортировано`
                  : `${importStatus.totalRows} строк к импорту`}
            </Badge>
          )}
        </div>

        {importStatus && importStatus.pendingRows > 0 && (
          <Button
            size="sm"
            onClick={() => setShowImportDialog(true)}
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Импорт в транзакции
          </Button>
        )}
      </div>

      {/* Import confirmation dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Импорт в транзакции</DialogTitle>
            <DialogDescription>
              Строки отчёта будут преобразованы в записи транзакций
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Файл:</span>
              <span className="font-medium">{upload.fileName}</span>
              <span className="text-muted-foreground">Тип:</span>
              <span className="font-medium">
                {REPORT_TYPE_CONFIG[upload.reportType]?.label}
              </span>
              <span className="text-muted-foreground">Строк к импорту:</span>
              <span className="font-medium">
                {importStatus?.pendingRows ?? upload.newRows}
              </span>
              {upload.totalAmount != null && (
                <>
                  <span className="text-muted-foreground">Сумма:</span>
                  <span className="font-medium">
                    {formatAmount(upload.totalAmount, upload.currency)}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Строки с неизвестным кодом машины будут пропущены. Дубликаты
              транзакций автоматически исключаются.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
              disabled={importMutation.isPending}
            >
              Отмена
            </Button>
            <Button
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Импортировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Фильтры */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {filters?.paymentMethods && filters.paymentMethods.length > 0 && (
          <Select
            value={filterMethod || "all"}
            onValueChange={(v) => {
              setFilterMethod(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("paymentMethodPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allMethods")}</SelectItem>
              {filters.paymentMethods.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {filters?.paymentStatuses && filters.paymentStatuses.length > 0 && (
          <Select
            value={filterStatus || "all"}
            onValueChange={(v) => {
              setFilterStatus(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("statusPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses")}</SelectItem>
              {filters.paymentStatuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {(filterMethod || filterStatus || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterMethod("");
              setFilterStatus("");
              setSearch("");
              setPage(1);
            }}
          >
            <X className="h-4 w-4 mr-1" /> Сбросить
          </Button>
        )}
      </div>

      {/* Таблица */}
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "whitespace-nowrap text-xs font-semibold",
                      col.sortable &&
                        "cursor-pointer hover:text-primary select-none",
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && <SortIcon col={col.key} />}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((c) => (
                      <TableCell key={c.key}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                    <TableCell />
                  </TableRow>
                ))
              ) : (data?.data?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 1}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Нет данных
                  </TableCell>
                </TableRow>
              ) : (
                data!.data.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "hover:bg-muted/30 transition-colors",
                      row.isDuplicate && "opacity-50",
                    )}
                  >
                    {columns.map((col) => {
                      const val = row[col.key];
                      let display: React.ReactNode =
                        val === undefined || val === null ? "—" : String(val);

                      if (col.key === "amount")
                        display = formatAmount(row.amount, upload.currency);
                      else if (col.key === "paymentTime")
                        display = formatDate(row.paymentTime);
                      else if (
                        col.key === "paymentStatus" &&
                        row.paymentStatus
                      ) {
                        display = (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted font-medium">
                            {row.paymentStatus}
                          </span>
                        );
                      }

                      return (
                        <TableCell
                          key={col.key}
                          className="text-sm whitespace-nowrap max-w-[200px] truncate"
                        >
                          {display}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      {row.isDuplicate && (
                        <Badge
                          variant="outline"
                          className="text-xs text-orange-600 border-orange-300"
                        >
                          дубль
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Пагинация */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Показано {(page - 1) * 100 + 1}–{Math.min(page * 100, data.total)}{" "}
            из {data.total}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-3 text-sm">
              {page} / {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Компонент: карточка загрузки в истории
// ─────────────────────────────────────────────────────────
function UploadHistoryCard({
  upload,
  onView,
  onDelete,
  onSelect,
  selected,
  t,
}: {
  upload: ReportUpload;
  onView: () => void;
  onDelete: () => void;
  onSelect: () => void;
  selected: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const typeCfg = REPORT_TYPE_CONFIG[upload.reportType];
  const statusCfg = UPLOAD_STATUS_CONFIG[upload.status];

  return (
    <div
      className={cn(
        "border rounded-lg p-4 flex items-center gap-4 hover:bg-muted/20 transition-colors cursor-pointer",
        selected && "ring-2 ring-primary bg-primary/5",
      )}
      onClick={onSelect}
    >
      <div
        className={cn(
          "text-2xl w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0",
          typeCfg.bgColor,
        )}
      >
        {typeCfg.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate max-w-[300px]">
            {upload.fileName}
          </p>
          <Badge
            className={cn(
              "text-xs",
              typeCfg.bgColor,
              typeCfg.color,
              "border-0",
            )}
          >
            {typeCfg.label}
          </Badge>
          <Badge
            className={cn(
              "text-xs",
              statusCfg.bgColor,
              statusCfg.color,
              "border-0",
            )}
          >
            {statusCfg.label}
          </Badge>
          {upload.detectionConfidence > 0 && (
            <span className="text-xs text-muted-foreground">
              {upload.detectionConfidence}%
            </span>
          )}
        </div>

        <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
          <span>{formatFileSize(upload.fileSize)}</span>
          {upload.totalRows > 0 && (
            <>
              <span>{upload.totalRows.toLocaleString()} строк</span>
              {upload.newRows > 0 && (
                <span className="text-green-600">+{upload.newRows} новых</span>
              )}
              {upload.duplicateRows > 0 && (
                <span className="text-orange-600">
                  {upload.duplicateRows} дублей
                </span>
              )}
            </>
          )}
          {upload.totalAmount !== undefined && upload.totalAmount !== null && (
            <span className="font-medium text-foreground">
              {formatAmount(upload.totalAmount, upload.currency)}
            </span>
          )}
          {upload.status === "COMPLETED" && upload.importedRows != null && (
            <span
              className={cn(
                "font-medium",
                upload.importedRows > 0 &&
                  upload.importedRows >= (upload.newRows || upload.totalRows)
                  ? "text-green-600"
                  : upload.importedRows > 0
                    ? "text-orange-600"
                    : "text-muted-foreground",
              )}
            >
              {upload.importedRows > 0
                ? `${upload.importedRows}/${upload.newRows || upload.totalRows} импорт`
                : t("notImported")}
            </span>
          )}
          {upload.periodFrom && (
            <span>
              {new Date(upload.periodFrom).toLocaleDateString("ru-RU")}
              {upload.periodTo &&
                ` — ${new Date(upload.periodTo).toLocaleDateString("ru-RU")}`}
            </span>
          )}
          <span>{formatDate(upload.createdAt)}</span>
        </div>
      </div>

      <div
        className="flex gap-1 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onView}
          title={t("tabHistory")}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
          title={t("reportDeleted")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ГЛАВНАЯ СТРАНИЦА
// ─────────────────────────────────────────────────────────
export default function PaymentReportsPage() {
  const t = useTranslations("paymentReports");
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "upload" | "history" | "reconcile" | "analytics"
  >("upload");
  const [viewUpload, setViewUpload] = useState<ReportUpload | null>(null);
  const [selectedForReconcile, setSelectedForReconcile] = useState<string[]>(
    [],
  );
  const [reconcileResult, setReconcileResult] =
    useState<ReconcileResult | null>(null);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>("");

  // История загрузок
  const {
    data: uploadsData,
    isLoading: historyLoading,
    refetch,
  } = useQuery({
    queryKey: ["payment-reports", filterType],
    queryFn: () => {
      const params = filterType ? `?reportType=${filterType}` : "";
      return apiGet<{ data: ReportUpload[]; total: number }>(
        `/payment-reports${params}`,
      );
    },
  });

  // Статистика
  const { data: stats } = useQuery({
    queryKey: ["payment-reports-stats"],
    queryFn: () =>
      apiGet<{
        byType: {
          type: string;
          count: string;
          totalRows: string;
          totalAmount: string;
        }[];
      }>("/payment-reports/stats"),
  });

  // Удаление
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/payment-reports/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-reports"] });
      queryClient.invalidateQueries({ queryKey: ["payment-reports-stats"] });
      toast.success(t("reportDeleted"));
    },
  });

  const handleUploaded = (upload: ReportUpload) => {
    queryClient.invalidateQueries({ queryKey: ["payment-reports"] });
    queryClient.invalidateQueries({ queryKey: ["payment-reports-stats"] });
    setActiveTab("history");
    setViewUpload(upload);
  };

  const handleReconcile = async () => {
    if (selectedForReconcile.length !== 2) {
      toast.error(t("selectExactlyTwo"));
      return;
    }
    setReconcileLoading(true);
    try {
      const result = await apiPost<ReconcileResult>(
        "/payment-reports/reconcile",
        {
          uploadIdA: selectedForReconcile[0],
          uploadIdB: selectedForReconcile[1],
        },
      );
      setReconcileResult(result);
    } catch (e) {
      toast.error(
        t("reconcileError", {
          message: e instanceof Error ? e.message : String(e),
        }),
      );
    } finally {
      setReconcileLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedForReconcile((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 2
          ? [...prev, id]
          : [prev[1], id],
    );
  };

  const uploads = uploadsData?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Отчёты платёжных систем</h1>
          <p className="text-muted-foreground mt-1">
            Загрузка и анализ отчётов Payme, Click, VendHub, кассовых аппаратов
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Обновить
        </Button>
      </div>

      {/* Статистика */}
      {stats?.byType && stats.byType.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.byType.map((s) => {
            const cfg = REPORT_TYPE_CONFIG[s.type as ReportType];
            return (
              <Card
                key={s.type}
                className="cursor-pointer hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{cfg?.icon ?? "📄"}</span>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        cfg?.color ?? "text-gray-600",
                      )}
                    >
                      {cfg?.label ?? s.type}
                    </span>
                  </div>
                  <p className="text-xl font-bold">{Number(s.count)}</p>
                  <p className="text-xs text-muted-foreground">
                    {Number(s.totalRows).toLocaleString()} строк
                  </p>
                  {s.totalAmount && (
                    <p className="text-xs font-medium text-green-600 mt-0.5">
                      {formatAmount(Number(s.totalAmount))}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Основные вкладки */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <TabsList>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" /> Загрузить
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" /> История (
            {uploadsData?.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="reconcile">
            <GitCompare className="h-4 w-4 mr-2" /> Сверка
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" /> Аналитика
          </TabsTrigger>
        </TabsList>

        {/* ── UPLOAD ── */}
        <TabsContent value="upload" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <UploadZone onUploaded={handleUploaded} t={t} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── HISTORY ── */}
        <TabsContent value="history" className="mt-4 space-y-3">
          {/* Фильтр по типу */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterType === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("")}
            >
              Все
            </Button>
            {(
              [
                "PAYME",
                "CLICK",
                "VENDHUB_ORDERS",
                "VENDHUB_CSV",
                "KASSA_FISCAL",
              ] as ReportType[]
            ).map((t) => {
              const cfg = REPORT_TYPE_CONFIG[t];
              return (
                <Button
                  key={t}
                  variant={filterType === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType(t)}
                >
                  {cfg.icon} {cfg.label}
                </Button>
              );
            })}
          </div>

          {historyLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 flex gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))
          ) : uploads.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Нет загруженных отчётов</p>
                <Button className="mt-3" onClick={() => setActiveTab("upload")}>
                  Загрузить первый отчёт
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {uploads.map((u) => (
                <UploadHistoryCard
                  key={u.id}
                  upload={u}
                  onView={() => setViewUpload(u)}
                  onDelete={() => deleteMutation.mutate(u.id)}
                  onSelect={() => toggleSelect(u.id)}
                  selected={selectedForReconcile.includes(u.id)}
                  t={t}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── RECONCILE ── */}
        <TabsContent value="reconcile" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitCompare className="h-5 w-5" />
                Сверка двух отчётов
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Выберите 2 отчёта на вкладке «История» (кликните на карточки),
                затем нажмите «Сверить». Система найдёт совпадения, расхождения
                и уникальные записи.
              </p>

              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {selectedForReconcile.map((id) => {
                    const u = uploads.find((x) => x.id === id);
                    if (!u) return null;
                    const cfg = REPORT_TYPE_CONFIG[u.reportType];
                    return (
                      <Badge
                        key={id}
                        className={cn(
                          "text-sm py-1",
                          cfg.bgColor,
                          cfg.color,
                          "border-0",
                        )}
                      >
                        {cfg.icon} {u.fileName.slice(0, 30)}
                      </Badge>
                    );
                  })}
                </div>

                <Button
                  onClick={handleReconcile}
                  disabled={
                    selectedForReconcile.length !== 2 || reconcileLoading
                  }
                >
                  {reconcileLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <GitCompare className="h-4 w-4 mr-2" />
                  )}
                  Сверить
                </Button>

                {selectedForReconcile.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedForReconcile([])}
                  >
                    <X className="h-4 w-4 mr-1" /> Сбросить
                  </Button>
                )}
              </div>

              {/* Результат сверки */}
              {reconcileResult && (
                <div className="space-y-4">
                  {/* Экспорт */}
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const res = await api.post(
                          "/payment-reports/analytics/export-reconcile",
                          {
                            uploadIdA: selectedForReconcile[0],
                            uploadIdB: selectedForReconcile[1],
                          },
                          { responseType: "blob" },
                        );
                        if (res.status >= 400) {
                          toast.error(t("exportError"));
                          return;
                        }
                        const blob = res.data as Blob;
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `reconcile_${new Date().toISOString().slice(0, 10)}.xlsx`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Скачать сверку (Excel)
                    </Button>
                  </div>
                  {/* Итоги */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      {
                        label: t("matched"),
                        value: reconcileResult.summary.matched,
                        color: "text-green-600",
                      },
                      {
                        label: t("mismatched"),
                        value: reconcileResult.summary.mismatched,
                        color: "text-red-600",
                      },
                      {
                        label: `Только в «${reconcileResult.uploadA.fileName.slice(0, 20)}»`,
                        value: reconcileResult.summary.onlyInA,
                        color: "text-orange-600",
                      },
                      {
                        label: `Только в «${reconcileResult.uploadB.fileName.slice(0, 20)}»`,
                        value: reconcileResult.summary.onlyInB,
                        color: "text-orange-600",
                      },
                      {
                        label: t("totalA"),
                        value: reconcileResult.summary.totalA,
                        color: "text-muted-foreground",
                      },
                      {
                        label: t("totalB"),
                        value: reconcileResult.summary.totalB,
                        color: "text-muted-foreground",
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="border rounded-lg p-3 text-center"
                      >
                        <p className={cn("text-2xl font-bold", s.color)}>
                          {s.value}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Расхождения */}
                  {reconcileResult.mismatched.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2 text-red-600">
                        Расхождения по сумме (
                        {reconcileResult.mismatched.length})
                      </h3>
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-red-50">
                              <TableHead>№ Заказа</TableHead>
                              <TableHead>Сумма А</TableHead>
                              <TableHead>Сумма Б</TableHead>
                              <TableHead>Разница</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reconcileResult.mismatched
                              .slice(0, 50)
                              .map((m) => (
                                <TableRow key={m.orderNumber}>
                                  <TableCell className="font-mono text-xs">
                                    {m.orderNumber}
                                  </TableCell>
                                  <TableCell>
                                    {formatAmount(m.amountA)}
                                  </TableCell>
                                  <TableCell>
                                    {formatAmount(m.amountB)}
                                  </TableCell>
                                  <TableCell
                                    className={cn(
                                      "font-medium",
                                      m.diff > 0
                                        ? "text-red-600"
                                        : "text-blue-600",
                                    )}
                                  >
                                    {m.diff > 0 ? "+" : ""}
                                    {formatAmount(Math.abs(m.diff))}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ANALYTICS ── */}
        <TabsContent value="analytics" className="mt-4">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>

      {/* Модал просмотра отчёта */}
      <Dialog
        open={!!viewUpload}
        onOpenChange={(o) => !o && setViewUpload(null)}
      >
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewUpload && (
                <>
                  <span>{REPORT_TYPE_CONFIG[viewUpload.reportType].icon}</span>
                  <span className="truncate max-w-[500px]">
                    {viewUpload.fileName}
                  </span>
                  <Badge
                    className={cn(
                      "ml-2 text-xs",
                      REPORT_TYPE_CONFIG[viewUpload.reportType].bgColor,
                      REPORT_TYPE_CONFIG[viewUpload.reportType].color,
                      "border-0",
                    )}
                  >
                    {REPORT_TYPE_CONFIG[viewUpload.reportType].label}
                  </Badge>
                  <div className="flex items-center gap-3 ml-auto">
                    <span className="text-sm font-normal text-muted-foreground">
                      {viewUpload.totalRows.toLocaleString()} строк
                      {viewUpload.totalAmount !== undefined &&
                        ` • ${formatAmount(viewUpload.totalAmount, viewUpload.currency)}`}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(
                          `${api.defaults.baseURL}/payment-reports/analytics/export-rows?uploadId=${viewUpload.id}`,
                          "_blank",
                        );
                      }}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Экспорт Excel
                    </Button>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {viewUpload && <ReportDataTable upload={viewUpload} t={t} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
