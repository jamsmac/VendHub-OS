"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Upload,
  FileSpreadsheet,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  FileUp,
  Loader2,
  ClipboardList,
  Columns,
  ShieldCheck,
  Play,
  X,
  RefreshCw,
  History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { importApi } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

// --- Types ---

interface ImportSession {
  id: string;
  session_number?: string;
  domain: ImportDomain;
  status: ImportStatus;
  file_name: string;
  file_size?: number;
  total_rows: number;
  processed_rows: number;
  errors_count: number;
  warnings_count: number;
  inserts_count?: number;
  updates_count?: number;
  classification_confidence?: number;
  detected_domain?: ImportDomain;
  column_mappings?: ColumnMapping[];
  validation_errors?: ValidationError[];
  validation_warnings?: ValidationWarning[];
  reject_reason?: string;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
}

interface ColumnMapping {
  source_column: string;
  target_column: string;
  auto_detected: boolean;
  confidence?: number;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

interface ValidationWarning {
  row: number;
  field: string;
  message: string;
  value?: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  table_name: string;
  row_id?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  created_at: string;
}

interface SessionsResponse {
  data: ImportSession[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

type ImportDomain =
  | "PRODUCTS"
  | "MACHINES"
  | "USERS"
  | "EMPLOYEES"
  | "TRANSACTIONS"
  | "SALES"
  | "INVENTORY"
  | "CUSTOMERS"
  | "PRICES"
  | "CATEGORIES"
  | "LOCATIONS"
  | "CONTRACTORS";

type ImportStatus =
  | "CREATED"
  | "UPLOADING"
  | "UPLOADED"
  | "CLASSIFYING"
  | "CLASSIFIED"
  | "MAPPING"
  | "MAPPED"
  | "VALIDATING"
  | "VALIDATED"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "EXECUTING"
  | "COMPLETED"
  | "COMPLETED_WITH_ERRORS"
  | "FAILED";

// --- Config Maps (style only, labels via t()) ---

const statusStyleConfig: Record<
  ImportStatus,
  { labelKey: string; color: string; bgColor: string }
> = {
  CREATED: {
    labelKey: "status_CREATED",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  UPLOADING: {
    labelKey: "status_UPLOADING",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  UPLOADED: {
    labelKey: "status_UPLOADED",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  CLASSIFYING: {
    labelKey: "status_CLASSIFYING",
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
  },
  CLASSIFIED: {
    labelKey: "status_CLASSIFIED",
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
  },
  MAPPING: {
    labelKey: "status_MAPPING",
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
  },
  MAPPED: {
    labelKey: "status_MAPPED",
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
  },
  VALIDATING: {
    labelKey: "status_VALIDATING",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  VALIDATED: {
    labelKey: "status_VALIDATED",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  AWAITING_APPROVAL: {
    labelKey: "status_AWAITING_APPROVAL",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  APPROVED: {
    labelKey: "status_APPROVED",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  REJECTED: {
    labelKey: "status_REJECTED",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
  EXECUTING: {
    labelKey: "status_EXECUTING",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  COMPLETED: {
    labelKey: "status_COMPLETED",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  COMPLETED_WITH_ERRORS: {
    labelKey: "status_COMPLETED_WITH_ERRORS",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  FAILED: {
    labelKey: "status_FAILED",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
};

const domainStyleConfig: Record<
  ImportDomain,
  { labelKey: string; color: string; bgColor: string }
> = {
  PRODUCTS: {
    labelKey: "domain_PRODUCTS",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  MACHINES: {
    labelKey: "domain_MACHINES",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  USERS: {
    labelKey: "domain_USERS",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  EMPLOYEES: {
    labelKey: "domain_EMPLOYEES",
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
  },
  TRANSACTIONS: {
    labelKey: "domain_TRANSACTIONS",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  SALES: {
    labelKey: "domain_SALES",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
  },
  INVENTORY: {
    labelKey: "domain_INVENTORY",
    color: "text-teal-700",
    bgColor: "bg-teal-100",
  },
  CUSTOMERS: {
    labelKey: "domain_CUSTOMERS",
    color: "text-pink-700",
    bgColor: "bg-pink-100",
  },
  PRICES: {
    labelKey: "domain_PRICES",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  CATEGORIES: {
    labelKey: "domain_CATEGORIES",
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
  },
  LOCATIONS: {
    labelKey: "domain_LOCATIONS",
    color: "text-sky-700",
    bgColor: "bg-sky-100",
  },
  CONTRACTORS: {
    labelKey: "domain_CONTRACTORS",
    color: "text-slate-700",
    bgColor: "bg-slate-100",
  },
};

const DOMAIN_KEYS: ImportDomain[] = [
  "PRODUCTS",
  "MACHINES",
  "USERS",
  "EMPLOYEES",
  "TRANSACTIONS",
  "SALES",
  "INVENTORY",
  "CUSTOMERS",
  "PRICES",
  "CATEGORIES",
  "LOCATIONS",
  "CONTRACTORS",
];

const STATUS_KEYS: ImportStatus[] = [
  "CREATED",
  "UPLOADING",
  "UPLOADED",
  "CLASSIFYING",
  "CLASSIFIED",
  "MAPPING",
  "MAPPED",
  "VALIDATING",
  "VALIDATED",
  "AWAITING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "EXECUTING",
  "COMPLETED",
  "COMPLETED_WITH_ERRORS",
  "FAILED",
];

const ACCEPTED_FORMATS = ".csv,.xls,.xlsx,.json";
const PAGE_SIZE = 20;

// --- Wizard Steps ---

type WizardStep =
  | "upload"
  | "classification"
  | "mapping"
  | "validation"
  | "approve";

const wizardStepDefs: {
  id: WizardStep;
  labelKey: string;
  icon: React.ElementType;
}[] = [
  { id: "upload", labelKey: "step_upload", icon: FileUp },
  {
    id: "classification",
    labelKey: "step_classification",
    icon: ClipboardList,
  },
  { id: "mapping", labelKey: "step_mapping", icon: Columns },
  { id: "validation", labelKey: "step_validation", icon: ShieldCheck },
  { id: "approve", labelKey: "step_approve", icon: Play },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportPage() {
  const t = useTranslations("import");

  // --- List state ---
  const [domainFilter, setDomainFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // --- Wizard state ---
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [wizardSessionId, setWizardSessionId] = useState<string | null>(null);
  const [domainOverride, setDomainOverride] = useState<string>("");
  const [columnOverrides, setColumnOverrides] = useState<
    Record<string, string>
  >({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Detail state ---
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [detailTab, setDetailTab] = useState("info");

  // --- Reject state ---
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const queryClient = useQueryClient();

  // --- Derived options ---

  const domainOptions = [
    { value: "ALL", label: t("allDomains") },
    ...DOMAIN_KEYS.map((key) => ({
      value: key,
      label: t(domainStyleConfig[key].labelKey),
    })),
  ];

  const statusFilterOptions = [
    { value: "ALL", label: t("allStatuses") },
    ...STATUS_KEYS.map((key) => ({
      value: key,
      label: t(statusStyleConfig[key].labelKey),
    })),
  ];

  // --- Queries ---

  const queryParams = {
    domain: domainFilter !== "ALL" ? domainFilter : undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    page,
    limit: PAGE_SIZE,
  };

  const { data: sessionsResponse, isLoading } = useQuery({
    queryKey: ["import-sessions", queryParams],
    queryFn: () =>
      importApi
        .getSessions(queryParams)
        .then((res) => res.data as SessionsResponse),
  });

  const { data: wizardSession, refetch: refetchWizardSession } = useQuery({
    queryKey: ["import-session", wizardSessionId],
    queryFn: () =>
      importApi
        .getSession(wizardSessionId!)
        .then((res) => res.data as ImportSession),
    enabled: !!wizardSessionId,
  });

  const { data: detailSession, refetch: _refetchDetailSession } = useQuery({
    queryKey: ["import-session-detail", selectedSessionId],
    queryFn: () =>
      importApi
        .getSession(selectedSessionId!)
        .then((res) => res.data as ImportSession),
    enabled: !!selectedSessionId && detailOpen,
  });

  const { data: auditLog } = useQuery({
    queryKey: ["import-audit-log", selectedSessionId],
    queryFn: () =>
      importApi
        .getAuditLog(selectedSessionId!)
        .then((res) => res.data as AuditLogEntry[]),
    enabled: !!selectedSessionId && detailOpen && detailTab === "audit",
  });

  const sessions = sessionsResponse?.data || [];
  const meta = sessionsResponse?.meta || {
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
  };

  // --- Mutations ---

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return importApi.createSession(formData);
    },
    onSuccess: (res) => {
      const session = res.data as ImportSession;
      setWizardSessionId(session.id);
      toast.success(t("toastFileUploaded"));
      setWizardStep("classification");
    },
    onError: () => {
      toast.error(t("toastFileUploadError"));
    },
  });

  const classifyMutation = useMutation({
    mutationFn: (id: string) => importApi.classifySession(id),
    onSuccess: () => {
      toast.success(t("toastClassificationDone"));
      refetchWizardSession();
      setWizardStep("mapping");
    },
    onError: () => {
      toast.error(t("toastClassificationError"));
    },
  });

  const validateMutation = useMutation({
    mutationFn: (id: string) => importApi.validateSession(id),
    onSuccess: () => {
      toast.success(t("toastValidationDone"));
      refetchWizardSession();
      setWizardStep("validation");
    },
    onError: () => {
      toast.error(t("toastValidationError"));
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => importApi.approveSession(id),
    onSuccess: () => {
      toast.success(t("toastImportApproved"));
      queryClient.invalidateQueries({ queryKey: ["import-sessions"] });
      resetWizard();
    },
    onError: () => {
      toast.error(t("toastImportApproveError"));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      importApi.rejectSession(id, { reason }),
    onSuccess: () => {
      toast.success(t("toastImportRejected"));
      queryClient.invalidateQueries({ queryKey: ["import-sessions"] });
      setRejectOpen(false);
      setRejectReason("");
      resetWizard();
    },
    onError: () => {
      toast.error(t("toastImportRejectError"));
    },
  });

  // --- Handlers ---

  const resetWizard = () => {
    setWizardOpen(false);
    setWizardStep("upload");
    setUploadedFile(null);
    setWizardSessionId(null);
    setDomainOverride("");
    setColumnOverrides({});
  };

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUpload = () => {
    if (uploadedFile) {
      uploadMutation.mutate(uploadedFile);
    }
  };

  const handleClassify = () => {
    if (wizardSessionId) {
      classifyMutation.mutate(wizardSessionId);
    }
  };

  () => {
    if (wizardSessionId) {
      validateMutation.mutate(wizardSessionId);
    }
  };

  const handleApprove = () => {
    if (wizardSessionId) {
      approveMutation.mutate(wizardSessionId);
    }
  };

  const handleReject = () => {
    if (wizardSessionId && rejectReason) {
      rejectMutation.mutate({ id: wizardSessionId, reason: rejectReason });
    }
  };

  const handleViewSession = (session: ImportSession) => {
    setSelectedSessionId(session.id);
    setDetailTab("info");
    setDetailOpen(true);
  };

  const getStepIndex = (step: WizardStep) =>
    wizardStepDefs.findIndex((s) => s.id === step);

  // --- Helper: get translated status/domain labels ---

  const getStatusLabel = (status: ImportStatus) =>
    t(statusStyleConfig[status]?.labelKey ?? "status_CREATED");

  const getDomainLabel = (domain: ImportDomain) =>
    t(domainStyleConfig[domain]?.labelKey ?? "domain_PRODUCTS");

  // --- Render Wizard Step Content ---

  const renderWizardStepContent = () => {
    switch (wizardStep) {
      case "upload":
        return (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FORMATS}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">{t("dropzoneTitle")}</p>
              <p className="text-sm text-muted-foreground">
                {t("dropzoneFormats")}
              </p>
            </div>

            {/* Selected file info */}
            {uploadedFile && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(uploadedFile.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={!uploadedFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("uploading")}
                  </>
                ) : (
                  <>
                    {t("upload")}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case "classification":
        return (
          <div className="space-y-4">
            {wizardSession ? (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("file")}
                        </p>
                        <p className="font-medium">{wizardSession.file_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("rowsInFile")}
                        </p>
                        <p className="font-medium">
                          {wizardSession.total_rows}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("detectedDomain")}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {wizardSession.detected_domain ? (
                            <>
                              <Badge
                                className={`${domainStyleConfig[wizardSession.detected_domain]?.bgColor} ${domainStyleConfig[wizardSession.detected_domain]?.color} border-0`}
                              >
                                {getDomainLabel(wizardSession.detected_domain)}
                              </Badge>
                              {wizardSession.classification_confidence !=
                                null && (
                                <span className="text-sm text-muted-foreground">
                                  (
                                  {(
                                    wizardSession.classification_confidence *
                                    100
                                  ).toFixed(0)}
                                  %)
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">
                              {t("notDetected")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("overrideDomain")}
                        </p>
                        <Select
                          value={domainOverride}
                          onValueChange={setDomainOverride}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={t("auto")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AUTO">{t("auto")}</SelectItem>
                            {DOMAIN_KEYS.map((key) => (
                              <SelectItem key={key} value={key}>
                                {getDomainLabel(key)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setWizardStep("upload")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("back")}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleClassify}
                      disabled={classifyMutation.isPending}
                    >
                      <RefreshCw
                        className={`h-4 w-4 mr-2 ${classifyMutation.isPending ? "animate-spin" : ""}`}
                      />
                      {t("reclassify")}
                    </Button>
                    <Button
                      onClick={() => {
                        if (wizardSession.detected_domain || domainOverride) {
                          setWizardStep("mapping");
                        } else {
                          handleClassify();
                        }
                      }}
                      disabled={classifyMutation.isPending}
                    >
                      {t("next")}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">
                  {t("loadingSessionData")}
                </p>
              </div>
            )}
          </div>
        );

      case "mapping":
        return (
          <div className="space-y-4">
            {wizardSession?.column_mappings &&
            wizardSession.column_mappings.length > 0 ? (
              <>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("columnInFile")}</TableHead>
                          <TableHead>{t("detectedField")}</TableHead>
                          <TableHead>{t("override")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wizardSession.column_mappings.map((mapping, idx) => (
                          <TableRow
                            key={idx}
                            className={
                              mapping.auto_detected ? "" : "bg-amber-50"
                            }
                          >
                            <TableCell className="font-mono text-sm">
                              {mapping.source_column}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {mapping.target_column || "-"}
                                </span>
                                {mapping.auto_detected ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                )}
                                {mapping.confidence != null && (
                                  <span className="text-xs text-muted-foreground">
                                    ({(mapping.confidence * 100).toFixed(0)}%)
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder={t("keepAsIs")}
                                value={
                                  columnOverrides[mapping.source_column] || ""
                                }
                                onChange={(e) =>
                                  setColumnOverrides((prev) => ({
                                    ...prev,
                                    [mapping.source_column]: e.target.value,
                                  }))
                                }
                                className="h-8 text-sm"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{t("autoDetected")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>{t("needsReview")}</span>
                  </div>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Columns className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    {t("mappingAfterClassification")}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setWizardStep("classification")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("back")}
              </Button>
              <Button
                onClick={() => {
                  if (wizardSessionId) {
                    validateMutation.mutate(wizardSessionId);
                  }
                }}
                disabled={validateMutation.isPending}
              >
                {validateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("validating")}
                  </>
                ) : (
                  <>
                    {t("runValidation")}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case "validation":
        return (
          <div className="space-y-4">
            {wizardSession ? (
              <>
                {/* Validation Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-red-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t("errors")}
                          </p>
                          <p className="text-xl font-bold text-red-600">
                            {wizardSession.errors_count}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t("warnings")}
                          </p>
                          <p className="text-xl font-bold text-amber-600">
                            {wizardSession.warnings_count}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {t("rowsChecked")}
                          </p>
                          <p className="text-xl font-bold text-blue-600">
                            {wizardSession.total_rows}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Validation Errors Table */}
                {wizardSession.validation_errors &&
                  wizardSession.validation_errors.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          {t("validationErrors")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-20">{t("row")}</TableHead>
                              <TableHead>{t("field")}</TableHead>
                              <TableHead>{t("message")}</TableHead>
                              <TableHead>{t("value")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {wizardSession.validation_errors
                              .slice(0, 50)
                              .map((err, idx) => (
                                <TableRow key={idx} className="bg-red-50/50">
                                  <TableCell className="font-mono text-sm">
                                    #{err.row}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {err.field}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {err.message}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground font-mono">
                                    {err.value || "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                        {wizardSession.validation_errors.length > 50 && (
                          <p className="text-sm text-muted-foreground p-4 text-center">
                            {t("showingErrorsOf", {
                              shown: 50,
                              total: wizardSession.validation_errors.length,
                            })}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                {/* Validation Warnings Table */}
                {wizardSession.validation_warnings &&
                  wizardSession.validation_warnings.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          {t("warnings")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-20">{t("row")}</TableHead>
                              <TableHead>{t("field")}</TableHead>
                              <TableHead>{t("message")}</TableHead>
                              <TableHead>{t("value")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {wizardSession.validation_warnings
                              .slice(0, 30)
                              .map((warn, idx) => (
                                <TableRow key={idx} className="bg-amber-50/50">
                                  <TableCell className="font-mono text-sm">
                                    #{warn.row}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {warn.field}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {warn.message}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground font-mono">
                                    {warn.value || "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                        {wizardSession.validation_warnings.length > 30 && (
                          <p className="text-sm text-muted-foreground p-4 text-center">
                            {t("showingWarningsOf", {
                              shown: 30,
                              total: wizardSession.validation_warnings.length,
                            })}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                {wizardSession.errors_count === 0 &&
                  wizardSession.warnings_count === 0 && (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                        <p className="font-medium text-green-700">
                          {t("validationPassed")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("noErrorsOrWarnings")}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setWizardStep("mapping")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("back")}
                  </Button>
                  <Button onClick={() => setWizardStep("approve")}>
                    {t("next")}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        );

      case "approve":
        return (
          <div className="space-y-4">
            {wizardSession ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {t("importSummary")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("file")}
                        </p>
                        <p className="font-medium">{wizardSession.file_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("domain")}
                        </p>
                        <Badge
                          className={`${domainStyleConfig[wizardSession.domain]?.bgColor || "bg-muted"} ${domainStyleConfig[wizardSession.domain]?.color || "text-muted-foreground"} border-0`}
                        >
                          {getDomainLabel(wizardSession.domain)}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("totalRows")}
                        </p>
                        <p className="font-medium">
                          {wizardSession.total_rows}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("status")}
                        </p>
                        <Badge
                          className={`${statusStyleConfig[wizardSession.status]?.bgColor} ${statusStyleConfig[wizardSession.status]?.color} border-0`}
                        >
                          {getStatusLabel(wizardSession.status)}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("insertsCount")}
                        </p>
                        <p className="text-lg font-bold text-green-600">
                          {wizardSession.inserts_count ?? "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("updatesCount")}
                        </p>
                        <p className="text-lg font-bold text-blue-600">
                          {wizardSession.updates_count ?? "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("errors")}
                        </p>
                        <p
                          className={`font-medium ${wizardSession.errors_count > 0 ? "text-red-600" : "text-green-600"}`}
                        >
                          {wizardSession.errors_count}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t("warnings")}
                        </p>
                        <p
                          className={`font-medium ${wizardSession.warnings_count > 0 ? "text-amber-600" : "text-green-600"}`}
                        >
                          {wizardSession.warnings_count}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {wizardSession.errors_count > 0 && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <p className="text-sm text-red-700">
                      {t("errorsFoundWarning")}
                    </p>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setWizardStep("validation")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("back")}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => setRejectOpen(true)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {t("reject")}
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t("executing")}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {t("approveAndExecute")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        );

      default:
        return null;
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
        <Button onClick={() => setWizardOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          {t("newImport")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select
          value={domainFilter}
          onValueChange={(value) => {
            setDomainFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("domain")} />
          </SelectTrigger>
          <SelectContent>
            {domainOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("status")} />
          </SelectTrigger>
          <SelectContent>
            {statusFilterOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sessions Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t("noSessionsFound")}</p>
            <p className="text-muted-foreground mb-4">{t("startWithUpload")}</p>
            <Button onClick={() => setWizardOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              {t("newImport")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job #</TableHead>
                  <TableHead>{t("domain")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("file")}</TableHead>
                  <TableHead>{t("rows")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const stCfg =
                    statusStyleConfig[session.status] ||
                    statusStyleConfig.CREATED;
                  const domCfg = domainStyleConfig[session.domain] || {
                    labelKey: "domain_PRODUCTS",
                    color: "text-muted-foreground",
                    bgColor: "bg-muted",
                  };

                  return (
                    <TableRow
                      key={session.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewSession(session)}
                    >
                      <TableCell className="font-mono text-sm">
                        {session.session_number || session.id.substring(0, 8)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${domCfg.bgColor} ${domCfg.color} border-0 text-xs`}
                        >
                          {t(domCfg.labelKey)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${stCfg.bgColor} ${stCfg.color} border-0`}
                        >
                          {t(stCfg.labelKey)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {session.file_name}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-medium">
                          {session.processed_rows}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          / {session.total_rows}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(session.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewSession(session);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {t("view")}
                            </DropdownMenuItem>
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
                {t("back")}
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
                {t("forward")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Import Wizard Dialog */}
      <Dialog
        open={wizardOpen}
        onOpenChange={(open) => {
          if (!open) resetWizard();
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("wizardTitle")}</DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-1 mb-4">
            {wizardStepDefs.map((step, idx) => {
              const currentIdx = getStepIndex(wizardStep);
              const isActive = idx === currentIdx;
              const isCompleted = idx < currentIdx;
              const StepIcon = step.icon;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isCompleted
                          ? "bg-green-100 text-green-700"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <StepIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t(step.labelKey)}</span>
                  </div>
                  {idx < wizardStepDefs.length - 1 && (
                    <ArrowRight className="h-4 w-4 mx-1 text-muted-foreground shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          {renderWizardStepContent()}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("rejectImport")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                {t("rejectReasonLabel")}
              </label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t("rejectReasonPlaceholder")}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectReason || rejectMutation.isPending}
              >
                {rejectMutation.isPending ? t("processing") : t("reject")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("sessionDetails")}</DialogTitle>
          </DialogHeader>
          {detailSession && (
            <Tabs value={detailTab} onValueChange={setDetailTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="info">{t("tabInfo")}</TabsTrigger>
                <TabsTrigger value="validation">
                  {t("tabValidation")}
                </TabsTrigger>
                <TabsTrigger value="audit">{t("tabAudit")}</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("sessionId")}
                    </p>
                    <p className="font-mono text-sm">{detailSession.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("status")}
                    </p>
                    <Badge
                      className={`mt-1 ${statusStyleConfig[detailSession.status]?.bgColor} ${statusStyleConfig[detailSession.status]?.color} border-0`}
                    >
                      {getStatusLabel(detailSession.status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("domain")}
                    </p>
                    <Badge
                      className={`mt-1 ${domainStyleConfig[detailSession.domain]?.bgColor || "bg-muted"} ${domainStyleConfig[detailSession.domain]?.color || "text-muted-foreground"} border-0`}
                    >
                      {getDomainLabel(detailSession.domain)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("file")}</p>
                    <p className="font-medium">{detailSession.file_name}</p>
                    {detailSession.file_size && (
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(detailSession.file_size)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("rows")}</p>
                    <p className="font-medium">
                      {detailSession.processed_rows} /{" "}
                      {detailSession.total_rows}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("errorsSlashWarnings")}
                    </p>
                    <p className="font-medium">
                      <span
                        className={
                          detailSession.errors_count > 0 ? "text-red-600" : ""
                        }
                      >
                        {detailSession.errors_count}
                      </span>
                      {" / "}
                      <span
                        className={
                          detailSession.warnings_count > 0
                            ? "text-amber-600"
                            : ""
                        }
                      >
                        {detailSession.warnings_count}
                      </span>
                    </p>
                  </div>
                  {detailSession.inserts_count != null && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("insertsCount")}
                      </p>
                      <p className="font-medium text-green-600">
                        {detailSession.inserts_count}
                      </p>
                    </div>
                  )}
                  {detailSession.updates_count != null && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("updatesCount")}
                      </p>
                      <p className="font-medium text-blue-600">
                        {detailSession.updates_count}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("created")}
                    </p>
                    <p className="text-sm">
                      {formatDateTime(detailSession.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("updated")}
                    </p>
                    <p className="text-sm">
                      {formatDateTime(detailSession.updated_at)}
                    </p>
                  </div>
                  {detailSession.created_by_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("createdBy")}
                      </p>
                      <p className="font-medium">
                        {detailSession.created_by_name}
                      </p>
                    </div>
                  )}
                </div>

                {detailSession.reject_reason && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm font-medium text-red-700 mb-1">
                      {t("rejectReasonTitle")}
                    </p>
                    <p className="text-sm text-red-600">
                      {detailSession.reject_reason}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="validation" className="space-y-4">
                {detailSession.validation_errors &&
                detailSession.validation_errors.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        {t("errorsWithCount", {
                          count: detailSession.validation_errors.length,
                        })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">{t("row")}</TableHead>
                            <TableHead>{t("field")}</TableHead>
                            <TableHead>{t("message")}</TableHead>
                            <TableHead>{t("value")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailSession.validation_errors.map((err, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-sm">
                                #{err.row}
                              </TableCell>
                              <TableCell className="font-medium">
                                {err.field}
                              </TableCell>
                              <TableCell className="text-sm">
                                {err.message}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground font-mono">
                                {err.value || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                      <p className="font-medium text-green-700">
                        {t("noValidationErrors")}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {detailSession.validation_warnings &&
                  detailSession.validation_warnings.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          {t("warningsWithCount", {
                            count: detailSession.validation_warnings.length,
                          })}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-20">{t("row")}</TableHead>
                              <TableHead>{t("field")}</TableHead>
                              <TableHead>{t("message")}</TableHead>
                              <TableHead>{t("value")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detailSession.validation_warnings.map(
                              (warn, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-mono text-sm">
                                    #{warn.row}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {warn.field}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {warn.message}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground font-mono">
                                    {warn.value || "-"}
                                  </TableCell>
                                </TableRow>
                              ),
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
              </TabsContent>

              <TabsContent value="audit" className="space-y-4">
                {auditLog && auditLog.length > 0 ? (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("auditAction")}</TableHead>
                            <TableHead>{t("auditTable")}</TableHead>
                            <TableHead>{t("auditRowId")}</TableHead>
                            <TableHead>{t("date")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {auditLog.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {entry.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {entry.table_name}
                              </TableCell>
                              <TableCell className="font-mono text-sm text-muted-foreground">
                                {entry.row_id
                                  ? entry.row_id.substring(0, 8) + "..."
                                  : "-"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm">
                                {formatDateTime(entry.created_at)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <History className="h-10 w-10 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">
                        {t("noAuditRecords")}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
