"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Columns,
  RefreshCw,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { importApi } from "@/lib/api";
import { toast } from "sonner";

import type { ImportSession, WizardStep } from "./import-types";
import {
  statusStyleConfig,
  domainStyleConfig,
  DOMAIN_KEYS,
  ACCEPTED_FORMATS,
  wizardStepDefs,
  formatFileSize,
} from "./import-constants";

export interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportWizard({ open, onOpenChange }: ImportWizardProps) {
  const t = useTranslations("import");
  const queryClient = useQueryClient();

  // --- Wizard state ---
  const [wizardStep, setWizardStep] = useState<WizardStep>("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [wizardSessionId, setWizardSessionId] = useState<string | null>(null);
  const [domainOverride, setDomainOverride] = useState<string>("");
  const [columnOverrides, setColumnOverrides] = useState<
    Record<string, string>
  >({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Reject state ---
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // --- Queries ---

  const { data: wizardSession, refetch: refetchWizardSession } = useQuery({
    queryKey: ["import-session", wizardSessionId],
    queryFn: () =>
      importApi
        .getSession(wizardSessionId!)
        .then((res) => res.data as ImportSession),
    enabled: !!wizardSessionId,
  });

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
    onOpenChange(false);
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

  const getStepIndex = (step: WizardStep) =>
    wizardStepDefs.findIndex((s) => s.id === step);

  // --- Helper: get translated status/domain labels ---

  const getStatusLabel = (status: ImportSession["status"]) =>
    t(statusStyleConfig[status]?.labelKey ?? "status_CREATED");

  const getDomainLabel = (domain: ImportSession["domain"]) =>
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
    <>
      {/* Import Wizard Dialog */}
      <Dialog
        open={open}
        onOpenChange={(openState) => {
          if (!openState) resetWizard();
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
    </>
  );
}
