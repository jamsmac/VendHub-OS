"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  FileText,
  Search,
  ExternalLink,
  AlertTriangle,
  Activity,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Lock,
  Globe,
  Hash,
  ArrowLeft,
  X,
  Info,
  AlertCircle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Code2,
  Tag,
  Layers,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Auth handled via httpOnly cookies — credentials: 'include' on fetch calls

// ─── Types ────────────────────────────────────────────────────

interface SwaggerSpec {
  openapi?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  paths?: Record<string, Record<string, SwaggerOperation>>;
  tags?: Array<{ name: string; description?: string }>;
  servers?: Array<{ url: string; description?: string }>;
}

interface SwaggerOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: SwaggerParameter[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: Record<string, unknown> }>;
  };
  responses?: Record<string, { description?: string; content?: unknown }>;
  security?: Array<Record<string, string[]>>;
  deprecated?: boolean;
}

interface SwaggerParameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: Record<string, unknown>;
}

interface EndpointInfo {
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: SwaggerParameter[];
  hasRequestBody: boolean;
  responseStatuses: string[];
  isSecured: boolean;
  deprecated: boolean;
}

interface TagGroup {
  name: string;
  description?: string;
  endpoints: EndpointInfo[];
  errorCount: number;
  deprecatedCount: number;
}

interface HealthStatus {
  status: string;
  info?: Record<string, { status: string }>;
  error?: Record<string, { status: string; message?: string }>;
  details?: Record<string, { status: string; message?: string }>;
}

// ─── Constants ────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const METHOD_COLORS: Record<string, string> = {
  get: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  post: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  put: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  patch:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  delete: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  options: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  head: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

const STATUS_COLORS: Record<string, string> = {
  "2": "text-emerald-600",
  "3": "text-blue-600",
  "4": "text-amber-600",
  "5": "text-red-600",
};

// ─── Helpers ──────────────────────────────────────────────────

function parseSwaggerSpec(spec: SwaggerSpec): {
  endpoints: EndpointInfo[];
  tagGroups: TagGroup[];
  stats: ApiStats;
} {
  const endpoints: EndpointInfo[] = [];
  const tagMap = new Map<string, TagGroup>();

  // Initialize tag groups from spec tags
  if (spec.tags) {
    for (const tag of spec.tags) {
      tagMap.set(tag.name, {
        name: tag.name,
        description: tag.description,
        endpoints: [],
        errorCount: 0,
        deprecatedCount: 0,
      });
    }
  }

  // Parse all paths
  if (spec.paths) {
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (
          ["get", "post", "put", "patch", "delete", "options", "head"].includes(
            method,
          )
        ) {
          const op = operation as SwaggerOperation;
          const endpoint: EndpointInfo = {
            method,
            path,
            operationId: op.operationId,
            summary: op.summary,
            description: op.description,
            tags: op.tags || ["untagged"],
            parameters: op.parameters || [],
            hasRequestBody: !!op.requestBody,
            responseStatuses: Object.keys(op.responses || {}),
            isSecured: !!op.security && op.security.length > 0,
            deprecated: !!op.deprecated,
          };
          endpoints.push(endpoint);

          // Add to tag groups
          for (const tagName of endpoint.tags) {
            if (!tagMap.has(tagName)) {
              tagMap.set(tagName, {
                name: tagName,
                description: undefined,
                endpoints: [],
                errorCount: 0,
                deprecatedCount: 0,
              });
            }
            const group = tagMap.get(tagName)!;
            group.endpoints.push(endpoint);
            if (endpoint.deprecated) group.deprecatedCount++;

            // Count error-class responses (4xx, 5xx)
            const errorResponses = endpoint.responseStatuses.filter(
              (s) => s.startsWith("4") || s.startsWith("5"),
            );
            group.errorCount += errorResponses.length;
          }
        }
      }
    }
  }

  // Calculate stats
  const allResponseStatuses = endpoints.flatMap((e) => e.responseStatuses);
  const errorStatuses = allResponseStatuses.filter(
    (s) => s.startsWith("4") || s.startsWith("5"),
  );
  const statusCounts: Record<string, number> = {};
  for (const status of allResponseStatuses) {
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }

  const methodCounts: Record<string, number> = {};
  for (const ep of endpoints) {
    methodCounts[ep.method] = (methodCounts[ep.method] || 0) + 1;
  }

  const stats: ApiStats = {
    totalEndpoints: endpoints.length,
    totalTags: tagMap.size,
    securedEndpoints: endpoints.filter((e) => e.isSecured).length,
    deprecatedEndpoints: endpoints.filter((e) => e.deprecated).length,
    errorResponseDefs: errorStatuses.length,
    methodCounts,
    statusCounts,
    publicEndpoints: endpoints.filter((e) => !e.isSecured).length,
  };

  const tagGroups = Array.from(tagMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return { endpoints, tagGroups, stats };
}

interface ApiStats {
  totalEndpoints: number;
  totalTags: number;
  securedEndpoints: number;
  deprecatedEndpoints: number;
  errorResponseDefs: number;
  methodCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  publicEndpoints: number;
}

// ─── Component ────────────────────────────────────────────────

export default function ApiDocsPage() {
  const t = useTranslations("apiDocs");
  const [search, setSearch] = useState("");
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointInfo | null>(
    null,
  );
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<string | null>(null);
  const [showStatusBreakdown, setShowStatusBreakdown] = useState(false);

  // ── Fetch Swagger Spec ──────────────────────────────────────
  const {
    data: swaggerSpec,
    isLoading: specLoading,
    error: specError,
    refetch: refetchSpec,
  } = useQuery<SwaggerSpec>({
    queryKey: ["swagger-spec"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/docs-json`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to fetch API spec: ${res.status}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 min
    retry: 2,
  });

  // ── Fetch Health Status ─────────────────────────────────────
  const {
    data: healthData,
    isLoading: healthLoading,
    error: healthError,
  } = useQuery<HealthStatus>({
    queryKey: ["api-health"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/health`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
      return res.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30s
    retry: 1,
  });

  // ── Parse spec ──────────────────────────────────────────────
  const { tagGroups, stats } = useMemo(() => {
    if (!swaggerSpec) {
      return {
        endpoints: [],
        tagGroups: [],
        stats: {
          totalEndpoints: 0,
          totalTags: 0,
          securedEndpoints: 0,
          deprecatedEndpoints: 0,
          errorResponseDefs: 0,
          methodCounts: {},
          statusCounts: {},
          publicEndpoints: 0,
        } as ApiStats,
      };
    }
    return parseSwaggerSpec(swaggerSpec);
  }, [swaggerSpec]);

  // ── Filtered endpoints ──────────────────────────────────────
  const filteredTagGroups = useMemo(() => {
    let groups = tagGroups;

    if (selectedTag) {
      groups = groups.filter((g) => g.name === selectedTag);
    }

    if (!search && !methodFilter) return groups;

    const q = search.toLowerCase();
    return groups
      .map((group) => ({
        ...group,
        endpoints: group.endpoints.filter((ep) => {
          const matchesSearch =
            !q ||
            ep.path.toLowerCase().includes(q) ||
            ep.summary?.toLowerCase().includes(q) ||
            ep.operationId?.toLowerCase().includes(q) ||
            ep.method.toLowerCase().includes(q);
          const matchesMethod = !methodFilter || ep.method === methodFilter;
          return matchesSearch && matchesMethod;
        }),
      }))
      .filter((group) => group.endpoints.length > 0);
  }, [tagGroups, search, methodFilter, selectedTag]);

  // ── Health status helpers ───────────────────────────────────
  const healthServices = useMemo(() => {
    if (!healthData) return [];
    const details = healthData.details || {};
    return Object.entries(details).map(([name, info]) => ({
      name,
      status: info.status,
      message: info.message,
    }));
  }, [healthData]);

  const healthOverall = healthData?.status || "unknown";

  // ── Handlers ────────────────────────────────────────────────
  const toggleTag = useCallback((tagName: string) => {
    setExpandedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagName)) next.delete(tagName);
      else next.add(tagName);
      return next;
    });
  }, []);

  const copyPath = useCallback((path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    toast.success(t("pathCopied"));
    setTimeout(() => setCopiedPath(null), 2000);
  }, []);

  const openSwaggerUI = useCallback(() => {
    window.open(`${API_URL}/docs`, "_blank");
  }, []);

  // ─── Render ─────────────────────────────────────────────────

  if (specLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (specError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h2 className="text-lg font-semibold">{t("loadSpecError")}</h2>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {t("loadSpecErrorHint")}
            </p>
            <Button
              onClick={() => refetchSpec()}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {t("tryAgain")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Code2 className="h-6 w-6 text-primary" />
            API Documentation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {swaggerSpec?.info?.title} v{swaggerSpec?.info?.version} •{" "}
            {stats.totalEndpoints} endpoints
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchSpec()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t("refresh")}
          </Button>
          <Button size="sm" onClick={openSwaggerUI} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Swagger UI
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KpiCard
          icon={<Layers className="h-5 w-5" />}
          label="Endpoints"
          value={stats.totalEndpoints}
          color="text-blue-600"
          bg="bg-blue-50 dark:bg-blue-900/20"
        />
        <KpiCard
          icon={<Tag className="h-5 w-5" />}
          label={t("modules")}
          value={stats.totalTags}
          color="text-purple-600"
          bg="bg-purple-50 dark:bg-purple-900/20"
        />
        <KpiCard
          icon={<Lock className="h-5 w-5" />}
          label={t("secured")}
          value={stats.securedEndpoints}
          color="text-emerald-600"
          bg="bg-emerald-50 dark:bg-emerald-900/20"
        />
        <KpiCard
          icon={<Globe className="h-5 w-5" />}
          label={t("public")}
          value={stats.publicEndpoints}
          color="text-amber-600"
          bg="bg-amber-50 dark:bg-amber-900/20"
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Deprecated"
          value={stats.deprecatedEndpoints}
          color="text-orange-600"
          bg="bg-orange-50 dark:bg-orange-900/20"
        />
        <Button
          variant="ghost"
          onClick={() => setShowStatusBreakdown(true)}
          className="h-auto p-0 text-left"
        >
          <KpiCard
            icon={<BarChart3 className="h-5 w-5" />}
            label={t("errors4xx5xx")}
            value={stats.errorResponseDefs}
            color="text-red-600"
            bg="bg-red-50 dark:bg-red-900/20"
            clickable
          />
        </Button>
      </div>

      {/* ── Health Status Bar ───────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("serviceStatus")}</span>
            </div>
            <HealthBadge status={healthOverall} />
          </div>
          {healthLoading ? (
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-24" />
              ))}
            </div>
          ) : healthError ? (
            <p className="text-sm text-muted-foreground">
              {t("loadServiceStatusError")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {healthServices.map((svc) => (
                <Badge
                  key={svc.name}
                  variant={svc.status === "up" ? "default" : "destructive"}
                  className="gap-1.5 text-xs"
                >
                  {svc.status === "up" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {svc.name}
                </Badge>
              ))}
              {healthServices.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  {t("detailsUnavailable")}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Method Distribution ─────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {t("methodDistribution")}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.methodCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([method, count]) => (
                <Button
                  key={method}
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setMethodFilter((prev) => (prev === method ? null : method))
                  }
                  className={`inline-flex items-center gap-1.5 h-auto px-3 py-1.5 ${
                    METHOD_COLORS[method] || "bg-gray-100 text-gray-800"
                  } ${
                    methodFilter === method
                      ? "ring-2 ring-primary ring-offset-1"
                      : "hover:opacity-80"
                  }`}
                >
                  <span className="uppercase font-bold text-xs">{method}</span>
                  <span className="font-mono">{count}</span>
                </Button>
              ))}
            {methodFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMethodFilter(null)}
                className="gap-1 h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
                {t("reset")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Search & Filters ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {selectedTag && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedTag(null)}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("allModules")}
          </Button>
        )}
      </div>

      {/* ── Endpoint Groups (Tags) ──────────────────────── */}
      <div className="space-y-3">
        {filteredTagGroups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <Search className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">
                {search ? t("endpointsNotFound") : t("noEndpoints")}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTagGroups.map((group) => (
            <TagGroupCard
              key={group.name}
              group={group}
              isExpanded={expandedTags.has(group.name) || !!selectedTag}
              onToggle={() => toggleTag(group.name)}
              onSelectEndpoint={setSelectedEndpoint}
              _onSelectTag={setSelectedTag}
              copiedPath={copiedPath}
              onCopyPath={copyPath}
              _t={t}
            />
          ))
        )}
      </div>

      {/* ── Endpoint Detail Dialog ──────────────────────── */}
      <EndpointDetailDialog
        endpoint={selectedEndpoint}
        onClose={() => setSelectedEndpoint(null)}
        onCopyPath={copyPath}
        copiedPath={copiedPath}
        t={t}
      />

      {/* ── Status Breakdown Dialog ─────────────────────── */}
      <Dialog open={showStatusBreakdown} onOpenChange={setShowStatusBreakdown}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t("httpStatusDistribution")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {Object.entries(stats.statusCounts)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([status, count]) => {
                const prefix = status[0];
                const color = STATUS_COLORS[prefix] || "text-gray-600";
                const label = getStatusLabel(status);
                return (
                  <div
                    key={status}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-mono font-bold text-sm ${color}`}>
                        {status}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {label}
                      </span>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {count}
                    </Badge>
                  </div>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  color,
  bg,
  clickable,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
  clickable?: boolean;
}) {
  return (
    <Card
      className={`${clickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
    >
      <CardContent className="p-4">
        <div className={`inline-flex p-2 rounded-lg ${bg} ${color} mb-2`}>
          {icon}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function HealthBadge({ status }: { status: string }) {
  if (status === "ok" || status === "up") {
    return (
      <Badge className="gap-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Healthy
      </Badge>
    );
  }
  if (status === "error" || status === "down") {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <XCircle className="h-3 w-3" />
        Unhealthy
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1.5">
      <Info className="h-3 w-3" />
      {status}
    </Badge>
  );
}

function TagGroupCard({
  group,
  isExpanded,
  onToggle,
  onSelectEndpoint,
  _onSelectTag,
  copiedPath,
  onCopyPath,
  _t,
}: {
  group: TagGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectEndpoint: (ep: EndpointInfo) => void;
  _onSelectTag: (tag: string) => void;
  copiedPath: string | null;
  onCopyPath: (path: string) => void;
  _t: ReturnType<typeof useTranslations>;
}) {
  return (
    <Card>
      <Button
        variant="ghost"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 h-auto hover:bg-muted/50 text-left rounded-none"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{group.name}</span>
              <Badge variant="secondary" className="text-xs font-mono">
                {group.endpoints.length}
              </Badge>
              {group.deprecatedCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs text-orange-600 border-orange-300"
                >
                  {group.deprecatedCount} deprecated
                </Badge>
              )}
            </div>
            {group.description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {group.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mini method distribution */}
          <div className="hidden sm:flex gap-1">
            {["get", "post", "put", "patch", "delete"].map((m) => {
              const count = group.endpoints.filter(
                (e) => e.method === m,
              ).length;
              if (count === 0) return null;
              return (
                <span
                  key={m}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                    METHOD_COLORS[m] || ""
                  }`}
                >
                  {m[0]}
                  {count}
                </span>
              );
            })}
          </div>
        </div>
      </Button>

      {isExpanded && (
        <div className="border-t">
          {group.endpoints.map((ep, idx) => (
            <Button
              key={`${ep.method}-${ep.path}-${idx}`}
              variant="ghost"
              onClick={() => onSelectEndpoint(ep)}
              className="w-full flex items-center gap-3 px-4 py-2.5 h-auto hover:bg-muted/30 text-left rounded-none border-b last:border-b-0"
            >
              <span
                className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded font-mono min-w-[52px] text-center ${
                  METHOD_COLORS[ep.method] || ""
                }`}
              >
                {ep.method}
              </span>
              <span className="font-mono text-sm flex-1 truncate">
                {ep.path}
              </span>
              {ep.summary && (
                <span className="text-xs text-muted-foreground truncate max-w-[300px] hidden lg:block">
                  {ep.summary}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                {ep.deprecated && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-orange-600 border-orange-300"
                  >
                    deprecated
                  </Badge>
                )}
                {ep.isSecured && (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyPath(ep.path);
                  }}
                  className="h-6 w-6 p-1"
                >
                  {copiedPath === ep.path ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}

function EndpointDetailDialog({
  endpoint,
  onClose,
  onCopyPath,
  copiedPath,
  t,
}: {
  endpoint: EndpointInfo | null;
  onClose: () => void;
  onCopyPath: (path: string) => void;
  copiedPath: string | null;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!endpoint) return null;

  return (
    <Dialog open={!!endpoint} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-bold uppercase px-2 py-1 rounded font-mono ${
                METHOD_COLORS[endpoint.method] || ""
              }`}
            >
              {endpoint.method}
            </span>
            <span className="font-mono text-base">{endpoint.path}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCopyPath(endpoint.path)}
              className="h-7 w-7"
            >
              {copiedPath === endpoint.path ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Summary */}
          {endpoint.summary && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {t("description")}
              </h3>
              <p className="text-sm">{endpoint.summary}</p>
            </div>
          )}

          {/* Full description */}
          {endpoint.description &&
            endpoint.description !== endpoint.summary && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  {t("details")}
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {endpoint.description}
                </p>
              </div>
            )}

          {/* Operation ID */}
          {endpoint.operationId && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Operation ID
              </h3>
              <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                {endpoint.operationId}
              </code>
            </div>
          )}

          {/* Tags */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              {t("modules")}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {endpoint.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Security */}
          <div className="flex items-center gap-2">
            {endpoint.isSecured ? (
              <Badge className="gap-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Lock className="h-3 w-3" />
                {t("authRequired")}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5">
                <Globe className="h-3 w-3" />
                {t("publicEndpoint")}
              </Badge>
            )}
            {endpoint.deprecated && (
              <Badge
                variant="outline"
                className="gap-1.5 text-orange-600 border-orange-300"
              >
                <AlertTriangle className="h-3 w-3" />
                Deprecated
              </Badge>
            )}
          </div>

          {/* Parameters */}
          {endpoint.parameters.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {t("parameters", { count: endpoint.parameters.length })}
              </h3>
              <div className="space-y-1.5">
                {endpoint.parameters.map((param, i) => (
                  <div
                    key={`${param.name}-${i}`}
                    className="flex items-start gap-3 px-3 py-2 rounded-lg bg-muted/50 text-sm"
                  >
                    <code className="font-mono font-medium text-xs bg-background px-1.5 py-0.5 rounded">
                      {param.name}
                    </code>
                    <Badge variant="outline" className="text-[10px]">
                      {param.in}
                    </Badge>
                    {param.required && (
                      <Badge className="text-[10px] bg-red-100 text-red-800">
                        required
                      </Badge>
                    )}
                    {param.description && (
                      <span className="text-xs text-muted-foreground flex-1">
                        {param.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request Body */}
          {endpoint.hasRequestBody && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1.5">
                <FileText className="h-3 w-3" />
                {t("hasRequestBody")}
              </Badge>
            </div>
          )}

          {/* Response Statuses */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {t("possibleResponses")}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {endpoint.responseStatuses.map((status) => {
                const prefix = status[0];
                const color = STATUS_COLORS[prefix] || "text-gray-600";
                return (
                  <Badge
                    key={status}
                    variant="outline"
                    className={`font-mono ${color}`}
                  >
                    {status} {getStatusLabel(status)}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Utility ──────────────────────────────────────────────────

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    "200": "OK",
    "201": "Created",
    "204": "No Content",
    "301": "Moved",
    "302": "Found",
    "400": "Bad Request",
    "401": "Unauthorized",
    "403": "Forbidden",
    "404": "Not Found",
    "409": "Conflict",
    "422": "Unprocessable",
    "429": "Too Many Requests",
    "500": "Server Error",
    "502": "Bad Gateway",
    "503": "Unavailable",
  };
  return labels[status] || "";
}
