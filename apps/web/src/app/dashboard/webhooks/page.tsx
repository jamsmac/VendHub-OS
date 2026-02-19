"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Webhook as WebhookIcon,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  Send,
  FileText,
  Copy,
  Check,
  ChevronDown,
  AlertTriangle,
  Activity,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { webhooksApi } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  description?: string;
  is_active: boolean;
  last_triggered_at?: string | null;
  failure_count: number;
  created_at: string;
}

interface WebhookLog {
  id: string;
  event: string;
  status_code: number;
  success: boolean;
  duration_ms: number;
  created_at: string;
  error?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const ALL_EVENTS = [
  "MACHINE_STATUS_CHANGED",
  "INVENTORY_LOW",
  "TASK_CREATED",
  "TASK_COMPLETED",
  "SALE_COMPLETED",
  "PAYMENT_RECEIVED",
] as const;

type EventType = (typeof ALL_EVENTS)[number];

const eventColorMap: Record<EventType, string> = {
  MACHINE_STATUS_CHANGED: "bg-blue-500/10 text-blue-500",
  INVENTORY_LOW: "bg-amber-500/10 text-amber-500",
  TASK_CREATED: "bg-purple-500/10 text-purple-500",
  TASK_COMPLETED: "bg-green-500/10 text-green-500",
  SALE_COMPLETED: "bg-cyan-500/10 text-cyan-500",
  PAYMENT_RECEIVED: "bg-emerald-500/10 text-emerald-500",
};

const eventKeyMap: Record<EventType, string> = {
  MACHINE_STATUS_CHANGED: "event_machine_status",
  INVENTORY_LOW: "event_inventory_low",
  TASK_CREATED: "event_task_created",
  TASK_COMPLETED: "event_task_completed",
  SALE_COMPLETED: "event_sale_completed",
  PAYMENT_RECEIVED: "event_payment_received",
};

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function WebhooksPage() {
  const t = useTranslations("webhooks");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editWebhook, setEditWebhook] = useState<Webhook | null>(null);
  const [logsWebhook, setLogsWebhook] = useState<Webhook | null>(null);
  const [secretData, setSecretData] = useState<{
    id: string;
    secret: string;
  } | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Queries ──────────────────────────────────────────────────────────────

  const {
    data: webhooks,
    isLoading,
    isError,
  } = useQuery<Webhook[]>({
    queryKey: ["webhooks", debouncedSearch, activeFilter, eventFilter],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (activeFilter !== "all") params.is_active = activeFilter;
      if (eventFilter !== "all") params.event = eventFilter;
      return webhooksApi.getAll(params);
    },
  });

  // ── Mutations ────────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: string) => webhooksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success(t("msg_deleted"));
    },
    onError: () => toast.error(t("msg_delete_failed")),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      webhooksApi.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: () => toast.error(t("msg_update_failed")),
  });

  const regenerateMutation = useMutation({
    mutationFn: (id: string) => webhooksApi.regenerateSecret(id),
    onSuccess: (data: { secret: string }, id: string) => {
      setSecretData({ id, secret: data.secret });
      toast.success(t("msg_secret_regenerated"));
    },
    onError: () => toast.error(t("msg_regenerate_failed")),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => webhooksApi.test(id),
    onSuccess: () => toast.success(t("msg_test_sent")),
    onError: () => toast.error(t("msg_test_failed")),
  });

  // ── Stats ────────────────────────────────────────────────────────────────

  const total = webhooks?.length ?? 0;
  const activeCount = webhooks?.filter((w) => w.is_active).length ?? 0;
  const failingCount = webhooks?.filter((w) => w.failure_count > 0).length ?? 0;

  // ── Helpers ──────────────────────────────────────────────────────────────

  const formatDate = (iso?: string | null) => {
    if (!iso) return "—";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  };

  const truncateUrl = (url: string, max = 50) =>
    url.length > max ? url.slice(0, max) + "…" : url;

  const handleDelete = (webhook: Webhook) => {
    if (confirm(t("msg_confirm_delete"))) {
      deleteMutation.mutate(webhook.id);
    }
  };

  const handleCopySecret = async () => {
    if (!secretData) return;
    await navigator.clipboard.writeText(secretData.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  // ── Error state ──────────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{t("load_error")}</p>
        <p className="text-muted-foreground mb-4">{t("load_failed")}</p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["webhooks"] })
          }
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t("create_webhook")}
        </Button>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <WebhookIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-sm text-muted-foreground">
                {t("stats_total")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-sm text-muted-foreground">
                {t("stats_active")}
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
              <p className="text-2xl font-bold">{failingCount}</p>
              <p className="text-sm text-muted-foreground">
                {t("stats_failing")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Active filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              {t("filter_status")}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setActiveFilter("all")}>
              {t("filter_all")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveFilter("true")}>
              {t("filter_active")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveFilter("false")}>
              {t("filter_inactive")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Event filter */}
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filter_event")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter_all_events")}</SelectItem>
            {ALL_EVENTS.map((ev) => (
              <SelectItem key={ev} value={ev}>
                {t(eventKeyMap[ev])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("col_url")}</TableHead>
              <TableHead>{t("col_events")}</TableHead>
              <TableHead>{t("col_active")}</TableHead>
              <TableHead>{t("col_last_triggered")}</TableHead>
              <TableHead>{t("col_failures")}</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : webhooks?.length ? (
              webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  {/* URL + description */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <WebhookIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p
                          className="font-mono text-sm font-medium"
                          title={webhook.url}
                        >
                          {truncateUrl(webhook.url)}
                        </p>
                        {webhook.description && (
                          <p className="text-xs text-muted-foreground">
                            {webhook.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Events */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.slice(0, 2).map((ev) => (
                        <Badge
                          key={ev}
                          className={
                            eventColorMap[ev as EventType] ??
                            "bg-muted text-muted-foreground"
                          }
                        >
                          {t(eventKeyMap[ev as EventType] ?? ev)}
                        </Badge>
                      ))}
                      {webhook.events.length > 2 && (
                        <Badge className="bg-muted text-muted-foreground">
                          +{webhook.events.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Active toggle */}
                  <TableCell>
                    <Switch
                      checked={webhook.is_active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({
                          id: webhook.id,
                          is_active: checked,
                        })
                      }
                      disabled={toggleActiveMutation.isPending}
                    />
                  </TableCell>

                  {/* Last triggered */}
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3 shrink-0" />
                      {formatDate(webhook.last_triggered_at)}
                    </div>
                  </TableCell>

                  {/* Failure count */}
                  <TableCell>
                    {webhook.failure_count > 0 ? (
                      <Badge className="bg-red-500/10 text-red-500">
                        {webhook.failure_count}
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500/10 text-green-500">
                        0
                      </Badge>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("actions_label")}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditWebhook(webhook)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {t("action_edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => testMutation.mutate(webhook.id)}
                          disabled={testMutation.isPending}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {t("action_test")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => regenerateMutation.mutate(webhook.id)}
                          disabled={regenerateMutation.isPending}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {t("action_regenerate_secret")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setLogsWebhook(webhook)}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          {t("action_view_logs")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(webhook)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t("action_delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <WebhookIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">{t("not_found")}</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Create dialog ─────────────────────────────────────────────── */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("create_webhook")}</DialogTitle>
          </DialogHeader>
          <WebhookForm
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["webhooks"] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ───────────────────────────────────────────────── */}
      <Dialog
        open={!!editWebhook}
        onOpenChange={(open) => !open && setEditWebhook(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("edit_webhook")}</DialogTitle>
          </DialogHeader>
          {editWebhook && (
            <WebhookForm
              webhook={editWebhook}
              onSuccess={() => {
                setEditWebhook(null);
                queryClient.invalidateQueries({ queryKey: ["webhooks"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Regenerated secret dialog ─────────────────────────────────── */}
      <Dialog
        open={!!secretData}
        onOpenChange={(open) => !open && setSecretData(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("secret_dialog_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("secret_dialog_hint")}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted rounded-md px-3 py-2 text-sm font-mono break-all">
                {secretData?.secret}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopySecret}
                title={t("copy_secret")}
              >
                {copiedSecret ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setSecretData(null)}>{t("close")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Logs dialog ───────────────────────────────────────────────── */}
      {logsWebhook && (
        <WebhookLogsDialog
          webhook={logsWebhook}
          onClose={() => setLogsWebhook(null)}
        />
      )}
    </div>
  );
}

// ─── Webhook Form ───────────────────────────────────────────────────────────

function WebhookForm({
  webhook,
  onSuccess,
}: {
  webhook?: Webhook;
  onSuccess: () => void;
}) {
  const t = useTranslations("webhooks");

  const [url, setUrl] = useState(webhook?.url ?? "");
  const [description, setDescription] = useState(webhook?.description ?? "");
  const [isActive, setIsActive] = useState(webhook?.is_active ?? true);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    webhook?.events ?? [],
  );

  const mutation = useMutation({
    mutationFn: (data: {
      url: string;
      description: string;
      is_active: boolean;
      events: string[];
    }) => {
      if (webhook) {
        return webhooksApi.update(webhook.id, data);
      }
      return webhooksApi.create(data);
    },
    onSuccess: () => {
      toast.success(webhook ? t("msg_updated") : t("msg_created"));
      onSuccess();
    },
    onError: () => toast.error(t("msg_save_error")),
  });

  const toggleEvent = (ev: string) => {
    setSelectedEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error(t("form_url_required"));
      return;
    }
    if (selectedEvents.length === 0) {
      toast.error(t("form_events_required"));
      return;
    }
    mutation.mutate({
      url: url.trim(),
      description,
      is_active: isActive,
      events: selectedEvents,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* URL */}
      <div>
        <label className="text-sm font-medium">{t("form_url")}</label>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/webhook"
          type="url"
          required
          className="mt-1 font-mono text-sm"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium">{t("form_description")}</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("form_description_placeholder")}
          className="mt-1 h-20 resize-none"
        />
      </div>

      {/* Events multi-select */}
      <div>
        <label className="text-sm font-medium">{t("form_events")}</label>
        <p className="text-xs text-muted-foreground mb-2">
          {t("form_events_hint")}
        </p>
        <div className="grid grid-cols-1 gap-2">
          {ALL_EVENTS.map((ev) => {
            const selected = selectedEvents.includes(ev);
            return (
              <button
                key={ev}
                type="button"
                onClick={() => toggleEvent(ev)}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/40"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    selected
                      ? "bg-primary border-primary"
                      : "border-muted-foreground/40"
                  }`}
                >
                  {selected && (
                    <Check className="w-3 h-3 text-primary-foreground" />
                  )}
                </div>
                <Badge
                  className={`text-xs pointer-events-none ${eventColorMap[ev]}`}
                >
                  {t(eventKeyMap[ev])}
                </Badge>
                <span className="text-muted-foreground font-mono text-xs">
                  {ev}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active toggle */}
      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-sm font-medium">{t("form_active")}</p>
          <p className="text-xs text-muted-foreground">
            {t("form_active_hint")}
          </p>
        </div>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? t("form_saving")
            : webhook
              ? t("form_update")
              : t("form_create")}
        </Button>
      </div>
    </form>
  );
}

// ─── Webhook Logs Dialog ────────────────────────────────────────────────────

function WebhookLogsDialog({
  webhook,
  onClose,
}: {
  webhook: Webhook;
  onClose: () => void;
}) {
  const t = useTranslations("webhooks");
  const [showUrl, setShowUrl] = useState(false);

  const { data: logs, isLoading } = useQuery<WebhookLog[]>({
    queryKey: ["webhook-logs", webhook.id],
    queryFn: () => webhooksApi.getLogs(webhook.id, { limit: 50 }),
  });

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(iso));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("logs_title")}</DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <code
              className="text-xs text-muted-foreground font-mono"
              title={webhook.url}
            >
              {showUrl ? webhook.url : truncateUrlStatic(webhook.url, 60)}
            </code>
            <button
              type="button"
              onClick={() => setShowUrl((v) => !v)}
              className="text-muted-foreground hover:text-foreground"
            >
              {showUrl ? (
                <EyeOff className="w-3 h-3" />
              ) : (
                <Eye className="w-3 h-3" />
              )}
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-1">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : logs?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("log_col_time")}</TableHead>
                  <TableHead>{t("log_col_event")}</TableHead>
                  <TableHead>{t("log_col_status")}</TableHead>
                  <TableHead>{t("log_col_duration")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          eventColorMap[log.event as EventType] ??
                          "bg-muted text-muted-foreground"
                        }
                      >
                        {t(eventKeyMap[log.event as EventType] ?? log.event)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.success ? (
                        <Badge className="bg-green-500/10 text-green-500">
                          {log.status_code}
                        </Badge>
                      ) : (
                        <Badge
                          className="bg-red-500/10 text-red-500"
                          title={log.error}
                        >
                          {log.status_code || t("log_error")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.duration_ms}ms
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-muted-foreground">{t("logs_empty")}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Static helper (no hook, usable outside component) ──────────────────────

function truncateUrlStatic(url: string, max = 60) {
  return url.length > max ? url.slice(0, max) + "…" : url;
}
