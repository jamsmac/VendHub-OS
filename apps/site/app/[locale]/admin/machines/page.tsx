"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MachineForm from "@/components/admin/MachineForm";
import AdminSearchToolbar from "@/components/admin/AdminSearchToolbar";
import Pagination from "@/components/admin/Pagination";
import TableSkeleton from "@/components/admin/TableSkeleton";
import type { Machine } from "@/lib/types";

export default function AdminMachinesPage() {
  const { showToast } = useToast();
  const t = useTranslations("admin.machines");
  const tc = useTranslations("common");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchMachines = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        showToast(t("loadError"), "error");
      } else {
        setMachines(data as Machine[]);
      }
    } catch (err: unknown) {
      console.error("Machines fetch failed:", err);
      showToast(t("loadError"), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("machines")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      showToast(t("deleteError"), "error");
    } else {
      showToast(t("deleted"), "success");
      fetchMachines();
    }
    setDeleteTarget(null);
  };

  const openCreate = () => {
    setEditingMachine(null);
    setFormOpen(true);
  };

  const openEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setFormOpen(true);
  };

  const filtered = machines.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.address.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const safePage = Math.min(currentPage, Math.max(totalPages, 1));
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <div className="space-y-4">
      <AdminSearchToolbar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setCurrentPage(1);
        }}
        placeholder={t("searchPlaceholder")}
        onAdd={openCreate}
        addLabel={t("add")}
      />

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
                  {t("table.address")}
                </th>
                <th className="text-left px-4 py-3 font-medium text-espresso/50">
                  {t("table.type")}
                </th>
                <th className="text-center px-4 py-3 font-medium text-espresso/50">
                  {t("table.status")}
                </th>
                <th className="text-center px-4 py-3 font-medium text-espresso/50">
                  {t("table.rating")}
                </th>
                <th className="text-right px-4 py-3 font-medium text-espresso/50">
                  {t("table.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} columns={6} />
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
                paginated.map((machine) => (
                  <tr
                    key={machine.id}
                    className="border-b border-espresso/5 hover:bg-foam/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-espresso">
                      {machine.name}
                    </td>
                    <td className="px-4 py-3 text-espresso/60 max-w-xs truncate">
                      {machine.address}
                    </td>
                    <td className="px-4 py-3 text-espresso/60">
                      {t(`typeLabels.${machine.type}`)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={[
                          "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium",
                          machine.status === "online"
                            ? "bg-mint/10 text-mint"
                            : "bg-red-50 text-red-500",
                        ].join(" ")}
                      >
                        {machine.status === "online"
                          ? t("online")
                          : t("offline")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-espresso/60">
                      {machine.rating.toFixed(1)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(machine)}
                          aria-label={tc("edit")}
                          className="p-2 text-espresso/40 hover:text-espresso transition-colors rounded-lg hover:bg-foam"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              id: machine.id,
                              name: machine.name,
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
        message={t("deleteMessage", { name: deleteTarget?.name ?? "" })}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Machine Form Modal */}
      {formOpen && (
        <MachineForm
          machine={editingMachine}
          onClose={() => setFormOpen(false)}
          onSaved={fetchMachines}
        />
      )}
    </div>
  );
}
