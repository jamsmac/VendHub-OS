"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Ticket,
  Plus,
  Search,
  Pencil,
  Copy,
  Eye,
  Pause,
  Users,
  TrendingUp,
  Calendar,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { promoCodesApi } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

interface PromoCode {
  id: string;
  code: string;
  description: string;
  type: "fixed_discount" | "percent_discount" | "bonus_points" | "free_product";
  value: number;
  minOrderAmount: number;
  maxUses: number;
  usedCount: number;
  maxUsesPerUser: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_LABELS: Record<
  string,
  { label: string; format: (v: number) => string }
> = {
  fixed_discount: {
    label: "Фиксированная скидка",
    format: (v) => `${v.toLocaleString()} сум`,
  },
  percent_discount: { label: "Процентная скидка", format: (v) => `${v}%` },
  bonus_points: { label: "Бонусные баллы", format: (v) => `+${v} баллов` },
  free_product: { label: "Бесплатный товар", format: (v) => `${v} шт.` },
};

const EMPTY_FORM: {
  code: string;
  description: string;
  type: PromoCode["type"];
  value: number;
  minOrderAmount: number;
  maxUses: number;
  maxUsesPerUser: number;
  startsAt: string;
  expiresAt: string;
} = {
  code: "",
  description: "",
  type: "bonus_points",
  value: 100,
  minOrderAmount: 0,
  maxUses: 0,
  maxUsesPerUser: 1,
  startsAt: "",
  expiresAt: "",
};

// ============================================================================
// Component
// ============================================================================

export default function PromoCodesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showRedemptions, setShowRedemptions] = useState<string | null>(null);

  // Fetch promo codes
  const { data: codesData, isLoading } = useQuery({
    queryKey: ["promo-codes"],
    queryFn: async () => {
      const res = await promoCodesApi.getAll();
      return (res.data?.data || res.data || []) as PromoCode[];
    },
  });

  // Fetch redemptions for selected code
  const { data: redemptionsData } = useQuery({
    queryKey: ["promo-redemptions", showRedemptions],
    queryFn: async () => {
      if (!showRedemptions) return null;
      const res = await promoCodesApi.getRedemptions(showRedemptions);
      return res.data;
    },
    enabled: !!showRedemptions,
  });

  // CRUD mutations
  const createMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (data: any) => promoCodesApi.create(data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      promoCodesApi.update(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
      closeForm();
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => promoCodesApi.deactivate(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] }),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const openEdit = (code: PromoCode) => {
    setForm({
      code: code.code,
      description: code.description,
      type: code.type,
      value: code.value,
      minOrderAmount: code.minOrderAmount,
      maxUses: code.maxUses,
      maxUsesPerUser: code.maxUsesPerUser,
      startsAt: code.startsAt?.split("T")[0] || "",
      expiresAt: code.expiresAt?.split("T")[0] || "",
    });
    setEditingId(code.id);
    setShowForm(true);
  };

  const handleSave = () => {
    const payload = {
      ...form,
      startsAt: form.startsAt || null,
      expiresAt: form.expiresAt || null,
    };
    if (editingId) updateMutation.mutate({ id: editingId, data: payload });
    else createMutation.mutate(payload);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++)
      code += chars[Math.floor(Math.random() * chars.length)];
    setForm({ ...form, code });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const codes = (codesData || []).filter(
    (c) =>
      !search ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCodes = codes.filter((c) => c.isActive);
  const totalRedemptions = codes.reduce((sum, c) => sum + c.usedCount, 0);

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
            <h1 className="text-2xl font-bold">Промокоды</h1>
            <p className="text-muted-foreground">
              Создание и управление промокодами
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
          Новый промокод
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Ticket className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Всего промокодов</p>
              <p className="text-xl font-bold">{codes.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Активных</p>
              <p className="text-xl font-bold">{activeCodes.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Использований</p>
              <p className="text-xl font-bold">{totalRedemptions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по коду или описанию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Promo Codes List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : codes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">Нет промокодов</p>
            <p className="text-sm text-muted-foreground mb-4">
              Создайте первый промокод
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {codes.map((code) => {
            const typeConfig =
              TYPE_LABELS[code.type] || TYPE_LABELS.bonus_points;
            const isExpired =
              code.expiresAt && new Date(code.expiresAt) < new Date();
            code.maxUses > 0 ? (code.usedCount / code.maxUses) * 100 : 0;

            return (
              <Card
                key={code.id}
                className={!code.isActive || isExpired ? "opacity-60" : ""}
              >
                <CardContent className="py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="px-2 py-0.5 bg-muted rounded text-sm font-mono font-bold">
                        {code.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyCode(code.code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      {!code.isActive && (
                        <Badge variant="destructive" className="text-xs">
                          Неактивен
                        </Badge>
                      )}
                      {isExpired && (
                        <Badge variant="secondary" className="text-xs">
                          Истёк
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {code.description || typeConfig.label}
                    </p>
                    <div className="flex gap-1.5 mt-1.5">
                      <Badge variant="outline" className="text-xs">
                        {typeConfig.format(code.value)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {code.usedCount}/{code.maxUses || "∞"} использований
                      </Badge>
                      {code.minOrderAmount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          от {code.minOrderAmount.toLocaleString()} сум
                        </Badge>
                      )}
                      {code.expiresAt && (
                        <Badge
                          variant="secondary"
                          className="text-xs flex items-center gap-1"
                        >
                          <Calendar className="h-3 w-3" />
                          до{" "}
                          {new Date(code.expiresAt).toLocaleDateString("ru-RU")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setShowRedemptions(code.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(code)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {code.isActive && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-orange-600"
                        onClick={() => deactivateMutation.mutate(code.id)}
                      >
                        <Pause className="h-3.5 w-3.5" />
                      </Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Редактировать" : "Новый"} промокод
            </DialogTitle>
            <DialogDescription>Настройте параметры промокода</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Код</Label>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  placeholder="SUMMER2025"
                  className="font-mono"
                />
                <Button variant="outline" type="button" onClick={generateCode}>
                  Сгенерировать
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Описание промокода"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Тип</Label>
                {}
                <Select
                  value={form.type}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onValueChange={(v: any) => setForm({ ...form, type: v })}
                >
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Значение</Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) =>
                    setForm({ ...form, value: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Макс. использований (0 = безлимит)</Label>
                <Input
                  type="number"
                  value={form.maxUses}
                  onChange={(e) =>
                    setForm({ ...form, maxUses: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>На 1 пользователя</Label>
                <Input
                  type="number"
                  value={form.maxUsesPerUser}
                  onChange={(e) =>
                    setForm({ ...form, maxUsesPerUser: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Мин. сумма заказа (0 = без ограничений)</Label>
              <Input
                type="number"
                value={form.minOrderAmount}
                onChange={(e) =>
                  setForm({ ...form, minOrderAmount: Number(e.target.value) })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Действует с</Label>
                <Input
                  type="date"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm({ ...form, startsAt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Действует до</Label>
                <Input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) =>
                    setForm({ ...form, expiresAt: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !form.code ||
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

      {/* Redemptions Dialog */}
      <Dialog
        open={!!showRedemptions}
        onOpenChange={(open) => !open && setShowRedemptions(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>История использований</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {redemptionsData?.data?.length > 0 ? (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              redemptionsData.data.map((r: any) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {r.userName || r.userId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString("ru-RU")}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {r.discount?.toLocaleString() ||
                      r.pointsEarned?.toLocaleString() ||
                      "—"}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Нет использований
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
