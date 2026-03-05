"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Coffee,
  Gift,
  UserPlus,
  ShoppingCart,
  Star,
  Send,
  Phone,
  Smartphone,
  MessageCircle,
  Share2,
  Flame,
  Trophy,
  Cake,
  Coins,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import TableSkeleton from "@/components/admin/TableSkeleton";
import Pagination from "@/components/admin/Pagination";
import AdminFormField from "@/components/admin/AdminFormField";
import type { BonusAction } from "@/lib/types";

const ICON_MAP: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  Coffee,
  Gift,
  UserPlus,
  ShoppingCart,
  Star,
  Send,
  Phone,
  Smartphone,
  MessageCircle,
  Share2,
  Flame,
  Trophy,
  Cake,
  Coins,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

const emptyAction = {
  title: "",
  description: "",
  icon: "Gift",
  points_amount: "",
  type: "earn" as "earn" | "spend",
  is_active: true,
  sort_order: 0,
};

type TabFilter = "all" | "earn" | "spend";

export default function AdminBonusActionsPage() {
  const { showToast } = useToast();
  const t = useTranslations("admin.bonusActions");
  const tc = useTranslations("common");
  const [actions, setActions] = useState<BonusAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyAction);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [tab, setTab] = useState<TabFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchActions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bonus_actions")
      .select("*")
      .order("type", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      showToast(t("loadError"), "error");
    } else {
      setActions(data as BonusAction[]);
    }
    setLoading(false);
  }, [showToast, t]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const filtered =
    tab === "all" ? actions : actions.filter((a) => a.type === tab);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyAction);
    setFormOpen(true);
  };

  const openEdit = (action: BonusAction) => {
    setEditingId(action.id);
    setForm({
      title: action.title,
      description: action.description,
      icon: action.icon,
      points_amount: action.points_amount,
      type: action.type,
      is_active: action.is_active,
      sort_order: action.sort_order,
    });
    setFormOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("bonus_actions")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      showToast(t("deleteError"), "error");
    } else {
      showToast(t("deleted"), "success");
      fetchActions();
    }
    setDeleteTarget(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      title: form.title,
      description: form.description,
      icon: form.icon,
      points_amount: form.points_amount,
      type: form.type,
      is_active: form.is_active,
      sort_order: form.sort_order,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("bonus_actions")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        showToast(t("updated"), "success");
      } else {
        const { error } = await supabase.from("bonus_actions").insert(payload);
        if (error) throw error;
        showToast(t("created"), "success");
      }
      setFormOpen(false);
      fetchActions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("saveError");
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(filtered.length / pageSize);
  const safePage = Math.min(currentPage, Math.max(totalPages, 1));
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const renderIcon = (iconName: string, size = 18) => {
    const Icon = ICON_MAP[iconName];
    return Icon ? <Icon size={size} /> : <Gift size={size} />;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {(["all", "earn", "spend"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setCurrentPage(1);
              }}
              className={[
                "px-4 py-2 text-sm font-medium rounded-xl transition-all",
                tab === key
                  ? "bg-espresso text-white shadow-md"
                  : "bg-foam text-espresso/60 hover:text-espresso hover:bg-espresso/10",
              ].join(" ")}
            >
              {t(`tabs.${key}`)}
            </button>
          ))}
          <span className="text-sm text-espresso/50 ml-2">
            {t("count", { count: filtered.length })}
          </span>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-espresso to-espresso-light rounded-xl hover:shadow-lg transition-all"
        >
          <Plus size={16} />
          {t("add")}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-espresso/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-espresso/10 bg-foam/50">
                <th className="text-left px-4 py-3 font-medium text-espresso/50">
                  {t("table.title")}
                </th>
                <th className="text-center px-4 py-3 font-medium text-espresso/50">
                  {t("table.icon")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-espresso/50">
                  {t("table.points")}
                </th>
                <th className="text-center px-4 py-3 font-medium text-espresso/50">
                  {t("table.type")}
                </th>
                <th className="text-center px-4 py-3 font-medium text-espresso/50">
                  {t("table.active")}
                </th>
                <th className="text-center px-4 py-3 font-medium text-espresso/50">
                  {t("table.sort")}
                </th>
                <th className="text-right px-4 py-3 font-medium text-espresso/50">
                  {t("table.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} columns={7} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-espresso/40"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                paginated.map((action) => (
                  <tr
                    key={action.id}
                    className="border-b border-espresso/5 hover:bg-foam/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-espresso">
                        {action.title}
                      </div>
                      {action.description && (
                        <div className="text-xs text-espresso/40 mt-0.5 line-clamp-1">
                          {action.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-espresso/60">
                      {renderIcon(action.icon)}
                    </td>
                    <td className="px-4 py-3 text-espresso/60 font-mono text-xs">
                      {action.points_amount || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={[
                          "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium",
                          action.type === "earn"
                            ? "bg-mint/10 text-mint"
                            : "bg-amber-50 text-amber-600",
                        ].join(" ")}
                      >
                        {action.type === "earn"
                          ? t("typeEarn")
                          : t("typeSpend")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={[
                          "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium",
                          action.is_active
                            ? "bg-mint/10 text-mint"
                            : "bg-red-50 text-red-500",
                        ].join(" ")}
                      >
                        {action.is_active ? t("activeYes") : t("activeNo")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-espresso/50 text-xs">
                      {action.sort_order}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(action)}
                          aria-label={tc("edit")}
                          className="p-2 text-espresso/40 hover:text-espresso transition-colors rounded-lg hover:bg-foam"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              id: action.id,
                              title: action.title,
                            })
                          }
                          aria-label={tc("delete")}
                          className="p-2 text-espresso/40 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={safePage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t("deleteTitle")}
        message={t("deleteMessage", { name: deleteTarget?.title ?? "" })}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Form Modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bonus-action-form-title"
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-espresso/10">
              <h2
                id="bonus-action-form-title"
                className="text-lg font-bold text-espresso"
              >
                {editingId ? t("editTitle") : t("newTitle")}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label={tc("close")}
                className="text-espresso/40 hover:text-espresso transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Title */}
              <AdminFormField label={t("form.title")} required>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                  required
                  className="admin-input"
                />
              </AdminFormField>

              {/* Description */}
              <AdminFormField label={t("form.description")}>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  rows={2}
                  className="admin-input resize-y"
                />
              </AdminFormField>

              {/* Icon + Points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AdminFormField label={t("form.icon")}>
                  <div className="flex items-center gap-2">
                    <select
                      value={form.icon}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, icon: e.target.value }))
                      }
                      className="admin-input flex-1"
                    >
                      {ICON_OPTIONS.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <div className="w-10 h-10 flex items-center justify-center bg-foam rounded-xl text-espresso/60">
                      {renderIcon(form.icon, 20)}
                    </div>
                  </div>
                </AdminFormField>
                <AdminFormField label={t("form.pointsAmount")}>
                  <input
                    type="text"
                    value={form.points_amount}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, points_amount: e.target.value }))
                    }
                    placeholder={t("form.pointsAmountPlaceholder")}
                    className="admin-input"
                  />
                </AdminFormField>
              </div>

              {/* Type + Sort + Active */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <AdminFormField label={t("form.type")}>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        type: e.target.value as "earn" | "spend",
                      }))
                    }
                    className="admin-input"
                  >
                    <option value="earn">{t("typeEarn")}</option>
                    <option value="spend">{t("typeSpend")}</option>
                  </select>
                </AdminFormField>
                <AdminFormField label={t("form.sortOrder")}>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        sort_order: Number(e.target.value),
                      }))
                    }
                    className="admin-input"
                  />
                </AdminFormField>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, is_active: e.target.checked }))
                      }
                      className="admin-checkbox"
                    />
                    <span className="text-sm text-espresso/70">
                      {t("table.active")}
                    </span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-espresso/60 hover:text-espresso bg-foam rounded-xl transition-colors"
                >
                  {tc("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-espresso to-espresso-light rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {saving ? tc("saving") : editingId ? tc("save") : tc("add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
