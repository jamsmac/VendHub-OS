"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { directoriesApi } from "@/lib/api";
import {
  ArrowLeft,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ApiError = Error & {
  response?: { data?: { message?: string | string[] } };
};

type PageParams = {
  params: Promise<{ id: string }>;
};

const STATUS_KEYS: Record<string, string> = {
  DRAFT: "statusDraft",
  PENDING_APPROVAL: "statusPendingApproval",
  ACTIVE: "statusActive",
  DEPRECATED: "statusDeprecated",
  ARCHIVED: "statusArchived",
};

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  DRAFT: "secondary",
  PENDING_APPROVAL: "outline",
  DEPRECATED: "destructive",
  ARCHIVED: "secondary",
};

const SYNC_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  SUCCESS: "default",
  STARTED: "secondary",
  PARTIAL: "outline",
  FAILED: "destructive",
};

const FIELD_TYPE_KEYS: Record<string, string> = {
  TEXT: "fieldTypeText",
  NUMBER: "fieldTypeNumber",
  DATE: "fieldTypeDate",
  DATETIME: "fieldTypeDatetime",
  BOOLEAN: "fieldTypeBoolean",
  SELECT_SINGLE: "fieldTypeSelectSingle",
  SELECT_MULTI: "fieldTypeSelectMulti",
  REF: "fieldTypeRef",
  JSON: "fieldTypeJson",
  FILE: "fieldTypeFile",
  IMAGE: "fieldTypeImage",
};

interface DirectoryEntry {
  id: string;
  name: string;
  code: string | null;
  origin: string;
  status: string;
}

interface DirectoryField {
  id: string;
  name: string;
  displayName: string;
  fieldType: string;
  isRequired: boolean;
  sortOrder: number;
}

interface DirectorySource {
  id: string;
  name: string;
  sourceType: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  changedAt: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
}

interface SyncLog {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  totalRecords: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
}

export default function DirectoryDetailPage({ params }: PageParams) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("directoryDetail");

  const [entrySearch, setEntrySearch] = useState("");
  const [debouncedEntrySearch, setDebouncedEntrySearch] = useState("");
  const [entryPage, setEntryPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [syncLogPage, setSyncLogPage] = useState(1);
  const [createEntryOpen, setCreateEntryOpen] = useState(false);
  const [newEntryName, setNewEntryName] = useState("");
  const [newEntryCode, setNewEntryCode] = useState("");
  const [newEntryDesc, setNewEntryDesc] = useState("");
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    action: () => void;
  } | null>(null);

  // Debounce entry search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEntrySearch(entrySearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [entrySearch]);

  // Fetch directory
  const { data: dirResponse, isLoading: dirLoading } = useQuery({
    queryKey: ["directory", id],
    queryFn: () => directoriesApi.getById(id),
  });
  const directory = dirResponse?.data;

  // Fetch entries
  const { data: entriesResponse, isLoading: entriesLoading } = useQuery({
    queryKey: ["directory-entries", id, debouncedEntrySearch, entryPage],
    queryFn: () =>
      directoriesApi.getEntries(id, {
        search: debouncedEntrySearch || undefined,
        page: entryPage,
        limit: 20,
      }),
    enabled: !!directory,
  });
  const entriesData = entriesResponse?.data;
  const entries = entriesData?.data ?? [];
  const entriesTotalPages = entriesData?.totalPages ?? 1;

  // Fetch sources
  const { data: sourcesResponse } = useQuery({
    queryKey: ["directory-sources", id],
    queryFn: () => directoriesApi.getSources(id),
    enabled: !!directory,
  });
  const sources = sourcesResponse?.data?.data ?? [];

  // Fetch audit logs
  const { data: auditResponse } = useQuery({
    queryKey: ["directory-audit", id, auditPage],
    queryFn: () =>
      directoriesApi.getAuditLogs(id, { page: auditPage, limit: 20 }),
    enabled: !!directory,
  });
  const auditData = auditResponse?.data;
  const auditLogs = auditData?.data ?? [];
  const auditTotalPages = auditData?.totalPages ?? 1;

  // Fetch sync logs
  const { data: syncResponse } = useQuery({
    queryKey: ["directory-sync-logs", id, syncLogPage],
    queryFn: () =>
      directoriesApi.getSyncLogs(id, { page: syncLogPage, limit: 20 }),
    enabled: !!directory,
  });
  const syncData = syncResponse?.data;
  const syncLogs = syncData?.data ?? [];
  const syncTotalPages = syncData?.totalPages ?? 1;

  // Create entry
  const createEntryMutation = useMutation({
    mutationFn: (data: { name: string; code?: string; description?: string }) =>
      directoriesApi.createEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["directory-entries", id] });
      setCreateEntryOpen(false);
      setNewEntryName("");
      setNewEntryCode("");
      setNewEntryDesc("");
      toast.success(t("toastEntryCreated"));
    },
    onError: (error: ApiError) => {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        t("toastEntryCreateError");
      toast.error(msg);
    },
  });

  // Delete entry
  const deleteEntryMutation = useMutation({
    mutationFn: (entryId: string) => directoriesApi.deleteEntry(id, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["directory-entries", id] });
      setEntryToDelete(null);
      toast.success(t("toastEntryDeleted"));
    },
    onError: (error: ApiError) => {
      setEntryToDelete(null);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        t("toastDeleteError");
      toast.error(msg);
    },
  });

  // Confirm and delete entry
  const handleDeleteEntry = useCallback(
    (entryId: string) => {
      setConfirmState({
        title: t("confirmDeleteEntry"),
        action: () => {
          setEntryToDelete(entryId);
          deleteEntryMutation.mutate(entryId);
        },
      });
    },
    [deleteEntryMutation, t],
  );

  // Trigger sync
  const syncMutation = useMutation({
    mutationFn: (sourceId: string) => {
      setSyncingSourceId(sourceId);
      return directoriesApi.triggerSync(id, sourceId);
    },
    onSuccess: () => {
      setSyncingSourceId(null);
      queryClient.invalidateQueries({ queryKey: ["directory-sources", id] });
      queryClient.invalidateQueries({ queryKey: ["directory-sync-logs", id] });
      queryClient.invalidateQueries({ queryKey: ["directory-entries", id] });
      toast.success(t("toastSyncStarted"));
    },
    onError: (error: ApiError) => {
      setSyncingSourceId(null);
      const msg =
        error?.response?.data?.message || error?.message || t("toastSyncError");
      toast.error(msg);
    },
  });

  if (dirLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!directory) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <p className="text-lg font-medium">{t("notFound")}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard/directories")}
        >
          {t("backToList")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/directories")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{directory.name}</h1>
          <p className="text-sm text-muted-foreground">{directory.slug}</p>
        </div>
        <div className="flex gap-2">
          <Badge>{directory.type}</Badge>
          <Badge variant="secondary">{directory.scope}</Badge>
          {directory.isSystem && <Badge variant="outline">{t("system")}</Badge>}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">{t("tabEntries")}</TabsTrigger>
          <TabsTrigger value="fields">{t("tabFields")}</TabsTrigger>
          <TabsTrigger value="sources">{t("tabSources")}</TabsTrigger>
          <TabsTrigger value="audit">{t("tabAudit")}</TabsTrigger>
          <TabsTrigger value="sync-logs">{t("tabSyncLogs")}</TabsTrigger>
        </TabsList>

        {/* ENTRIES TAB */}
        <TabsContent value="entries" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("searchEntries")}
                value={entrySearch}
                onChange={(e) => {
                  setEntrySearch(e.target.value);
                  setEntryPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setCreateEntryOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("addEntry")}
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colName")}</TableHead>
                  <TableHead>{t("colCode")}</TableHead>
                  <TableHead>{t("colOrigin")}</TableHead>
                  <TableHead>{t("colStatus")}</TableHead>
                  <TableHead className="w-[100px]">{t("colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entriesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {t("noEntries")}
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry: DirectoryEntry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.code || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.origin === "OFFICIAL"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {entry.origin === "OFFICIAL"
                            ? t("originOfficial")
                            : t("originLocal")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={STATUS_VARIANTS[entry.status] || "secondary"}
                        >
                          {STATUS_KEYS[entry.status]
                            ? t(STATUS_KEYS[entry.status])
                            : entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={entryToDelete === entry.id}
                          onClick={() => handleDeleteEntry(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {entriesTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={entryPage <= 1}
                onClick={() => setEntryPage((p) => p - 1)}
              >
                {t("paginationPrev")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("paginationInfo", {
                  page: entryPage,
                  total: entriesTotalPages,
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={entryPage >= entriesTotalPages}
                onClick={() => setEntryPage((p) => p + 1)}
              >
                {t("paginationNext")}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* FIELDS TAB */}
        <TabsContent value="fields" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("fieldColName")}</TableHead>
                  <TableHead>{t("fieldColDisplay")}</TableHead>
                  <TableHead>{t("fieldColType")}</TableHead>
                  <TableHead>{t("fieldColRequired")}</TableHead>
                  <TableHead>{t("fieldColOrder")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {directory.fields && directory.fields.length > 0 ? (
                  directory.fields.map((field: DirectoryField) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-mono text-sm">
                        {field.name}
                      </TableCell>
                      <TableCell>{field.displayName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {FIELD_TYPE_KEYS[field.fieldType]
                            ? t(FIELD_TYPE_KEYS[field.fieldType])
                            : field.fieldType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {field.isRequired ? (
                          <Badge variant="destructive">{t("yes")}</Badge>
                        ) : (
                          <span className="text-muted-foreground">
                            {t("no")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{field.sortOrder}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {t("noFields")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* SOURCES TAB */}
        <TabsContent value="sources" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sourceColName")}</TableHead>
                  <TableHead>{t("sourceColType")}</TableHead>
                  <TableHead>{t("sourceColStatus")}</TableHead>
                  <TableHead>{t("sourceColLastSync")}</TableHead>
                  <TableHead>{t("sourceColResult")}</TableHead>
                  <TableHead className="w-[120px]">{t("colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {t("noSources")}
                    </TableCell>
                  </TableRow>
                ) : (
                  sources.map((source: DirectorySource) => (
                    <TableRow key={source.id}>
                      <TableCell className="font-medium">
                        {source.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{source.sourceType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={source.isActive ? "default" : "secondary"}
                        >
                          {source.isActive
                            ? t("sourceActive")
                            : t("sourceInactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {source.lastSyncAt
                          ? new Date(source.lastSyncAt).toLocaleString("ru-RU")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {source.lastSyncStatus && (
                          <Badge
                            variant={
                              SYNC_STATUS_VARIANTS[source.lastSyncStatus] ||
                              "secondary"
                            }
                          >
                            {source.lastSyncStatus}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            !source.isActive || syncingSourceId === source.id
                          }
                          onClick={() => syncMutation.mutate(source.id)}
                        >
                          {syncingSourceId === source.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-1 h-3 w-3" />
                          )}
                          {t("syncButton")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* AUDIT TAB */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("auditColAction")}</TableHead>
                  <TableHead>{t("auditColDate")}</TableHead>
                  <TableHead>{t("auditColOldValues")}</TableHead>
                  <TableHead>{t("auditColNewValues")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {t("noAuditLogs")}
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log: AuditLog) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(log.changedAt).toLocaleString("ru-RU")}
                      </TableCell>
                      <TableCell className="text-xs font-mono max-w-[200px] truncate">
                        {log.oldValues ? JSON.stringify(log.oldValues) : "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono max-w-[200px] truncate">
                        {log.newValues ? JSON.stringify(log.newValues) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {auditTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={auditPage <= 1}
                onClick={() => setAuditPage((p) => p - 1)}
              >
                {t("paginationPrev")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("paginationInfo", {
                  page: auditPage,
                  total: auditTotalPages,
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={auditPage >= auditTotalPages}
                onClick={() => setAuditPage((p) => p + 1)}
              >
                {t("paginationNext")}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* SYNC LOGS TAB */}
        <TabsContent value="sync-logs" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("syncColStatus")}</TableHead>
                  <TableHead>{t("syncColStart")}</TableHead>
                  <TableHead>{t("syncColEnd")}</TableHead>
                  <TableHead>{t("syncColTotal")}</TableHead>
                  <TableHead>{t("syncColCreated")}</TableHead>
                  <TableHead>{t("syncColUpdated")}</TableHead>
                  <TableHead>{t("syncColErrors")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {t("noSyncLogs")}
                    </TableCell>
                  </TableRow>
                ) : (
                  syncLogs.map((log: SyncLog) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge
                          variant={
                            SYNC_STATUS_VARIANTS[log.status] || "secondary"
                          }
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(log.startedAt).toLocaleString("ru-RU")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.finishedAt
                          ? new Date(log.finishedAt).toLocaleString("ru-RU")
                          : "—"}
                      </TableCell>
                      <TableCell>{log.totalRecords}</TableCell>
                      <TableCell className="text-green-600">
                        {log.createdCount}
                      </TableCell>
                      <TableCell className="text-blue-600">
                        {log.updatedCount}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {log.errorCount}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {syncTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={syncLogPage <= 1}
                onClick={() => setSyncLogPage((p) => p - 1)}
              >
                {t("paginationPrev")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("paginationInfo", {
                  page: syncLogPage,
                  total: syncTotalPages,
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={syncLogPage >= syncTotalPages}
                onClick={() => setSyncLogPage((p) => p + 1)}
              >
                {t("paginationNext")}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Entry Dialog */}
      <Dialog open={createEntryOpen} onOpenChange={setCreateEntryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createEntryTitle")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newEntryName.trim()) return;
              createEntryMutation.mutate({
                name: newEntryName.trim(),
                code: newEntryCode.trim() || undefined,
                description: newEntryDesc.trim() || undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>{t("labelNameRequired")}</Label>
              <Input
                value={newEntryName}
                onChange={(e) => setNewEntryName(e.target.value)}
                placeholder={t("placeholderName")}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>{t("labelCode")}</Label>
              <Input
                value={newEntryCode}
                onChange={(e) => setNewEntryCode(e.target.value)}
                placeholder={t("placeholderCode")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("labelDescription")}</Label>
              <Input
                value={newEntryDesc}
                onChange={(e) => setNewEntryDesc(e.target.value)}
                placeholder={t("placeholderDescription")}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateEntryOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={!newEntryName.trim() || createEntryMutation.isPending}
              >
                {createEntryMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
