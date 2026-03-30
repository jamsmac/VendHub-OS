"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
import { formatNumber } from "@/lib/utils";

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

const CATEGORY_KEYS = [
  "beginner",
  "explorer",
  "loyal",
  "social",
  "collector",
  "special",
] as const;

const RARITY_KEYS = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
] as const;

const RARITY_STYLE: Record<string, { color: string; badge: string }> = {
  common: { color: "text-gray-600", badge: "secondary" },
  uncommon: { color: "text-green-600", badge: "default" },
  rare: { color: "text-blue-600", badge: "default" },
  epic: { color: "text-purple-600", badge: "default" },
  legendary: { color: "text-yellow-600", badge: "destructive" },
};

const CONDITION_KEYS = [
  "total_orders",
  "total_spent",
  "total_points_earned",
  "streak_days",
  "unique_machines",
  "unique_products",
  "referrals_count",
  "reviews_count",
  "quests_completed",
  "level_reached",
  "first_order",
  "night_order",
  "weekend_order",
] as const;

const achievementFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  titleUz: z.string().max(255).optional().default(""),
  description: z.string().max(1000).optional().default(""),
  descriptionUz: z.string().max(1000).optional().default(""),
  icon: z.string().min(1).max(10).default("🏆"),
  category: z.enum(CATEGORY_KEYS),
  conditionType: z.enum(CONDITION_KEYS),
  conditionValue: z.coerce.number().int().min(1).default(1),
  pointsReward: z.coerce.number().int().min(0).default(50),
  rarity: z.enum(RARITY_KEYS),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

type AchievementFormValues = z.infer<typeof achievementFormSchema>;

const EMPTY_DEFAULTS: AchievementFormValues = {
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
  const t = useTranslations("achievements");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementFormSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  // Fetch achievements
  const { data: achievementsData, isLoading } = useQuery({
    queryKey: ["achievements", categoryFilter],
    queryFn: async () => {
      const params: Record<
        string,
        string | number | boolean | null | undefined
      > = {};
      if (categoryFilter !== "all") params.category = categoryFilter;
      const res = await achievementsApi.getAll(params);
      return (res.data || []) as Achievement[];
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
    mutationFn: (data: AchievementFormValues) =>
      achievementsApi.create(data as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements"] });
      closeForm();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AchievementFormValues }) =>
      achievementsApi.update(id, data as unknown as Record<string, unknown>),
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
    form.reset(EMPTY_DEFAULTS);
  };

  const openEdit = (ach: Achievement) => {
    form.reset({
      title: ach.title,
      titleUz: ach.titleUz,
      description: ach.description,
      descriptionUz: ach.descriptionUz,
      icon: ach.icon,
      category: ach.category as AchievementFormValues["category"],
      conditionType:
        ach.conditionType as AchievementFormValues["conditionType"],
      conditionValue: ach.conditionValue,
      pointsReward: ach.pointsReward,
      rarity: ach.rarity as AchievementFormValues["rarity"],
      isActive: ach.isActive,
      sortOrder: ach.sortOrder,
    });
    setEditingId(ach.id);
    setShowForm(true);
  };

  const handleSave = form.handleSubmit((values) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: values });
    } else {
      createMutation.mutate(values);
    }
  });

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
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("back", { defaultValue: "Back" })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {t("seedBasic")}
          </Button>
          <Button
            onClick={() => {
              form.reset(EMPTY_DEFAULTS);
              setEditingId(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("newAchievement")}
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
              <p className="text-sm text-muted-foreground">
                {t("totalAchievements")}
              </p>
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
                {t("totalUnlocked")}
              </p>
              <p className="text-xl font-bold">
                {statsData?.totalUnlocked != null
                  ? formatNumber(statsData.totalUnlocked)
                  : "\u2014"}
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
              <p className="text-sm text-muted-foreground">
                {t("rewardsGiven")}
              </p>
              <p className="text-xl font-bold">
                {statsData?.totalRewardsClaimed != null
                  ? formatNumber(statsData.totalRewardsClaimed)
                  : "\u2014"}
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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("categoryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {CATEGORY_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {t(`category_${key}`)}
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
            <p className="text-lg font-medium">{t("emptyTitle")}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {t("emptyDescription")}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => seedMutation.mutate()}>
                <Sparkles className="h-4 w-4 mr-2" />
                {t("seedBasic")}
              </Button>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("create")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {achievements.map((ach) => {
            const rarityStyle = RARITY_STYLE[ach.rarity] || RARITY_STYLE.common;
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
                      {t(`category_${ach.category}`)}
                    </Badge>
                    <Badge
                      variant={
                        rarityStyle.badge as
                          | "default"
                          | "secondary"
                          | "destructive"
                          | "outline"
                      }
                      className={`text-xs ${rarityStyle.color}`}
                    >
                      {t(`rarity_${ach.rarity}`)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {t("pointsBadge", { points: ach.pointsReward })}
                    </Badge>
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {t(`condition_${ach.conditionType}`)}:{" "}
                      {ach.conditionValue}
                    </span>
                    {!ach.isActive && (
                      <Badge variant="destructive" className="text-xs">
                        {t("inactive")}
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
              {editingId ? t("dialogTitleEdit") : t("dialogTitleNew")}
            </DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[60px_1fr] gap-3">
              <div className="space-y-2">
                <Label>{t("labelIcon")}</Label>
                <Input
                  {...form.register("icon")}
                  className="text-center text-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("labelTitleRu")}</Label>
                <Input {...form.register("title")} />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("labelTitleUz")}</Label>
              <Input {...form.register("titleUz")} />
            </div>
            <div className="space-y-2">
              <Label>{t("labelDescriptionRu")}</Label>
              <Textarea {...form.register("description")} />
            </div>
            <div className="space-y-2">
              <Label>{t("labelDescriptionUz")}</Label>
              <Textarea {...form.register("descriptionUz")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("labelCategory")}</Label>
                <Controller
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_KEYS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {t(`category_${k}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("labelRarity")}</Label>
                <Controller
                  control={form.control}
                  name="rarity"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RARITY_KEYS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {t(`rarity_${k}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("labelCondition")}</Label>
                <Controller
                  control={form.control}
                  name="conditionType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_KEYS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {t(`condition_${k}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("labelConditionValue")}</Label>
                <Input type="number" {...form.register("conditionValue")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("labelReward")}</Label>
                <Input type="number" {...form.register("pointsReward")} />
              </div>
              <div className="space-y-2">
                <Label>{t("labelSortOrder")}</Label>
                <Input type="number" {...form.register("sortOrder")} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("labelActive")}</Label>
              <Switch
                checked={form.watch("isActive")}
                onCheckedChange={(v) =>
                  form.setValue("isActive", v, { shouldDirty: true })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              {t("cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
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
