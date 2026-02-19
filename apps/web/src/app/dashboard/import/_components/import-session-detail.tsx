"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CheckCircle, XCircle, AlertTriangle, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { importApi } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

import type { ImportSession, AuditLogEntry } from "./import-types";
import {
  statusStyleConfig,
  domainStyleConfig,
  formatFileSize,
} from "./import-constants";

export interface ImportSessionDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSessionId: string | null;
}

export function ImportSessionDetail({
  open,
  onOpenChange,
  selectedSessionId,
}: ImportSessionDetailProps) {
  const t = useTranslations("import");
  const [detailTab, setDetailTab] = useState("info");

  // --- Helper: get translated status/domain labels ---

  const getStatusLabel = (status: ImportSession["status"]) =>
    t(statusStyleConfig[status]?.labelKey ?? "status_CREATED");

  const getDomainLabel = (domain: ImportSession["domain"]) =>
    t(domainStyleConfig[domain]?.labelKey ?? "domain_PRODUCTS");

  // --- Queries ---

  const { data: detailSession } = useQuery({
    queryKey: ["import-session-detail", selectedSessionId],
    queryFn: () =>
      importApi
        .getSession(selectedSessionId!)
        .then((res) => res.data as ImportSession),
    enabled: !!selectedSessionId && open,
  });

  const { data: auditLog } = useQuery({
    queryKey: ["import-audit-log", selectedSessionId],
    queryFn: () =>
      importApi
        .getAuditLog(selectedSessionId!)
        .then((res) => res.data as AuditLogEntry[]),
    enabled: !!selectedSessionId && open && detailTab === "audit",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("sessionDetails")}</DialogTitle>
        </DialogHeader>
        {detailSession && (
          <Tabs value={detailTab} onValueChange={setDetailTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="info">{t("tabInfo")}</TabsTrigger>
              <TabsTrigger value="validation">{t("tabValidation")}</TabsTrigger>
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
                  <p className="text-sm text-muted-foreground">{t("status")}</p>
                  <Badge
                    className={`mt-1 ${statusStyleConfig[detailSession.status]?.bgColor} ${statusStyleConfig[detailSession.status]?.color} border-0`}
                  >
                    {getStatusLabel(detailSession.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("domain")}</p>
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
                    {detailSession.processed_rows} / {detailSession.total_rows}
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
                        detailSession.warnings_count > 0 ? "text-amber-600" : ""
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
  );
}
