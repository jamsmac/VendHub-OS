"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Minus,
  MapPin,
  Package,
  TrendingUp,
  Building2,
  Gift,
  Coffee,
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
  UserPlus,
  ShoppingCart,
  Briefcase,
  Heart,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import TableSkeleton from "@/components/admin/TableSkeleton";
import Pagination from "@/components/admin/Pagination";
import AdminFormField from "@/components/admin/AdminFormField";
import { COLOR_SCHEMES } from "@/lib/data";
import type { PartnershipModel } from "@/lib/types";

const ICON_MAP: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  MapPin,
  Package,
  TrendingUp,
  Building2,
  Gift,
  Coffee,
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
  UserPlus,
  ShoppingCart,
  Briefcase,
  Heart,
  Zap,
};
const ICON_OPTIONS = Object.keys(ICON_MAP);
const COLOR_OPTIONS = Object.keys(COLOR_SCHEMES);

const emptyModel = {
  key: "",
  title: "",
  title_uz: "",
  description: "",
  description_uz: "",
  icon: "Gift",
  color_scheme: "mint",
  benefits: [] as string[],
  benefits_uz: [] as string[],
  is_active: true,
  sort_order: 0,
};

export default function PartnershipModelsTab() {
  const { showToast } = useToast();
  const t = useTranslations("admin.partnership.models");
  const tc = useTranslations("common");
  const [models, setModels] = useState<PartnershipModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyModel);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchModels = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("partnership_models")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      showToast(t("loadError"), "error");
    } else {
      setModels(data as PartnershipModel[]);
    }
    setLoading(false);
  }, [showToast, t]);

  useEffect(() => {
    supabase
      .from("partnership_models")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (error) showToast(t("loadError"), "error");
        else setModels(data as PartnershipModel[]);
        setLoading(false);
      });
  }, [showToast, t]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyModel);
    setFormOpen(true);
  };

  const openEdit = (model: PartnershipModel) => {
    setEditingId(model.id);
    setForm({
      key: model.key,
      title: model.title,
      title_uz: model.title_uz ?? "",
      description: model.description,
      description_uz: model.description_uz ?? "",
      icon: model.icon,
      color_scheme: model.color_scheme,
      benefits: Array.isArray(model.benefits) ? [...model.benefits] : [],
      benefits_uz: Array.isArray(model.benefits_uz)
        ? [...model.benefits_uz]
        : [],
      is_active: model.is_active,
      sort_order: model.sort_order,
    });
    setFormOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("partnership_models")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      showToast(t("deleteError"), "error");
    } else {
      showToast(t("deleted"), "success");
      fetchModels();
    }
    setDeleteTarget(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      key: form.key.trim().toLowerCase().replace(/\s+/g, "-"),
      title: form.title,
      title_uz: form.title_uz,
      description: form.description,
      description_uz: form.description_uz,
      icon: form.icon,
      color_scheme: form.color_scheme,
      benefits: form.benefits.filter(Boolean),
      benefits_uz: form.benefits_uz.filter(Boolean),
      is_active: form.is_active,
      sort_order: form.sort_order,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("partnership_models")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        showToast(t("updated"), "success");
      } else {
        const { error } = await supabase
          .from("partnership_models")
          .insert(payload);
        if (error) throw error;
        showToast(t("created"), "success");
      }
      setFormOpen(false);
      fetchModels();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("saveError");
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const addBenefit = (lang: "benefits" | "benefits_uz") => {
    setForm((p) => ({ ...p, [lang]: [...p[lang], ""] }));
  };

  const removeBenefit = (lang: "benefits" | "benefits_uz", index: number) => {
    setForm((p) => ({ ...p, [lang]: p[lang].filter((_, i) => i !== index) }));
  };

  const updateBenefit = (
    lang: "benefits" | "benefits_uz",
    index: number,
    value: string,
  ) => {
    setForm((p) => {
      const arr = [...p[lang]];
      arr[index] = value;
      return { ...p, [lang]: arr };
    });
  };

  const totalPages = Math.ceil(models.length / pageSize);
  const safePage = Math.min(currentPage, Math.max(totalPages, 1));
  const paginated = models.slice(
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
        <span className="text-sm text-espresso/50">
          {t("count", { count: models.length })}
        </span>
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
                <th className="text-center px-4 py-3 font-medium text-espresso/50">
                  {t("table.icon")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-espresso/50">
                  {t("table.title")}
                </th>
                <th className="text-center px-4 py-3 font-medium text-espresso/50">
                  {t("table.color")}
                </th>
                <th className="text-center px-4 py-3 font-medium text-espresso/50">
                  {t("table.benefits")}
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
                <TableSkeleton rows={4} columns={7} />
              ) : models.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-espresso/40"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                paginated.map((model) => {
                  const scheme =
                    COLOR_SCHEMES[model.color_scheme] ?? COLOR_SCHEMES.mint;
                  return (
                    <tr
                      key={model.id}
                      className="border-b border-espresso/5 hover:bg-foam/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-center">
                        <div
                          className={`w-9 h-9 rounded-lg ${scheme.bg} flex items-center justify-center mx-auto ${scheme.text}`}
                        >
                          {renderIcon(model.icon)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-espresso">
                          {model.title}
                        </div>
                        {model.description && (
                          <div className="text-xs text-espresso/40 mt-0.5 line-clamp-1">
                            {model.description}
                          </div>
                        )}
                        <div className="text-xs text-espresso/30 font-mono mt-0.5">
                          {model.key}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block w-6 h-6 rounded-full ${scheme.bg} border border-espresso/10`}
                          title={COLOR_SCHEMES[model.color_scheme]?.label}
                        />
                      </td>
                      <td className="px-4 py-3 text-center text-espresso/50 text-xs">
                        {Array.isArray(model.benefits)
                          ? model.benefits.length
                          : 0}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={[
                            "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium",
                            model.is_active
                              ? "bg-mint/10 text-mint"
                              : "bg-red-50 text-red-500",
                          ].join(" ")}
                        >
                          {model.is_active ? t("activeYes") : t("activeNo")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-espresso/50 text-xs">
                        {model.sort_order}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(model)}
                            aria-label={tc("edit")}
                            className="p-2 text-espresso/40 hover:text-espresso transition-colors rounded-lg hover:bg-foam"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                id: model.id,
                                title: model.title,
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={safePage}
        totalItems={models.length}
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
          aria-labelledby="partnership-model-form-title"
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-espresso/10">
              <h2
                id="partnership-model-form-title"
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
              {/* Key */}
              <AdminFormField label={t("form.key")} required>
                <input
                  type="text"
                  value={form.key}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, key: e.target.value }))
                  }
                  placeholder={t("form.keyPlaceholder")}
                  required
                  readOnly={!!editingId}
                  className={`admin-input ${editingId ? "opacity-60" : ""}`}
                />
              </AdminFormField>

              {/* Title RU + UZ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <AdminFormField label={t("form.titleUz")}>
                  <input
                    type="text"
                    value={form.title_uz}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, title_uz: e.target.value }))
                    }
                    className="admin-input"
                  />
                </AdminFormField>
              </div>

              {/* Description RU + UZ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <AdminFormField label={t("form.descriptionUz")}>
                  <textarea
                    value={form.description_uz}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, description_uz: e.target.value }))
                    }
                    rows={2}
                    className="admin-input resize-y"
                  />
                </AdminFormField>
              </div>

              {/* Icon + Color */}
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
                    <div
                      className={`w-10 h-10 flex items-center justify-center rounded-xl ${COLOR_SCHEMES[form.color_scheme]?.bg ?? "bg-foam"} ${COLOR_SCHEMES[form.color_scheme]?.text ?? "text-espresso/60"}`}
                    >
                      {renderIcon(form.icon, 20)}
                    </div>
                  </div>
                </AdminFormField>
                <AdminFormField label={t("form.colorScheme")}>
                  <div className="flex items-center gap-2">
                    <select
                      value={form.color_scheme}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, color_scheme: e.target.value }))
                      }
                      className="admin-input flex-1"
                    >
                      {COLOR_OPTIONS.map((key) => (
                        <option key={key} value={key}>
                          {COLOR_SCHEMES[key].label}
                        </option>
                      ))}
                    </select>
                    <div
                      className={`w-10 h-10 rounded-xl ${COLOR_SCHEMES[form.color_scheme]?.bg ?? "bg-foam"} border border-espresso/10`}
                    />
                  </div>
                </AdminFormField>
              </div>

              {/* Benefits RU */}
              <AdminFormField label={t("form.benefits")}>
                <div className="space-y-2">
                  {form.benefits.map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={b}
                        onChange={(e) =>
                          updateBenefit("benefits", i, e.target.value)
                        }
                        placeholder={t("form.benefitPlaceholder")}
                        className="admin-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeBenefit("benefits", i)}
                        className="p-2 text-espresso/40 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addBenefit("benefits")}
                    className="text-sm text-caramel hover:text-caramel-dark flex items-center gap-1"
                  >
                    <Plus size={14} /> {t("form.addBenefit")}
                  </button>
                </div>
              </AdminFormField>

              {/* Benefits UZ */}
              <AdminFormField label={t("form.benefitsUz")}>
                <div className="space-y-2">
                  {form.benefits_uz.map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={b}
                        onChange={(e) =>
                          updateBenefit("benefits_uz", i, e.target.value)
                        }
                        placeholder={t("form.benefitPlaceholder")}
                        className="admin-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeBenefit("benefits_uz", i)}
                        className="p-2 text-espresso/40 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addBenefit("benefits_uz")}
                    className="text-sm text-caramel hover:text-caramel-dark flex items-center gap-1"
                  >
                    <Plus size={14} /> {t("form.addBenefit")}
                  </button>
                </div>
              </AdminFormField>

              {/* Sort + Active */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      {t("form.isActive")}
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
