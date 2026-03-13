"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Bell,
  BellDot,
  BellOff,
  Send,
  AlertTriangle,
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  CheckCheck,
  Plus,
  FileText,
  Zap,
  Users,
  Mail,
  Smartphone,
  MessageSquare,
  Save,
  Edit,
  ExternalLink,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/utils";
import { api } from "@/lib/api";

import type {
  Notification,
  NotificationTemplate,
  NotificationRule,
  NotificationCampaign,
  ChannelSettings,
  TypeChannelPreferences,
} from "./_components/notification-types";
import {
  typeIcons,
  typeColors,
  channelColors,
  priorityColors,
  campaignStatusColors,
  typeKeys,
  channelKeys,
} from "./_components/notification-constants";
import { TemplateForm } from "./_components/template-form";
import { RuleForm } from "./_components/rule-form";
import { CampaignForm } from "./_components/campaign-form";

// ─── Main Page Component ──────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("notifications");

  // --- All Tab State ---
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // --- Templates Tab State ---
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<NotificationTemplate | null>(null);

  // --- Rules Tab State ---
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);

  // --- Campaigns Tab State ---
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] =
    useState<NotificationCampaign | null>(null);

  // --- Settings Tab State ---
  const [channelSettings, setChannelSettings] = useState<ChannelSettings>({
    push: true,
    email: true,
    sms: false,
    telegram: true,
    in_app: true,
    sound: true,
  });
  const [typePreferences, setTypePreferences] =
    useState<TypeChannelPreferences>({
      system: { push: true, email: true, sms: false, telegram: true },
      task: { push: true, email: true, sms: true, telegram: true },
      inventory: { push: true, email: true, sms: false, telegram: false },
      payment: { push: false, email: true, sms: false, telegram: true },
      alert: { push: true, email: true, sms: true, telegram: true },
      maintenance: { push: true, email: true, sms: false, telegram: false },
    });

  // ─── Queries ──────────────────────────────────────────────

  const {
    data: notificationsRes,
    isLoading: notificationsLoading,
    isError: notificationsError,
  } = useQuery({
    queryKey: [
      "notifications",
      debouncedSearch,
      typeFilter,
      channelFilter,
      priorityFilter,
      statusFilter,
    ],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (typeFilter !== "all") params.type = typeFilter;
      if (channelFilter !== "all") params.channel = channelFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await api.get("/notifications", { params });
      return res.data;
    },
  });

  const notifications: Notification[] = useMemo(
    () => notificationsRes?.data || notificationsRes || [],
    [notificationsRes],
  );

  const { data: unreadCountRes } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await api.get("/notifications/unread-count");
      return res.data;
    },
  });

  const unreadCount: number = unreadCountRes?.count ?? unreadCountRes ?? 0;

  const { data: templatesRes, isLoading: templatesLoading } = useQuery({
    queryKey: ["notification-templates"],
    queryFn: async () => {
      const res = await api.get("/notifications/templates");
      return res.data;
    },
  });

  const templates: NotificationTemplate[] =
    templatesRes?.data || templatesRes || [];

  const { data: rulesRes, isLoading: rulesLoading } = useQuery({
    queryKey: ["notification-rules"],
    queryFn: async () => {
      const res = await api.get("/notifications/rules");
      return res.data;
    },
  });

  const rules: NotificationRule[] = rulesRes?.data || rulesRes || [];

  const { data: campaignsRes, isLoading: campaignsLoading } = useQuery({
    queryKey: ["notification-campaigns"],
    queryFn: async () => {
      const res = await api.get("/notifications/campaigns");
      return res.data;
    },
  });

  const campaigns: NotificationCampaign[] =
    campaignsRes?.data || campaignsRes || [];

  // ─── Stats ────────────────────────────────────────────────

  const stats = useMemo(
    () => ({
      total: notifications.length,
      unread:
        typeof unreadCount === "number"
          ? unreadCount
          : notifications.filter((n) => n.status === "unread").length,
      sentToday: notifications.filter((n) => {
        const today = new Date().toDateString();
        return new Date(n.created_at).toDateString() === today;
      }).length,
      errors: 0,
    }),
    [notifications, unreadCount],
  );

  // ─── Mutations ────────────────────────────────────────────

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(t("toast_marked_read"));
    },
    onError: () => {
      toast.error(t("toast_marked_read_error"));
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post("/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(t("toast_all_marked_read"));
    },
    onError: () => {
      toast.error(t("toast_all_marked_read_error"));
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(t("toast_notification_deleted"));
    },
    onError: () => {
      toast.error(t("toast_notification_delete_error"));
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: Partial<NotificationTemplate>) => {
      if (editingTemplate) {
        return api.patch(
          `/notifications/templates/${editingTemplate.id}`,
          data,
        );
      }
      return api.post("/notifications/templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
      setIsTemplateDialogOpen(false);
      setEditingTemplate(null);
      toast.success(
        editingTemplate
          ? t("toast_template_updated")
          : t("toast_template_created"),
      );
    },
    onError: () => {
      toast.error(t("toast_template_save_error"));
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
      toast.success(t("toast_template_deleted"));
    },
    onError: () => {
      toast.error(t("toast_template_delete_error"));
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: Partial<NotificationRule>) => {
      if (editingRule) {
        return api.patch(`/notifications/rules/${editingRule.id}`, data);
      }
      return api.post("/notifications/rules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
      setIsRuleDialogOpen(false);
      setEditingRule(null);
      toast.success(
        editingRule ? t("toast_rule_updated") : t("toast_rule_created"),
      );
    },
    onError: () => {
      toast.error(t("toast_rule_save_error"));
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      await api.patch(`/notifications/rules/${id}`, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
      toast.success(t("toast_rule_status_updated"));
    },
    onError: () => {
      toast.error(t("toast_rule_status_error"));
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-rules"] });
      toast.success(t("toast_rule_deleted"));
    },
    onError: () => {
      toast.error(t("toast_rule_delete_error"));
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: Partial<NotificationCampaign>) => {
      if (editingCampaign) {
        return api.patch(
          `/notifications/campaigns/${editingCampaign.id}`,
          data,
        );
      }
      return api.post("/notifications/campaigns", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-campaigns"] });
      setIsCampaignDialogOpen(false);
      setEditingCampaign(null);
      toast.success(
        editingCampaign
          ? t("toast_campaign_updated")
          : t("toast_campaign_created"),
      );
    },
    onError: () => {
      toast.error(t("toast_campaign_save_error"));
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-campaigns"] });
      toast.success(t("toast_campaign_deleted"));
    },
    onError: () => {
      toast.error(t("toast_campaign_delete_error"));
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: {
      channels: ChannelSettings;
      preferences: TypeChannelPreferences;
    }) => {
      await api.post("/notifications/settings", data);
    },
    onSuccess: () => {
      toast.success(t("toast_settings_saved"));
    },
    onError: () => {
      toast.error(t("toast_settings_save_error"));
    },
  });

  // ─── Helpers ──────────────────────────────────────────────

  const openNotificationDetail = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailOpen(true);
    if (notification.status === "unread") {
      markReadMutation.mutate(notification.id);
    }
  };

  // ─── Render ───────────────────────────────────────────────

  if (notificationsError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{t("error_loading_title")}</p>
        <p className="text-muted-foreground mb-4">
          {t("error_loading_subtitle")}
        </p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["notifications"] })
          }
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {t("page_title")}
              {stats.unread > 0 && (
                <Badge className="bg-red-500 text-white hover:bg-red-600">
                  {stats.unread}
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">{t("page_subtitle")}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending || stats.unread === 0}
        >
          <CheckCheck className="w-4 h-4 mr-2" />
          {t("mark_all_read")}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">{t("tab_all")}</TabsTrigger>
          <TabsTrigger value="templates">{t("tab_templates")}</TabsTrigger>
          <TabsTrigger value="rules">{t("tab_rules")}</TabsTrigger>
          <TabsTrigger value="campaigns">{t("tab_campaigns")}</TabsTrigger>
          <TabsTrigger value="settings">{t("tab_settings")}</TabsTrigger>
        </TabsList>

        {/* TAB 1: ALL NOTIFICATIONS */}
        <TabsContent value="all" className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-card rounded-xl p-4 border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("stat_total")}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-4 border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <BellDot className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.unread}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("stat_unread")}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-4 border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Send className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.sentToday}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("stat_sent_today")}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-4 border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.errors}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("stat_delivery_errors")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("search_placeholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder={t("filter_all_types")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filter_all_types")}</SelectItem>
                {typeKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`type_${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("filter_all_channels")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filter_all_channels")}</SelectItem>
                {channelKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`channel_${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t("filter_all_priorities")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("filter_all_priorities")}
                </SelectItem>
                <SelectItem value="high">{t("priority_high")}</SelectItem>
                <SelectItem value="medium">{t("priority_medium")}</SelectItem>
                <SelectItem value="low">{t("priority_low")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t("filter_all_statuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filter_all_statuses")}</SelectItem>
                <SelectItem value="read">{t("status_read")}</SelectItem>
                <SelectItem value="unread">{t("status_unread")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notifications Table */}
          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[300px]">
                    {t("th_notification")}
                  </TableHead>
                  <TableHead>{t("th_channels")}</TableHead>
                  <TableHead>{t("th_priority")}</TableHead>
                  <TableHead>{t("th_status")}</TableHead>
                  <TableHead>{t("th_date")}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notificationsLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <TableRow
                      key={notification.id}
                      className={`cursor-pointer hover:bg-muted/50 ${notification.status === "unread" ? "bg-blue-50/50 dark:bg-blue-950/10" : ""}`}
                      onClick={() => openNotificationDetail(notification)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center ${typeColors[notification.type] || "bg-muted text-muted-foreground"}`}
                          >
                            {typeIcons[notification.type] || (
                              <Bell className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`font-medium truncate ${notification.status === "unread" ? "font-semibold" : ""}`}
                            >
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground truncate max-w-[280px]">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {notification.channels.map((ch) => (
                            <Badge
                              key={ch}
                              variant="outline"
                              className={`text-xs ${channelColors[ch] || ""}`}
                            >
                              {t(`channel_${ch}`)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={priorityColors[notification.priority]}
                        >
                          {t(`priority_${notification.priority}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${notification.status === "unread" ? "bg-blue-500" : "bg-muted-foreground/30"}`}
                          />
                          <span className="text-sm">
                            {notification.status === "unread"
                              ? t("status_unread")
                              : t("status_read")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(notification.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("actions")}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {notification.status === "unread" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markReadMutation.mutate(notification.id);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                {t("action_mark_read")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotificationMutation.mutate(
                                  notification.id,
                                );
                              }}
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
                    <TableCell colSpan={6} className="text-center py-12">
                      <BellOff className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        {t("empty_notifications")}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 2: TEMPLATES */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t("templates_title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("templates_subtitle")}
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setIsTemplateDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("create_template")}
            </Button>
          </div>

          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("th_name")}</TableHead>
                  <TableHead>{t("th_type")}</TableHead>
                  <TableHead>{t("th_channels")}</TableHead>
                  <TableHead>{t("th_variables")}</TableHead>
                  <TableHead>{t("th_status")}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templatesLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : templates.length > 0 ? (
                  templates.map((tpl) => (
                    <TableRow key={tpl.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{tpl.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={typeColors[tpl.type]}>
                          {t(`type_${tpl.type}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tpl.channels.map((ch) => (
                            <Badge
                              key={ch}
                              variant="outline"
                              className={`text-xs ${channelColors[ch]}`}
                            >
                              {t(`channel_${ch}`)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tpl.variables.map((v) => (
                            <code
                              key={v}
                              className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono"
                            >
                              {`{{${v}}}`}
                            </code>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            tpl.is_active
                              ? "bg-green-500/10 text-green-500"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {tpl.is_active ? t("active") : t("inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("actions")}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingTemplate(tpl);
                                setIsTemplateDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              {t("action_edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                deleteTemplateMutation.mutate(tpl.id)
                              }
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
                    <TableCell colSpan={6} className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        {t("empty_templates")}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("empty_templates_hint")}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 3: RULES */}
        <TabsContent value="rules" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t("rules_title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("rules_subtitle")}
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingRule(null);
                setIsRuleDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("create_rule")}
            </Button>
          </div>

          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("th_rule")}</TableHead>
                  <TableHead>{t("th_event")}</TableHead>
                  <TableHead>{t("th_recipients")}</TableHead>
                  <TableHead>{t("th_channels")}</TableHead>
                  <TableHead>{t("th_status")}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rulesLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rules.length > 0 ? (
                  rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-500" />
                          <span className="font-medium">{rule.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {rule.event}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{rule.recipients}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {rule.channels.map((ch) => (
                            <Badge
                              key={ch}
                              variant="outline"
                              className={`text-xs ${channelColors[ch]}`}
                            >
                              {t(`channel_${ch}`)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() =>
                            toggleRuleMutation.mutate({
                              id: rule.id,
                              is_active: !rule.is_active,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("actions")}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingRule(rule);
                                setIsRuleDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              {t("action_edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteRuleMutation.mutate(rule.id)}
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
                    <TableCell colSpan={6} className="text-center py-12">
                      <Zap className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        {t("empty_rules")}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("empty_rules_hint")}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 4: CAMPAIGNS */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t("campaigns_title")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("campaigns_subtitle")}
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingCampaign(null);
                setIsCampaignDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("create_campaign")}
            </Button>
          </div>

          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("th_campaign")}</TableHead>
                  <TableHead>{t("th_audience")}</TableHead>
                  <TableHead>{t("th_channels")}</TableHead>
                  <TableHead>{t("th_status")}</TableHead>
                  <TableHead>{t("th_sent_delivered_errors")}</TableHead>
                  <TableHead>{t("th_date")}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : campaigns.length > 0 ? (
                  campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Megaphone className="w-4 h-4 text-primary" />
                          <span className="font-medium">{campaign.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{campaign.audience_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {campaign.channels.map((ch) => (
                            <Badge
                              key={ch}
                              variant="outline"
                              className={`text-xs ${channelColors[ch]}`}
                            >
                              {t(`channel_${ch}`)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={campaignStatusColors[campaign.status]}
                        >
                          {t(`campaign_status_${campaign.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-green-600">
                            {campaign.sent_count}
                          </span>
                          <span>/</span>
                          <span className="text-blue-600">
                            {campaign.delivered_count}
                          </span>
                          <span>/</span>
                          <span className="text-red-600">
                            {campaign.failed_count}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(campaign.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t("actions")}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingCampaign(campaign);
                                setIsCampaignDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              {t("action_edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                deleteCampaignMutation.mutate(campaign.id)
                              }
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
                    <TableCell colSpan={7} className="text-center py-12">
                      <Megaphone className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        {t("empty_campaigns")}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("empty_campaigns_hint")}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 5: SETTINGS */}
        <TabsContent value="settings" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">
              {t("settings_channels_title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("settings_channels_subtitle")}
            </p>
          </div>

          {/* Channel Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Push */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">{t("channel_push_title")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("channel_push_desc")}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={channelSettings.push}
                    onCheckedChange={(checked) =>
                      setChannelSettings({
                        ...channelSettings,
                        push: checked,
                      })
                    }
                  />
                </div>
                {channelSettings.push && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      toast.success(t("toast_push_subscribed"));
                    }}
                  >
                    {t("subscribe")}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Email */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-xs text-muted-foreground">
                        admin@vendhub.uz
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={channelSettings.email}
                    onCheckedChange={(checked) =>
                      setChannelSettings({
                        ...channelSettings,
                        email: checked,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* SMS */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium">SMS</p>
                      <p className="text-xs text-muted-foreground">
                        +998 90 123 45 67
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={channelSettings.sms}
                    onCheckedChange={(checked) =>
                      setChannelSettings({
                        ...channelSettings,
                        sms: checked,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Telegram */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-sky-500" />
                    </div>
                    <div>
                      <p className="font-medium">Telegram</p>
                      <p className="text-xs text-muted-foreground">
                        @vendhub_admin
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={channelSettings.telegram}
                    onCheckedChange={(checked) =>
                      setChannelSettings({
                        ...channelSettings,
                        telegram: checked,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* In-App */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <BellDot className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">In-App</p>
                      <p className="text-xs text-muted-foreground">
                        {t("always_enabled")}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500">
                    {t("active")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("notification_sound")}
                  </span>
                  <Switch
                    checked={channelSettings.sound}
                    onCheckedChange={(checked) =>
                      setChannelSettings({
                        ...channelSettings,
                        sound: checked,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per-Type Channel Preferences */}
          <div>
            <h2 className="text-lg font-semibold mb-2">
              {t("settings_type_title")}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("settings_type_subtitle")}
            </p>
          </div>

          <div className="bg-card rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("th_notification_type")}</TableHead>
                  <TableHead className="text-center">Push</TableHead>
                  <TableHead className="text-center">Email</TableHead>
                  <TableHead className="text-center">SMS</TableHead>
                  <TableHead className="text-center">Telegram</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(typePreferences).map(([type, prefs]) => (
                  <TableRow key={type}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-8 h-8 rounded flex items-center justify-center ${typeColors[type]}`}
                        >
                          {typeIcons[type]}
                        </span>
                        <span className="font-medium">{t(`type_${type}`)}</span>
                      </div>
                    </TableCell>
                    {(["push", "email", "sms", "telegram"] as const).map(
                      (channel) => (
                        <TableCell key={channel} className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`w-6 h-6 ${
                              prefs[channel]
                                ? "bg-primary border-primary text-white hover:bg-primary/90"
                                : "border-2 border-input bg-background"
                            }`}
                            onClick={() =>
                              setTypePreferences({
                                ...typePreferences,
                                [type]: {
                                  ...prefs,
                                  [channel]: !prefs[channel],
                                },
                              })
                            }
                          >
                            {prefs[channel] && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </Button>
                        </TableCell>
                      ),
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={() =>
                saveSettingsMutation.mutate({
                  channels: channelSettings,
                  preferences: typePreferences,
                })
              }
              disabled={saveSettingsMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveSettingsMutation.isPending
                ? t("saving")
                : t("save_settings")}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOGS */}

      {/* Notification Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification && (
                <>
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeColors[selectedNotification.type]}`}
                  >
                    {typeIcons[selectedNotification.type]}
                  </span>
                  {selectedNotification.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed">
                {selectedNotification.message}
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">
                    {t("detail_type")}:
                  </span>{" "}
                  <Badge className={typeColors[selectedNotification.type]}>
                    {t(`type_${selectedNotification.type}`)}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("detail_priority")}:
                  </span>{" "}
                  <Badge
                    className={priorityColors[selectedNotification.priority]}
                  >
                    {t(`priority_${selectedNotification.priority}`)}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("detail_channels")}:
                  </span>{" "}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedNotification.channels.map((ch) => (
                      <Badge
                        key={ch}
                        variant="outline"
                        className={`text-xs ${channelColors[ch]}`}
                      >
                        {t(`channel_${ch}`)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("detail_date")}:
                  </span>{" "}
                  <span>{formatDateTime(selectedNotification.created_at)}</span>
                </div>
              </div>
              {selectedNotification.related_entity_type &&
                selectedNotification.related_entity_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const entityPath =
                        selectedNotification.related_entity_type === "machine"
                          ? "machines"
                          : selectedNotification.related_entity_type === "task"
                            ? "tasks"
                            : selectedNotification.related_entity_type || "";
                      router.push(
                        `/dashboard/${entityPath}/${selectedNotification.related_entity_id}`,
                      );
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t("go_to_entity")}
                  </Button>
                )}
              <div className="flex justify-end gap-2 pt-2">
                {selectedNotification.status === "unread" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      markReadMutation.mutate(selectedNotification.id);
                      setSelectedNotification({
                        ...selectedNotification,
                        status: "read",
                      });
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t("mark_as_read")}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDetailOpen(false)}
                >
                  {t("close")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate
                ? t("dialog_edit_template")
                : t("dialog_new_template")}
            </DialogTitle>
          </DialogHeader>
          <TemplateForm
            template={editingTemplate}
            onSubmit={(data) => createTemplateMutation.mutate(data)}
            isPending={createTemplateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Rule Dialog */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? t("dialog_edit_rule") : t("dialog_new_rule")}
            </DialogTitle>
          </DialogHeader>
          <RuleForm
            rule={editingRule}
            onSubmit={(data) => createRuleMutation.mutate(data)}
            isPending={createRuleMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Campaign Dialog */}
      <Dialog
        open={isCampaignDialogOpen}
        onOpenChange={setIsCampaignDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign
                ? t("dialog_edit_campaign")
                : t("dialog_new_campaign")}
            </DialogTitle>
          </DialogHeader>
          <CampaignForm
            campaign={editingCampaign}
            onSubmit={(data) => createCampaignMutation.mutate(data)}
            isPending={createCampaignMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
