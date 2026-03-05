"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Target,
  Plus,
  Search,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  Zap,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { questsApi } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

interface Quest {
  id: string;
  title: string;
  titleUz: string;
  description: string;
  descriptionUz: string;
  icon: string;
  period: string;
  type: string;
  targetValue: number;
  pointsReward: number;
  difficulty: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

// ============================================================================
// Constants
// ============================================================================

const PERIOD_KEYS = [
  "daily",
  "weekly",
  "monthly",
  "one_time",
  "special",
] as const;

const PERIOD_CONFIG: Record<
  string,
  { color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  daily: { color: "bg-blue-100 text-blue-700", icon: Clock },
  weekly: { color: "bg-green-100 text-green-700", icon: Calendar },
  monthly: { color: "bg-purple-100 text-purple-700", icon: Calendar },
  one_time: { color: "bg-orange-100 text-orange-700", icon: Zap },
  special: { color: "bg-pink-100 text-pink-700", icon: Target },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-green-600",
  medium: "text-yellow-600",
  hard: "text-orange-600",
  expert: "text-red-600",
};

const DIFFICULTY_KEYS = ["easy", "medium", "hard", "expert"] as const;

const QUEST_TYPE_KEYS = [
  "make_orders",
  "spend_amount",
  "try_new_product",
  "try_new_machine",
  "order_specific_product",
  "order_from_category",
  "morning_order",
  "evening_order",
  "consecutive_days",
  "invite_friend",
  "leave_review",
  "use_promo",
  "reach_streak",
  "visit_locations",
  "collect_points",
] as const;

const EMPTY_FORM = {
  title: "",
  titleUz: "",
  description: "",
  descriptionUz: "",
  icon: "🎯",
  period: "daily",
  type: "make_orders",
  targetValue: 1,
  pointsReward: 20,
  difficulty: "easy",
  isActive: true,
  sortOrder: 0,
};

// ============================================================================
// Component
// ============================================================================

export default function QuestsPage() {
  const queryClient = useQueryClient();
  const t = useTranslations("quests");
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch quests
  const { data: questsData, isLoading } = useQuery({
    queryKey: ["quests", periodFilter],
    queryFn: async () => {
      const params: Record<
        string,
        string | number | boolean | null | undefined
      > = {};
      if (periodFilter !== "all") params.period = periodFilter;
      const res = await questsApi.getAll(params);
      return (res.data?.data || res.data || []) as Quest[];
    },
  });

  // Stats
  const { data: statsData } = useQuery({
    queryKey: ["quests-stats"],
    queryFn: async () => {
      const res = await questsApi.getStats();
      return res.data;
    },
  });

  // CRUD mutations
  const createMutation = useMutation({
    mutationFn: (data: unknown) =>
      questsApi.create(data as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      questsApi.update(id, data as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => questsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      setDeleteId(null);
    },
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const openEdit = (quest: Quest) => {
    setForm({
      title: quest.title,
      titleUz: quest.titleUz,
      description: quest.description,
      descriptionUz: quest.descriptionUz,
      icon: quest.icon,
      period: quest.period,
      type: quest.type,
      targetValue: quest.targetValue,
      pointsReward: quest.pointsReward,
      difficulty: quest.difficulty,
      isActive: quest.isActive,
      sortOrder: quest.sortOrder,
    });
    setEditingId(quest.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (editingId) updateMutation.mutate({ id: editingId, data: form });
    else createMutation.mutate(form);
  };

  const quests = (questsData || []).filter(
    (q) =>
      !search ||
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.titleUz.toLowerCase().includes(search.toLowerCase()),
  );

  // Group by period
  const grouped = quests.reduce(
    (acc, q) => {
      const key = q.period;
      if (!acc[key]) acc[key] = [];
      acc[key].push(q);
      return acc;
    },
    {} as Record<string, Quest[]>,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/loyalty">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setForm(EMPTY_FORM);
            setEditingId(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("newQuest")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("statsTotal")}</p>
              <p className="text-xl font-bold">{quests.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("statsDaily")}</p>
              <p className="text-xl font-bold">
                {quests.filter((q) => q.period === "daily").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t("statsWeekly")}
              </p>
              <p className="text-xl font-bold">
                {quests.filter((q) => q.period === "weekly").length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t("statsCompleted")}
              </p>
              <p className="text-xl font-bold">
                {statsData?.totalCompleted?.toLocaleString() || "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filterPeriod")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allPeriods")}</SelectItem>
            {PERIOD_KEYS.map((k) => (
              <SelectItem key={k} value={k}>
                {t(`period_${k}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quests List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : quests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">{t("noQuests")}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {t("noQuestsHint")}
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("createQuest")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([period, items]) => {
          const periodConfig = PERIOD_CONFIG[period] || PERIOD_CONFIG.daily;
          return (
            <div key={period} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <periodConfig.icon className="h-4 w-4" />
                {t(`period_${period}` as Parameters<typeof t>[0])} (
                {items.length})
              </h3>
              <div className="space-y-2">
                {items.map((quest) => {
                  const diffColor =
                    DIFFICULTY_COLORS[quest.difficulty] ||
                    DIFFICULTY_COLORS.easy;
                  return (
                    <Card
                      key={quest.id}
                      className={!quest.isActive ? "opacity-60" : ""}
                    >
                      <CardContent className="py-4 flex items-center gap-4">
                        <span className="text-2xl">{quest.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">
                              {quest.title}
                            </p>
                            {!quest.isActive && (
                              <Badge variant="destructive" className="text-xs">
                                {t("inactive")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {quest.description}
                          </p>
                          <div className="flex gap-1.5 mt-1.5">
                            <Badge variant="outline" className="text-xs">
                              {t(
                                `questType_${quest.type}` as Parameters<
                                  typeof t
                                >[0],
                              ) || quest.type}
                              : {quest.targetValue}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${diffColor}`}
                            >
                              {t(
                                `difficulty_${quest.difficulty}` as Parameters<
                                  typeof t
                                >[0],
                              )}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              🎁 {quest.pointsReward}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(quest)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteId(quest.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t("editQuest") : t("newQuest")}
            </DialogTitle>
            <DialogDescription>{t("formDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[60px_1fr] gap-3">
              <div className="space-y-2">
                <Label>{t("formIcon")}</Label>
                <Input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="text-center text-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("formTitleRu")}</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("formTitleUz")}</Label>
              <Input
                value={form.titleUz}
                onChange={(e) => setForm({ ...form, titleUz: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("formDescriptionRu")}</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("formDescriptionUz")}</Label>
              <Textarea
                value={form.descriptionUz}
                onChange={(e) =>
                  setForm({ ...form, descriptionUz: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("formPeriod")}</Label>
                <Select
                  value={form.period}
                  onValueChange={(v) => setForm({ ...form, period: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`period_${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("formDifficulty")}</Label>
                <Select
                  value={form.difficulty}
                  onValueChange={(v) => setForm({ ...form, difficulty: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`difficulty_${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("formQuestType")}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUEST_TYPE_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`questType_${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("formTarget")}</Label>
                <Input
                  type="number"
                  value={form.targetValue}
                  onChange={(e) =>
                    setForm({ ...form, targetValue: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("formReward")}</Label>
                <Input
                  type="number"
                  value={form.pointsReward}
                  onChange={(e) =>
                    setForm({ ...form, pointsReward: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("formSortOrder")}</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("formActive")}</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              {t("cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !form.title ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {createMutation.isPending || updateMutation.isPending
                ? t("saving")
                : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
