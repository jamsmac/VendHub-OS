"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, X, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import TableSkeleton from "@/components/admin/TableSkeleton";
import Pagination from "@/components/admin/Pagination";
import ImageUpload from "@/components/admin/ImageUpload";
import AdminFormField from "@/components/admin/AdminFormField";
import type { Partner } from "@/lib/types";

export default function PartnersTab() {
  const { showToast } = useToast();
  const t = useTranslations("admin.partners");
  const tc = useTranslations("common");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      showToast(t("loadError"), "error");
    } else {
      setPartners(data as Partner[]);
    }
    setLoading(false);
  }, [showToast, t]);

  useEffect(() => {
    supabase
      .from("partners")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (error) showToast(t("loadError"), "error");
        else setPartners(data as Partner[]);
        setLoading(false);
      });
  }, [showToast, t]);

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setLogoUrl("");
    setWebsiteUrl("");
    setDescription("");
    setSortOrder(0);
    setFormOpen(true);
  };

  const openEdit = (partner: Partner) => {
    setEditingId(partner.id);
    setName(partner.name);
    setLogoUrl(partner.logo_url ?? "");
    setWebsiteUrl(partner.website_url ?? "");
    setDescription(partner.description ?? "");
    setSortOrder(partner.sort_order);
    setFormOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("partners")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      showToast(t("deleteError"), "error");
    } else {
      showToast(t("deleted"), "success");
      fetchPartners();
    }
    setDeleteTarget(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name,
      logo_url: logoUrl || null,
      website_url: websiteUrl || null,
      description: description || null,
      sort_order: sortOrder,
    };
    try {
      if (editingId) {
        const { error } = await supabase
          .from("partners")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        showToast(t("updated"), "success");
      } else {
        const { error } = await supabase.from("partners").insert(payload);
        if (error) throw error;
        showToast(t("created"), "success");
      }
      setFormOpen(false);
      fetchPartners();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("saveError");
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(partners.length / pageSize);
  const safePage = Math.min(currentPage, Math.max(totalPages, 1));
  const paginated = partners.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-espresso/50">
          {t("count", { count: partners.length })}
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-espresso to-espresso-light rounded-xl hover:shadow-lg transition-all"
        >
          <Plus size={16} /> {t("add")}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-espresso/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-espresso/10 bg-foam/50">
                <th className="text-left px-4 py-3 font-medium text-espresso/50">
                  {t("table.name")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-espresso/50">
                  {t("table.logo")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-espresso/50">
                  {t("table.website")}
                </th>
                <th className="text-center px-4 py-3 font-medium text-espresso/50">
                  {t("table.sortOrder")}
                </th>
                <th className="text-right px-4 py-3 font-medium text-espresso/50">
                  {t("table.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={3} columns={5} />
              ) : partners.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-12 text-espresso/40"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                paginated.map((partner) => (
                  <tr
                    key={partner.id}
                    className="border-b border-espresso/5 hover:bg-foam/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-espresso">
                      {partner.name}
                    </td>
                    <td className="px-4 py-3">
                      {partner.logo_url ? (
                        <Image
                          src={partner.logo_url}
                          alt={partner.name}
                          width={32}
                          height={32}
                          className="rounded object-contain bg-foam"
                        />
                      ) : (
                        <span className="text-espresso/30 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {partner.website_url ? (
                        <a
                          href={partner.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-espresso/60 hover:text-espresso transition-colors max-w-[200px] truncate"
                        >
                          <ExternalLink size={12} className="shrink-0" />
                          <span className="truncate">
                            {partner.website_url.replace(/^https?:\/\//, "")}
                          </span>
                        </a>
                      ) : (
                        <span className="text-espresso/30 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-espresso/50 tabular-nums">
                      {partner.sort_order}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(partner)}
                          aria-label={tc("edit")}
                          className="p-2 text-espresso/40 hover:text-espresso transition-colors rounded-lg hover:bg-foam"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              id: partner.id,
                              name: partner.name,
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
        totalItems={partners.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t("deleteTitle")}
        message={t("deleteMessage", { name: deleteTarget?.name ?? "" })}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="partner-form-title"
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-espresso/10">
              <h2
                id="partner-form-title"
                className="text-lg font-bold text-espresso"
              >
                {editingId ? t("form.editTitle") : t("form.createTitle")}
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
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <AdminFormField label={t("form.name")} required>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="admin-input"
                />
              </AdminFormField>
              <AdminFormField label={t("form.logo")}>
                <ImageUpload
                  value={logoUrl || null}
                  onChange={(url) => setLogoUrl(url ?? "")}
                  folder="partners"
                />
              </AdminFormField>
              <AdminFormField label={t("form.website")}>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="admin-input"
                />
              </AdminFormField>
              <AdminFormField label={t("form.description")}>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="admin-input w-full resize-y"
                />
              </AdminFormField>
              <AdminFormField label={t("form.sortOrder")}>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="admin-input"
                />
              </AdminFormField>
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
