"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ShieldAlert,
  Clock,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { alertsApi } from "@/lib/api";

// --- Types ---

type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";
type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";

interface AlertRule {
  id: string;
  name: string;
  description?: string;
  metric: string;
  condition: string;
  threshold: number;
  thresholdMax?: number;
  severity: AlertSeverity;
  machineId?: string | null;
  notifyChannels?: string[];
  notifyUserIds?: string[];
  cooldownMinutes: number;
  isActive: boolean;
  createdAt: string;
}

interface AlertHistory {
  id: string;
  ruleId: string;
  ruleName?: string;
  machineId?: string | null;
  machineName?: string;
  triggeredAt: string;
  value: number;
  threshold: number;
  severity: AlertSeverity;
  status: AlertStatus;
  acknowledgedByUserId?: string | null;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  message?: string;
}

// --- Severity / Status config ---

const severityColors: Record<AlertSeverity, string> = {
  INFO: "bg-blue-500/10 text-blue-500",
  WARNING: "bg-amber-500/10 text-amber-500",
  CRITICAL: "bg-red-500/10 text-red-500",
};

const severityIcons: Record<AlertSeverity, React.ReactNode> = {
  INFO: <Info className="w-3.5 h-3.5" />,
  WARNING: <AlertTriangle className="w-3.5 h-3.5" />,
  CRITICAL: <AlertCircle className="w-3.5 h-3.5" />,
};

const statusColors: Record<AlertStatus, string> = {
  ACTIVE: "bg-red-500/10 text-red-500",
  ACKNOWLEDGED: "bg-amber-500/10 text-amber-500",
  RESOLVED: "bg-green-500/10 text-green-500",
  DISMISSED: "bg-muted text-muted-foreground",
};

const ALERT_METRICS = [
  "temperature",
  "stock_level",
  "sales_drop",
  "revenue",
  "error_rate",
  "offline_duration",
  "collection_needed",
  "maintenance_due",
];

const ALERT_CONDITIONS = [
  "greater_than",
  "less_than",
  "equals",
  "not_equals",
  "between",
];

// --- Main Page ---

export default function AlertsPage() {
  const t = useTranslations("alerts");
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("rules");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // --- Queries ---

  const {
    data: rules,
    isLoading: rulesLoading,
    isError: rulesError,
  } = useQuery<AlertRule[]>({
    queryKey: ["alert-rules", debouncedSearch, severityFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (severityFilter !== "all") params.severity = severityFilter;
      const res = await alertsApi.getRules(params);
      return res.data;
    },
    enabled: activeTab === "rules",
  });

  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
  } = useQuery<AlertHistory[]>({
    queryKey: ["alert-history", severityFilter, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (severityFilter !== "all") params.severity = severityFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await alertsApi.getHistory(params);
      return res.data;
    },
    enabled: activeTab === "history",
  });

  const { data: activeAlerts } = useQuery<AlertHistory[]>({
    queryKey: ["alert-active"],
    queryFn: async () => {
      const res = await alertsApi.getActive();
      return res.data;
    },
  });

  // --- Mutations ---

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => alertsApi.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      toast.success(t("messages.deleted"));
    },
    onError: () => toast.error(t("messages.deleteFailed")),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => alertsApi.acknowledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-history"] });
      queryClient.invalidateQueries({ queryKey: ["alert-active"] });
      toast.success(t("messages.acknowledged"));
    },
    onError: () => toast.error(t("messages.actionFailed")),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => alertsApi.resolve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-history"] });
      queryClient.invalidateQueries({ queryKey: ["alert-active"] });
      toast.success(t("messages.resolved"));
    },
    onError: () => toast.error(t("messages.actionFailed")),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => alertsApi.dismiss(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-history"] });
      queryClient.invalidateQueries({ queryKey: ["alert-active"] });
      toast.success(t("messages.dismissed"));
    },
    onError: () => toast.error(t("messages.actionFailed")),
  });

  // --- Stats ---
  const activeCount = activeAlerts?.length || 0;
  const criticalCount =
    activeAlerts?.filter((a) => a.severity === "CRITICAL").length || 0;
  const rulesCount = rules?.length || 0;
  const activeRulesCount = rules?.filter((r) => r.isActive).length || 0;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        {activeTab === "rules" && (
          <Dialog
            open={isCreateDialogOpen || !!editingRule}
            onOpenChange={(open) => {
              if (!open) {
                setIsCreateDialogOpen(false);
                setEditingRule(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("createRule")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? t("editRule") : t("createRule")}
                </DialogTitle>
              </DialogHeader>
              <AlertRuleForm
                rule={editingRule || undefined}
                onSuccess={() => {
                  setIsCreateDialogOpen(false);
                  setEditingRule(null);
                  queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-sm text-muted-foreground">
                {t("statsActive")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{criticalCount}</p>
              <p className="text-sm text-muted-foreground">
                {t("statsCritical")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rulesCount}</p>
              <p className="text-sm text-muted-foreground">{t("statsRules")}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeRulesCount}</p>
              <p className="text-sm text-muted-foreground">
                {t("statsActiveRules")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules">{t("tabs.rules")}</TabsTrigger>
          <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
        </TabsList>

        {/* --- Tab 1: Rules --- */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  {t("filterSeverity")}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSeverityFilter("all")}>
                  {t("allSeverities")}
                </DropdownMenuItem>
                {(["INFO", "WARNING", "CRITICAL"] as AlertSeverity[]).map(
                  (s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => setSeverityFilter(s)}
                    >
                      {t(`severity.${s}`)}
                    </DropdownMenuItem>
                  ),
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Rules Table */}
          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colName")}</TableHead>
                  <TableHead>{t("colMetric")}</TableHead>
                  <TableHead>{t("colCondition")}</TableHead>
                  <TableHead>{t("colThreshold")}</TableHead>
                  <TableHead>{t("colSeverity")}</TableHead>
                  <TableHead>{t("colMachine")}</TableHead>
                  <TableHead>{t("colActive")}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rulesLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rulesError ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-destructive"
                    >
                      {t("loadFailed")}
                    </TableCell>
                  </TableRow>
                ) : rules?.length ? (
                  rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          {rule.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {rule.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">
                          {t(`metric.${rule.metric}`, {
                            defaultValue: rule.metric,
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {t(`condition.${rule.condition}`, {
                            defaultValue: rule.condition,
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{rule.threshold}</span>
                        {rule.thresholdMax != null && (
                          <span className="text-muted-foreground">
                            {" "}
                            – {rule.thresholdMax}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`gap-1 ${severityColors[rule.severity]}`}
                        >
                          {severityIcons[rule.severity]}
                          {t(`severity.${rule.severity}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rule.machineId ? (
                          <span className="text-sm font-mono">
                            {rule.machineId}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {t("allMachines")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch checked={rule.isActive} disabled />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("actionsLabel")}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setEditingRule(rule)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              {t("actionEdit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteRuleMutation.mutate(rule.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t("actionDelete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">{t("noRules")}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* --- Tab 2: History --- */}
        <TabsContent value="history" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  {t("filterSeverity")}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSeverityFilter("all")}>
                  {t("allSeverities")}
                </DropdownMenuItem>
                {(["INFO", "WARNING", "CRITICAL"] as AlertSeverity[]).map(
                  (s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => setSeverityFilter(s)}
                    >
                      {t(`severity.${s}`)}
                    </DropdownMenuItem>
                  ),
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  {t("filterStatus")}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                  {t("allStatuses")}
                </DropdownMenuItem>
                {(
                  [
                    "ACTIVE",
                    "ACKNOWLEDGED",
                    "RESOLVED",
                    "DISMISSED",
                  ] as AlertStatus[]
                ).map((s) => (
                  <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
                    {t(`status.${s}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* History Table */}
          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colRuleName")}</TableHead>
                  <TableHead>{t("colMachine")}</TableHead>
                  <TableHead>{t("colSeverity")}</TableHead>
                  <TableHead>{t("colStatus")}</TableHead>
                  <TableHead>{t("colTriggeredAt")}</TableHead>
                  <TableHead>{t("colValue")}</TableHead>
                  <TableHead>{t("colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : historyError ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-destructive"
                    >
                      {t("loadFailed")}
                    </TableCell>
                  </TableRow>
                ) : history?.length ? (
                  history.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {alert.ruleName || alert.ruleId}
                          </p>
                          {alert.message && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {alert.message}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {alert.machineName || alert.machineId ? (
                          <span className="text-sm">
                            {alert.machineName || alert.machineId}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`gap-1 ${severityColors[alert.severity]}`}
                        >
                          {severityIcons[alert.severity]}
                          {t(`severity.${alert.severity}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[alert.status]}>
                          {t(`status.${alert.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(alert.triggeredAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{alert.value}</span>
                        <span className="text-muted-foreground text-sm ml-1">
                          / {alert.threshold}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {alert.status === "ACTIVE" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={acknowledgeMutation.isPending}
                                onClick={() =>
                                  acknowledgeMutation.mutate(alert.id)
                                }
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {t("actionAcknowledge")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-destructive"
                                disabled={dismissMutation.isPending}
                                onClick={() => dismissMutation.mutate(alert.id)}
                              >
                                {t("actionDismiss")}
                              </Button>
                            </>
                          )}
                          {alert.status === "ACKNOWLEDGED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-green-600"
                              disabled={resolveMutation.isPending}
                              onClick={() => resolveMutation.mutate(alert.id)}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {t("actionResolve")}
                            </Button>
                          )}
                          {(alert.status === "RESOLVED" ||
                            alert.status === "DISMISSED") && (
                            <span className="text-xs text-muted-foreground">
                              {alert.status === "RESOLVED"
                                ? formatDate(alert.resolvedAt!)
                                : "—"}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">{t("noHistory")}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Alert Rule Form ---

function AlertRuleForm({
  rule,
  onSuccess,
}: {
  rule?: AlertRule;
  onSuccess: () => void;
}) {
  const t = useTranslations("alerts");
  const [formData, setFormData] = useState({
    name: rule?.name || "",
    description: rule?.description || "",
    metric: rule?.metric || ALERT_METRICS[0],
    condition: rule?.condition || ALERT_CONDITIONS[0],
    threshold: rule?.threshold?.toString() || "",
    thresholdMax: rule?.thresholdMax?.toString() || "",
    severity: (rule?.severity || "WARNING") as AlertSeverity,
    machineId: rule?.machineId || "",
    cooldownMinutes: rule?.cooldownMinutes?.toString() || "30",
    isActive: rule?.isActive ?? true,
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        metric: data.metric,
        condition: data.condition,
        threshold: parseFloat(data.threshold),
        thresholdMax: data.thresholdMax
          ? parseFloat(data.thresholdMax)
          : undefined,
        severity: data.severity,
        machineId: data.machineId || null,
        cooldownMinutes: parseInt(data.cooldownMinutes, 10),
        isActive: data.isActive,
      };
      if (rule) {
        return alertsApi.updateRule(rule.id, payload);
      }
      return alertsApi.createRule(payload);
    },
    onSuccess: () => {
      toast.success(rule ? t("messages.updated") : t("messages.created"));
      onSuccess();
    },
    onError: () => {
      toast.error(t("messages.saveFailed"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const showThresholdMax = formData.condition === "between";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">{t("formName")}</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t("formDescription")}</label>
        <Textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="h-16 resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t("formMetric")}</label>
          <Select
            value={formData.metric}
            onValueChange={(v) => setFormData({ ...formData, metric: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALERT_METRICS.map((m) => (
                <SelectItem key={m} value={m}>
                  {t(`metric.${m}`, { defaultValue: m })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">{t("formCondition")}</label>
          <Select
            value={formData.condition}
            onValueChange={(v) => setFormData({ ...formData, condition: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALERT_CONDITIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`condition.${c}`, { defaultValue: c })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t("formThreshold")}</label>
          <Input
            type="number"
            value={formData.threshold}
            onChange={(e) =>
              setFormData({ ...formData, threshold: e.target.value })
            }
            required
          />
        </div>
        {showThresholdMax && (
          <div>
            <label className="text-sm font-medium">
              {t("formThresholdMax")}
            </label>
            <Input
              type="number"
              value={formData.thresholdMax}
              onChange={(e) =>
                setFormData({ ...formData, thresholdMax: e.target.value })
              }
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t("formSeverity")}</label>
          <Select
            value={formData.severity}
            onValueChange={(v) =>
              setFormData({ ...formData, severity: v as AlertSeverity })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["INFO", "WARNING", "CRITICAL"] as AlertSeverity[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`severity.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">{t("formCooldown")}</label>
          <Input
            type="number"
            value={formData.cooldownMinutes}
            onChange={(e) =>
              setFormData({ ...formData, cooldownMinutes: e.target.value })
            }
            min={1}
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">{t("formMachineId")}</label>
        <Input
          value={formData.machineId}
          onChange={(e) =>
            setFormData({ ...formData, machineId: e.target.value })
          }
          placeholder={t("formMachineIdPlaceholder")}
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          checked={formData.isActive}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, isActive: checked })
          }
          id="isActive"
        />
        <label
          htmlFor="isActive"
          className="text-sm font-medium cursor-pointer"
        >
          {t("formIsActive")}
        </label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? t("formSaving")
            : rule
              ? t("formUpdate")
              : t("formCreate")}
        </Button>
      </div>
    </form>
  );
}
