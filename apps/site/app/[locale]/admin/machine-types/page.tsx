"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Plus, Search, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { cmsGetAll, cmsUpdate, cmsDelete } from "@/lib/admin-api";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MachineTypeForm from "@/components/admin/MachineTypeForm";
import Pagination from "@/components/admin/Pagination";
import TableSkeleton from "@/components/admin/TableSkeleton";
import type { MachineTypeDetail } from "@/lib/types";

export default function AdminMachineTypesPage() {
  const { showToast } = useToast();
  const t = useTranslations("admin.machineTypes");
  const tc = useTranslations("common");
  const [types, setTypes] = useState<MachineTypeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MachineTypeDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchTypes = useCallback(async () => {
    const { data, error } = await cmsGetAll<MachineTypeDetail>("machine_types");

    if (error) {
      showToast(t("loadError"), "error");
    } else {
      setTypes((data ?? []) as MachineTypeDetail[]);
    }
    setLoading(false);
  }, [showToast, t]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const handleToggleActive = async (item: MachineTypeDetail) => {
    const { error } = await cmsUpdate("machine_types", item.id, {
      is_active: !item.is_active,
    });
    if (error) {
      showToast(t("saveError"), "error");
    } else {
      fetchTypes();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await cmsDelete("machine_types", deleteTarget.id);
    if (error) {
      showToast(t("deleteError"), "error");
    } else {
      showToast(t("deleted"), "success");
      fetchTypes();
    }
    setDeleteTarget(null);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: MachineTypeDetail) => {
    setEditing(item);
    setFormOpen(true);
  };

  const filtered = types.filter(
    (mt) =>
      mt.name.toLowerCase().includes(search.toLowerCase()) ||
      (mt.model_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      mt.slug.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const safePage = Math.min(currentPage, Math.max(totalPages, 1));
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso/30"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t("searchPlaceholder")}
            className="admin-input !pl-9 w-full"
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-espresso to-espresso-light rounded-xl hover:shadow-lg transition-all shrink-0"
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
                  {t("table.name")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-espresso/50">
                  {t("table.model")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-espresso/50">
                  {t("table.slug")}
                </th>
                <th className="text-center px-4 py-3 font-medium text-espresso/50">
                  {t("table.specs")}
                </th>
                <th className="text-center px-4 py-3 font-medium text-espresso/50">
                  {t("table.status")}
                </th>
                <th className="text-right px-4 py-3 font-medium text-espresso/50">
                  {t("table.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={3} columns={6} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-espresso/40"
                  >
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                paginated.map((mt) => (
                  <tr
                    key={mt.id}
                    className="border-b border-espresso/5 hover:bg-foam/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {mt.hero_image_url && (
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-foam shrink-0">
                            <Image
                              src={mt.hero_image_url}
                              alt=""
                              fill
                              sizes="32px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-espresso">
                            {mt.name}
                          </div>
                          {mt.badge && (
                            <span className="inline-block mt-0.5 text-[10px] font-medium text-caramel bg-caramel/10 px-1.5 py-0.5 rounded-full">
                              {mt.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-espresso/60">
                      {mt.model_name ?? "---"}
                    </td>
                    <td className="px-4 py-3 text-espresso/40 font-mono text-xs">
                      {mt.slug}
                    </td>
                    <td className="px-4 py-3 text-center text-espresso/60 tabular-nums">
                      {mt.specs.length}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={[
                          "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium",
                          mt.is_active
                            ? "bg-mint/10 text-mint"
                            : "bg-red-50 text-red-500",
                        ].join(" ")}
                      >
                        {mt.is_active ? t("active") : t("inactive")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(mt)}
                          className="p-2 text-espresso/40 hover:text-espresso transition-colors rounded-lg hover:bg-foam"
                          aria-label={
                            mt.is_active ? t("deactivate") : t("activate")
                          }
                          title={mt.is_active ? t("deactivate") : t("activate")}
                        >
                          {mt.is_active ? (
                            <Eye size={15} />
                          ) : (
                            <EyeOff size={15} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(mt)}
                          aria-label={tc("edit")}
                          className="p-2 text-espresso/40 hover:text-espresso transition-colors rounded-lg hover:bg-foam"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({ id: mt.id, name: mt.name })
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
        message={t("deleteMessage", { name: deleteTarget?.name ?? "" })}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {formOpen && (
        <MachineTypeForm
          machineType={editing}
          onClose={() => setFormOpen(false)}
          onSaved={fetchTypes}
        />
      )}
    </div>
  );
}
