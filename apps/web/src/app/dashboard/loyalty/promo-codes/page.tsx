"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
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

const PROMO_TYPES = [
  "fixed_discount",
  "percent_discount",
  "bonus_points",
  "free_product",
] as const;

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
  const t = useTranslations("promoCodes");
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
    mutationFn: (data: unknown) =>
      promoCodesApi.create(data as Record<string, unknown>),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      promoCodesApi.update(id, data as Record<string, unknown>),

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
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const code = Array.from(bytes, (b) => chars[b % chars.length]).join("");
    setForm({ ...form, code });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const formatTypeValue = (type: string, value: number): string => {
    switch (type) {
      case "fixed_discount":
        return t("typeFormat_fixed_discount", {
          value: value.toLocaleString(),
        });
      case "percent_discount":
        return t("typeFormat_percent_discount", { value });
      case "bonus_points":
        return t("typeFormat_bonus_points", { value });
      case "free_product":
        return t("typeFormat_free_product", { value });
      default:
        return String(value);
    }
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
          {t("newPromoCode")}
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
              <p className="text-sm text-muted-foreground">{t("statTotal")}</p>
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
              <p className="text-sm text-muted-foreground">{t("statActive")}</p>
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
              <p className="text-sm text-muted-foreground">
                {t("statRedemptions")}
              </p>
              <p className="text-xl font-bold">{totalRedemptions}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
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
            <p className="text-lg font-medium">{t("emptyTitle")}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {t("emptySubtitle")}
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("createBtn")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {codes.map((code) => {
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
                          {t("badgeInactive")}
                        </Badge>
                      )}
                      {isExpired && (
                        <Badge variant="secondary" className="text-xs">
                          {t("badgeExpired")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {code.description || t(`type_${code.type}`)}
                    </p>
                    <div className="flex gap-1.5 mt-1.5">
                      <Badge variant="outline" className="text-xs">
                        {formatTypeValue(code.type, code.value)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {t("usageCount", {
                          used: code.usedCount,
                          max: code.maxUses || "\u221E",
                        })}
                      </Badge>
                      {code.minOrderAmount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {t("minOrder", {
                            amount: code.minOrderAmount.toLocaleString(),
                          })}
                        </Badge>
                      )}
                      {code.expiresAt && (
                        <Badge
                          variant="secondary"
                          className="text-xs flex items-center gap-1"
                        >
                          <Calendar className="h-3 w-3" />
                          {t("expiresDate", {
                            date: new Date(code.expiresAt).toLocaleDateString(
                              "ru-RU",
                            ),
                          })}
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
              {editingId ? t("dialogTitleEdit") : t("dialogTitleNew")}
            </DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("labelCode")}</Label>
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
                  {t("generateBtn")}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("labelDescription")}</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder={t("descriptionPlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("labelType")}</Label>
                {}
                <Select
                  value={form.type}
                  onValueChange={(v: unknown) =>
                    setForm({
                      ...form,
                      type: v as
                        | "fixed_discount"
                        | "percent_discount"
                        | "bonus_points"
                        | "free_product",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROMO_TYPES.map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`type_${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("labelValue")}</Label>
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
                <Label>{t("labelMaxUses")}</Label>
                <Input
                  type="number"
                  value={form.maxUses}
                  onChange={(e) =>
                    setForm({ ...form, maxUses: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("labelPerUser")}</Label>
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
              <Label>{t("labelMinOrder")}</Label>
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
                <Label>{t("labelStartsAt")}</Label>
                <Input
                  type="date"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm({ ...form, startsAt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("labelExpiresAt")}</Label>
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
              {t("cancelBtn")}
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
                ? t("saving")
                : t("saveBtn")}
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
            <DialogTitle>{t("redemptionsTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {redemptionsData?.data?.length > 0 ? (
              redemptionsData.data.map((r: unknown) => {
                const redemption = r as {
                  id?: string;
                  userName?: string;
                  userId?: string;
                  createdAt?: string;
                  discount?: number;
                  pointsEarned?: number;
                };
                return (
                  <div
                    key={redemption.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {redemption.userName || redemption.userId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(redemption.createdAt || "").toLocaleString(
                          "ru-RU",
                        )}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {redemption.discount?.toLocaleString() ||
                        redemption.pointsEarned?.toLocaleString() ||
                        "\u2014"}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("noRedemptions")}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
