"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Upload,
  FileSpreadsheet,
  MoreVertical,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { importApi } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

import type {
  ImportSession,
  SessionsResponse,
} from "./_components/import-types";
import {
  statusStyleConfig,
  domainStyleConfig,
  DOMAIN_KEYS,
  STATUS_KEYS,
  PAGE_SIZE,
} from "./_components/import-constants";
import { ImportWizard } from "./_components/import-wizard";
import { ImportSessionDetail } from "./_components/import-session-detail";

export default function ImportPage() {
  const t = useTranslations("import");

  // --- List state ---
  const [domainFilter, setDomainFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // --- Wizard state ---
  const [wizardOpen, setWizardOpen] = useState(false);

  // --- Detail state ---
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

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

  const sessions = sessionsResponse?.data || [];
  const meta = sessionsResponse?.meta || {
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 1,
  };

  // --- Handlers ---

  const handleViewSession = (session: ImportSession) => {
    setSelectedSessionId(session.id);
    setDetailOpen(true);
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
      <ImportWizard open={wizardOpen} onOpenChange={setWizardOpen} />

      {/* Session Detail Dialog */}
      <ImportSessionDetail
        open={detailOpen}
        onOpenChange={setDetailOpen}
        selectedSessionId={selectedSessionId}
      />
    </div>
  );
}
