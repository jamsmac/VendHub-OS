"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PERIOD_LABELS: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  daily: {
    label: "Ежедневный",
    color: "bg-blue-100 text-blue-700",
    icon: Clock,
  },
  weekly: {
    label: "Еженедельный",
    color: "bg-green-100 text-green-700",
    icon: Calendar,
  },
  monthly: {
    label: "Ежемесячный",
    color: "bg-purple-100 text-purple-700",
    icon: Calendar,
  },
  one_time: {
    label: "Одноразовый",
    color: "bg-orange-100 text-orange-700",
    icon: Zap,
  },
  special: {
    label: "Специальный",
    color: "bg-pink-100 text-pink-700",
    icon: Target,
  },
};

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  easy: { label: "Лёгкий", color: "text-green-600" },
  medium: { label: "Средний", color: "text-yellow-600" },
  hard: { label: "Сложный", color: "text-orange-600" },
  expert: { label: "Эксперт", color: "text-red-600" },
};

const QUEST_TYPE_LABELS: Record<string, string> = {
  make_orders: "Сделать заказов",
  spend_amount: "Потратить сумму",
  try_new_product: "Попробовать новый товар",
  try_new_machine: "Посетить новый автомат",
  order_specific_product: "Заказать конкретный товар",
  order_from_category: "Заказ из категории",
  morning_order: "Утренний заказ",
  evening_order: "Вечерний заказ",
  consecutive_days: "Подряд дней",
  invite_friend: "Пригласить друга",
  leave_review: "Оставить отзыв",
  use_promo: "Использовать промокод",
  reach_streak: "Достичь серии",
  visit_locations: "Посетить локации",
  collect_points: "Собрать баллы",
};

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {};
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (data: any) => questsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      questsApi.update(id, data),
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
            <h1 className="text-2xl font-bold">Квесты</h1>
            <p className="text-muted-foreground">
              Ежедневные и недельные задания
            </p>
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
          Новый квест
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
              <p className="text-sm text-muted-foreground">Всего квестов</p>
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
              <p className="text-sm text-muted-foreground">Ежедневных</p>
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
              <p className="text-sm text-muted-foreground">Еженедельных</p>
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
              <p className="text-sm text-muted-foreground">Выполнено всего</p>
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
            placeholder="Поиск квестов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Период" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все периоды</SelectItem>
            {Object.entries(PERIOD_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v.label}
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
            <p className="text-lg font-medium">Нет квестов</p>
            <p className="text-sm text-muted-foreground mb-4">
              Создайте первый квест для пользователей
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать квест
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([period, items]) => {
          const periodConfig = PERIOD_LABELS[period] || PERIOD_LABELS.daily;
          return (
            <div key={period} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <periodConfig.icon className="h-4 w-4" />
                {periodConfig.label} ({items.length})
              </h3>
              <div className="space-y-2">
                {items.map((quest) => {
                  const diffConfig =
                    DIFFICULTY_LABELS[quest.difficulty] ||
                    DIFFICULTY_LABELS.easy;
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
                                Неактивен
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {quest.description}
                          </p>
                          <div className="flex gap-1.5 mt-1.5">
                            <Badge variant="outline" className="text-xs">
                              {QUEST_TYPE_LABELS[quest.type] || quest.type}:{" "}
                              {quest.targetValue}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${diffConfig.color}`}
                            >
                              {diffConfig.label}
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
              {editingId ? "Редактировать" : "Новый"} квест
            </DialogTitle>
            <DialogDescription>Заполните данные квеста</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[60px_1fr] gap-3">
              <div className="space-y-2">
                <Label>Иконка</Label>
                <Input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="text-center text-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Название (RU)</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Название (UZ)</Label>
              <Input
                value={form.titleUz}
                onChange={(e) => setForm({ ...form, titleUz: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Описание (RU)</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Описание (UZ)</Label>
              <Textarea
                value={form.descriptionUz}
                onChange={(e) =>
                  setForm({ ...form, descriptionUz: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Период</Label>
                <Select
                  value={form.period}
                  onValueChange={(v) => setForm({ ...form, period: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERIOD_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Сложность</Label>
                <Select
                  value={form.difficulty}
                  onValueChange={(v) => setForm({ ...form, difficulty: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Тип задания</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(QUEST_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Цель</Label>
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
                <Label>Награда (баллы)</Label>
                <Input
                  type="number"
                  value={form.pointsReward}
                  onChange={(e) =>
                    setForm({ ...form, pointsReward: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Порядок</Label>
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
              <Label>Активен</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              Отмена
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
                ? "Сохранение..."
                : "Сохранить"}
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
            <AlertDialogTitle>Удалить квест?</AlertDialogTitle>
            <AlertDialogDescription>
              Квест будет деактивирован. Прогресс пользователей сохранится.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
