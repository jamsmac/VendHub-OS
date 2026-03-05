"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, X, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import TableSkeleton from "@/components/admin/TableSkeleton";
import Pagination from "@/components/admin/Pagination";
import AdminFormField from "@/components/admin/AdminFormField";
import type { Promotion } from "@/lib/types";

const emptyPromotion = {
  title: "",
  badge: "",
  description: "",
  promo_code: "",
  gradient: "from-caramel to-caramel-dark",
  conditions: [] as string[],
  valid_until: "",
  is_active: true,
  sort_order: 0,
  visibility_type: "visible" as "visible" | "action_required",
  action_instruction: "",
  discount_type: "" as string,
  discount_value: "",
};

export default function AdminPromotionsPage() {
  const { showToast } = useToast();
  const t = useTranslations("admin.promotions");
  const tc = useTranslations("common");
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState(emptyPromotion);
  const [conditionInput, setConditionInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      showToast(t("loadError"), "error");
    } else {
      setPromotions(data as Promotion[]);
    }
    setLoading(false);
  }, [showToast, t]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyPromotion);
    setConditionInput("");
    setFormOpen(true);
  };

  const openEdit = (promo: Promotion) => {
    setEditingId(promo.id);
    setForm({
      title: promo.title,
      badge: promo.badge,
      description: promo.description,
      promo_code: promo.promo_code ?? "",
      gradient: promo.gradient,
      conditions: promo.conditions ?? [],
      valid_until: promo.valid_until ?? "",
      is_active: promo.is_active,
      sort_order: promo.sort_order,
      visibility_type: promo.visibility_type ?? "visible",
      action_instruction: promo.action_instruction ?? "",
      discount_type: promo.discount_type ?? "",
      discount_value: promo.discount_value ?? "",
    });
    setConditionInput("");
    setFormOpen(true);
  };

  const openDuplicate = (promo: Promotion) => {
    setEditingId(null);
    setForm({
      title: promo.title + " (copy)",
      badge: promo.badge,
      description: promo.description,
      promo_code: "",
      gradient: promo.gradient,
      conditions: promo.conditions ?? [],
      valid_until: promo.valid_until ?? "",
      is_active: false,
      sort_order: promo.sort_order + 1,
      visibility_type: promo.visibility_type ?? "visible",
      action_instruction: promo.action_instruction ?? "",
      discount_type: promo.discount_type ?? "",
      discount_value: promo.discount_value ?? "",
    });
    setConditionInput("");
    setFormOpen(true);
    showToast(t("duplicated"), "success");
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("promotions")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      showToast(t("deleteError"), "error");
    } else {
      showToast(t("deleted"), "success");
      fetchPromotions();
    }
    setDeleteTarget(null);
  };

  const addCondition = () => {
    const trimmed = conditionInput.trim();
    if (!trimmed) return;
    setForm((prev) => ({ ...prev, conditions: [...prev.conditions, trimmed] }));
    setConditionInput("");
  };

  const removeCondition = (index: number) => {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      title: form.title,
      badge: form.badge,
      description: form.description,
      promo_code: form.promo_code || null,
      gradient: form.gradient,
      conditions: form.conditions,
      valid_until: form.valid_until || null,
      is_active: form.is_active,
      sort_order: form.sort_order,
      visibility_type: form.visibility_type,
      action_instruction: form.action_instruction,
      discount_type: form.discount_type || null,
      discount_value: form.discount_value || null,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("promotions")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        showToast(t("updated"), "success");
      } else {
        const { error } = await supabase.from("promotions").insert(payload);
        if (error) throw error;
        showToast(t("created"), "success");
      }
      setFormOpen(false);
      fetchPromotions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("saveError");
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(promotions.length / pageSize);
  const safePage = Math.min(currentPage, Math.max(totalPages, 1));
  const paginated = promotions.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-espresso/50">
          {t("count", { count: promotions.length })}
        </p>
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
                <th className="text-left px-4 py-3 font-medium text-espresso/50">
                  {t("table.badge")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-espresso/50">
                  {t("table.promoCode")}
                </th>
                <th className="text-center px-4 py-3 font-medium text-espresso/50">
                  {t("table.active")}
                </th>
                <th className="text-center px-4 py-3 font-medium text-espresso/50">
                  {t("table.visibility")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-espresso/50">
                  {t("table.validUntil")}
                </th>
                <th className="text-right px-4 py-3 font-medium text-espresso/50">
                  {t("table.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={4} columns={7} />
              ) : promotions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-espresso/40"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                paginated.map((promo) => (
                  <tr
                    key={promo.id}
                    className="border-b border-espresso/5 hover:bg-foam/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-espresso">
                      {promo.title}
                    </td>
                    <td className="px-4 py-3 text-espresso/60">
                      {promo.badge}
                    </td>
                    <td className="px-4 py-3 text-espresso/60 font-mono text-xs">
                      {promo.promo_code ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={[
                          "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium",
                          promo.is_active
                            ? "bg-mint/10 text-mint"
                            : "bg-red-50 text-red-500",
                        ].join(" ")}
                      >
                        {promo.is_active ? t("activeYes") : t("activeNo")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={[
                          "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium",
                          promo.visibility_type === "action_required"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-blue-50 text-blue-600",
                        ].join(" ")}
                      >
                        {promo.visibility_type === "action_required"
                          ? t("visibilityAction")
                          : t("visibilityVisible")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-espresso/60 text-xs">
                      {promo.valid_until ?? t("noExpiry")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openDuplicate(promo)}
                          aria-label={tc("duplicate")}
                          title={t("duplicate")}
                          className="p-2 text-espresso/40 hover:text-caramel-dark transition-colors rounded-lg hover:bg-caramel/10"
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(promo)}
                          aria-label={tc("edit")}
                          className="p-2 text-espresso/40 hover:text-espresso transition-colors rounded-lg hover:bg-foam"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              id: promo.id,
                              title: promo.title,
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
        totalItems={promotions.length}
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
          aria-labelledby="promotion-form-title"
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-espresso/10">
              <h2
                id="promotion-form-title"
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
              {/* Title + Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AdminFormField label={t("table.title")} required>
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
                <AdminFormField label={t("table.badge")}>
                  <input
                    type="text"
                    value={form.badge}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, badge: e.target.value }))
                    }
                    className="admin-input"
                  />
                </AdminFormField>
              </div>

              {/* Description */}
              <AdminFormField label={t("form.description")}>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  rows={3}
                  className="admin-input resize-y"
                />
              </AdminFormField>

              {/* Promo code + Gradient */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AdminFormField label={t("table.promoCode")}>
                  <input
                    type="text"
                    value={form.promo_code}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, promo_code: e.target.value }))
                    }
                    placeholder="WELCOME20"
                    className="admin-input font-mono"
                  />
                </AdminFormField>
                <AdminFormField label={t("form.gradient")}>
                  <input
                    type="text"
                    value={form.gradient}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, gradient: e.target.value }))
                    }
                    placeholder="from-caramel to-caramel-dark"
                    className="admin-input"
                  />
                </AdminFormField>
              </div>

              {/* Valid until + Sort + Active */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <AdminFormField label={t("table.validUntil")}>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, valid_until: e.target.value }))
                    }
                    className="admin-input"
                  />
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

              {/* Conditions */}
              <div>
                <label className="block text-sm font-medium text-espresso/70 mb-1.5">
                  {t("form.conditions")}
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={conditionInput}
                    onChange={(e) => setConditionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCondition();
                      }
                    }}
                    className="admin-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={addCondition}
                    className="px-3 py-2 text-sm font-medium text-espresso/60 bg-foam rounded-xl hover:bg-espresso/10 transition-colors shrink-0"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {form.conditions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.conditions.map((cond, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 bg-foam text-espresso/60 text-xs px-3 py-1.5 rounded-full"
                      >
                        {cond}
                        <button
                          type="button"
                          onClick={() => removeCondition(idx)}
                          className="text-espresso/30 hover:text-red-500 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Visibility type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AdminFormField label={t("form.visibilityType")}>
                  <select
                    value={form.visibility_type}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        visibility_type: e.target.value as
                          | "visible"
                          | "action_required",
                      }))
                    }
                    className="admin-input"
                  >
                    <option value="visible">
                      {t("form.visibilityVisible")}
                    </option>
                    <option value="action_required">
                      {t("form.visibilityAction")}
                    </option>
                  </select>
                </AdminFormField>
                {form.visibility_type === "action_required" && (
                  <AdminFormField label={t("form.actionInstruction")}>
                    <input
                      type="text"
                      value={form.action_instruction}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          action_instruction: e.target.value,
                        }))
                      }
                      placeholder={t("form.actionInstructionPlaceholder")}
                      className="admin-input"
                    />
                  </AdminFormField>
                )}
              </div>

              {/* Discount type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AdminFormField label={t("form.discountType")}>
                  <select
                    value={form.discount_type}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, discount_type: e.target.value }))
                    }
                    className="admin-input"
                  >
                    <option value="">{t("form.discountTypeNone")}</option>
                    <option value="percent">
                      {t("form.discountTypePercent")}
                    </option>
                    <option value="fixed">{t("form.discountTypeFixed")}</option>
                    <option value="special">
                      {t("form.discountTypeSpecial")}
                    </option>
                  </select>
                </AdminFormField>
                {form.discount_type && (
                  <AdminFormField label={t("form.discountValue")}>
                    <input
                      type="text"
                      value={form.discount_value}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          discount_value: e.target.value,
                        }))
                      }
                      placeholder={t("form.discountValuePlaceholder")}
                      className="admin-input"
                    />
                  </AdminFormField>
                )}
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
