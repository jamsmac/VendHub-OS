"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Trophy,
  Plus,
  Search,
  Pencil,
  Trash2,
  Sparkles,
  Users,
  Star,
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
import { achievementsApi } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

interface Achievement {
  id: string;
  title: string;
  titleUz: string;
  description: string;
  descriptionUz: string;
  icon: string;
  category: string;
  conditionType: string;
  conditionValue: number;
  pointsReward: number;
  rarity: string;
  isActive: boolean;
  sortOrder: number;
  unlockedCount?: number;
  createdAt: string;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_LABELS: Record<string, string> = {
  beginner: "Новичок",
  explorer: "Исследователь",
  loyal: "Лояльный",
  social: "Социальный",
  collector: "Коллекционер",
  special: "Специальный",
};

const RARITY_CONFIG: Record<
  string,
  { label: string; color: string; badge: string }
> = {
  common: { label: "Обычная", color: "text-gray-600", badge: "secondary" },
  uncommon: { label: "Необычная", color: "text-green-600", badge: "default" },
  rare: { label: "Редкая", color: "text-blue-600", badge: "default" },
  epic: { label: "Эпическая", color: "text-purple-600", badge: "default" },
  legendary: {
    label: "Легендарная",
    color: "text-yellow-600",
    badge: "destructive",
  },
};

const CONDITION_LABELS: Record<string, string> = {
  total_orders: "Всего заказов",
  total_spent: "Всего потрачено",
  total_points_earned: "Баллов заработано",
  streak_days: "Серия дней",
  unique_machines: "Уникальных автоматов",
  unique_products: "Уникальных товаров",
  referrals_count: "Приглашённых друзей",
  reviews_count: "Написано отзывов",
  quests_completed: "Квестов выполнено",
  level_reached: "Достигнут уровень",
  first_order: "Первый заказ",
  night_order: "Ночной заказ",
  weekend_order: "Заказ в выходные",
};

const EMPTY_FORM = {
  title: "",
  titleUz: "",
  description: "",
  descriptionUz: "",
  icon: "🏆",
  category: "beginner",
  conditionType: "total_orders",
  conditionValue: 1,
  pointsReward: 50,
  rarity: "common",
  isActive: true,
  sortOrder: 0,
};

// ============================================================================
// Component
// ============================================================================

export default function AchievementsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch achievements
  const { data: achievementsData, isLoading } = useQuery({
    queryKey: ["achievements", categoryFilter],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {};
      if (categoryFilter !== "all") params.category = categoryFilter;
      const res = await achievementsApi.getAll(params);
      return (res.data?.data || res.data || []) as Achievement[];
    },
  });

  // Stats
  const { data: statsData } = useQuery({
    queryKey: ["achievements-stats"],
    queryFn: async () => {
      const res = await achievementsApi.getStats();
      return res.data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (data: any) => achievementsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      closeForm();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      achievementsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      closeForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => achievementsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      setDeleteId(null);
    },
  });

  // Seed mutation
  const seedMutation = useMutation({
    mutationFn: () => achievementsApi.seed(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["achievements"] }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const openEdit = (ach: Achievement) => {
    setForm({
      title: ach.title,
      titleUz: ach.titleUz,
      description: ach.description,
      descriptionUz: ach.descriptionUz,
      icon: ach.icon,
      category: ach.category,
      conditionType: ach.conditionType,
      conditionValue: ach.conditionValue,
      pointsReward: ach.pointsReward,
      rarity: ach.rarity,
      isActive: ach.isActive,
      sortOrder: ach.sortOrder,
    });
    setEditingId(ach.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const achievements = (achievementsData || []).filter(
    (a) =>
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.titleUz.toLowerCase().includes(search.toLowerCase()),
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
            <h1 className="text-2xl font-bold">Достижения</h1>
            <p className="text-muted-foreground">
              Управление ачивками и бейджами
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Создать базовые
          </Button>
          <Button
            onClick={() => {
              setForm(EMPTY_FORM);
              setEditingId(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Новое достижение
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Всего достижений</p>
              <p className="text-xl font-bold">{achievements.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Разблокировано всего
              </p>
              <p className="text-xl font-bold">
                {statsData?.totalUnlocked?.toLocaleString() || "—"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Star className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Выдано наград</p>
              <p className="text-xl font-bold">
                {statsData?.totalRewardsClaimed?.toLocaleString() || "—"}
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
            placeholder="Поиск достижений..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Achievements Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : achievements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">Нет достижений</p>
            <p className="text-sm text-muted-foreground mb-4">
              Создайте первое достижение или загрузите базовые
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => seedMutation.mutate()}>
                <Sparkles className="h-4 w-4 mr-2" />
                Создать базовые
              </Button>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Создать
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {achievements.map((ach) => {
            const rarityConfig =
              RARITY_CONFIG[ach.rarity] || RARITY_CONFIG.common;
            return (
              <Card
                key={ach.id}
                className={`relative ${!ach.isActive ? "opacity-60" : ""}`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{ach.icon}</span>
                      <div>
                        <p className="font-medium">{ach.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {ach.titleUz}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(ach)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteId(ach.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {ach.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {CATEGORY_LABELS[ach.category] || ach.category}
                    </Badge>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Badge
                      variant={rarityConfig.badge as any}
                      className={`text-xs ${rarityConfig.color}`}
                    >
                      {rarityConfig.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      🎁 {ach.pointsReward} баллов
                    </Badge>
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {CONDITION_LABELS[ach.conditionType] || ach.conditionType}
                      : {ach.conditionValue}
                    </span>
                    {!ach.isActive && (
                      <Badge variant="destructive" className="text-xs">
                        Неактивно
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Редактировать" : "Новое"} достижение
            </DialogTitle>
            <DialogDescription>Заполните данные достижения</DialogDescription>
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
                <Label>Категория</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Редкость</Label>
                <Select
                  value={form.rarity}
                  onValueChange={(v) => setForm({ ...form, rarity: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RARITY_CONFIG).map(([k, v]) => (
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
                <Label>Условие</Label>
                <Select
                  value={form.conditionType}
                  onValueChange={(v) => setForm({ ...form, conditionType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Значение условия</Label>
                <Input
                  type="number"
                  value={form.conditionValue}
                  onChange={(e) =>
                    setForm({ ...form, conditionValue: Number(e.target.value) })
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
                <Label>Порядок сортировки</Label>
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
              <Label>Активно</Label>
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
            <AlertDialogTitle>Удалить достижение?</AlertDialogTitle>
            <AlertDialogDescription>
              Достижение будет деактивировано. Уже выданные бейджи сохранятся.
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
