"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AdminFormField from "@/components/admin/AdminFormField";
import type { LoyaltyTier, LoyaltyPrivilege } from "@/lib/types";

const emptyTier = {
  level: "",
  emoji: "",
  discount_percent: 0,
  threshold: 0,
  cashback_percent: 0,
  sort_order: 0,
};

export default function AdminLoyaltyPage() {
  const { showToast } = useToast();
  const t = useTranslations("admin.loyalty");
  const tc = useTranslations("common");

  // Tiers state
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [privileges, setPrivileges] = useState<LoyaltyPrivilege[]>([]);
  const [loading, setLoading] = useState(true);

  // Tier form
  const [tierFormOpen, setTierFormOpen] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [tierForm, setTierForm] = useState(emptyTier);
  const [savingTier, setSavingTier] = useState(false);
  const [deleteTierTarget, setDeleteTierTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Privilege matrix state: tierId -> privilegeKey -> value
  const [matrixEdits, setMatrixEdits] = useState<
    Record<string, Record<string, boolean | number | string>>
  >({});
  const [savingMatrix, setSavingMatrix] = useState(false);

  // Privilege management
  const [newPrivKey, setNewPrivKey] = useState("");
  const [newPrivLabel, setNewPrivLabel] = useState("");
  const [deletePrivTarget, setDeletePrivTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [tiersRes, privsRes] = await Promise.all([
      supabase
        .from("loyalty_tiers")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("loyalty_privileges")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

    if (tiersRes.error || privsRes.error) {
      showToast(t("loadError"), "error");
    } else {
      const tierData = tiersRes.data as LoyaltyTier[];
      const privData = privsRes.data as LoyaltyPrivilege[];
      setTiers(tierData);
      setPrivileges(privData);

      // Initialize matrix from tiers privileges
      const matrix: Record<
        string,
        Record<string, boolean | number | string>
      > = {};
      for (const tier of tierData) {
        matrix[tier.id] = { ...(tier.privileges || {}) };
      }
      setMatrixEdits(matrix);
    }
    setLoading(false);
  }, [showToast, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Tier CRUD ---

  const openCreateTier = () => {
    setEditingTierId(null);
    setTierForm(emptyTier);
    setTierFormOpen(true);
  };

  const openEditTier = (tier: LoyaltyTier) => {
    setEditingTierId(tier.id);
    setTierForm({
      level: tier.level,
      emoji: tier.emoji,
      discount_percent: tier.discount_percent,
      threshold: tier.threshold,
      cashback_percent: tier.cashback_percent,
      sort_order: tier.sort_order,
    });
    setTierFormOpen(true);
  };

  const handleTierSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSavingTier(true);

    const payload = {
      level: tierForm.level,
      emoji: tierForm.emoji,
      discount_percent: tierForm.discount_percent,
      threshold: tierForm.threshold,
      cashback_percent: tierForm.cashback_percent,
      sort_order: tierForm.sort_order,
      privileges: editingTierId
        ? matrixEdits[editingTierId] || {}
        : privileges.reduce(
            (acc, p) => ({ ...acc, [p.key]: false }),
            {} as Record<string, boolean>,
          ),
    };

    try {
      if (editingTierId) {
        const { error } = await supabase
          .from("loyalty_tiers")
          .update(payload)
          .eq("id", editingTierId);
        if (error) throw error;
        showToast(t("updated"), "success");
      } else {
        const { error } = await supabase.from("loyalty_tiers").insert(payload);
        if (error) throw error;
        showToast(t("created"), "success");
      }
      setTierFormOpen(false);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("saveError");
      showToast(message, "error");
    } finally {
      setSavingTier(false);
    }
  };

  const handleDeleteTier = async () => {
    if (!deleteTierTarget) return;
    const { error } = await supabase
      .from("loyalty_tiers")
      .delete()
      .eq("id", deleteTierTarget.id);
    if (error) {
      showToast(t("deleteError"), "error");
    } else {
      showToast(t("deleted"), "success");
      fetchData();
    }
    setDeleteTierTarget(null);
  };

  // --- Privilege Matrix ---

  const getMatrixValue = (tierId: string, key: string) => {
    return matrixEdits[tierId]?.[key];
  };

  const setMatrixValue = (
    tierId: string,
    key: string,
    value: boolean | number | string,
  ) => {
    setMatrixEdits((prev) => ({
      ...prev,
      [tierId]: { ...(prev[tierId] || {}), [key]: value },
    }));
  };

  const saveMatrix = async () => {
    setSavingMatrix(true);
    try {
      for (const tier of tiers) {
        const privileges = matrixEdits[tier.id] || {};
        const { error } = await supabase
          .from("loyalty_tiers")
          .update({ privileges })
          .eq("id", tier.id);
        if (error) throw error;
      }
      showToast(t("updated"), "success");
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("saveError");
      showToast(message, "error");
    } finally {
      setSavingMatrix(false);
    }
  };

  // --- Privilege Management ---

  const handleAddPrivilege = async () => {
    const key = newPrivKey.trim();
    const label = newPrivLabel.trim();
    if (!key || !label) return;

    const { error } = await supabase.from("loyalty_privileges").insert({
      key,
      label,
      sort_order: privileges.length,
    });
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast(t("privilegeCreated"), "success");
      setNewPrivKey("");
      setNewPrivLabel("");
      fetchData();
    }
  };

  const handleDeletePrivilege = async () => {
    if (!deletePrivTarget) return;
    const { error } = await supabase
      .from("loyalty_privileges")
      .delete()
      .eq("id", deletePrivTarget.id);
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast(t("privilegeDeleted"), "success");
      fetchData();
    }
    setDeletePrivTarget(null);
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-espresso/40">{tc("loading")}</div>
    );
  }

  return (
    <div className="space-y-8">
      {/* === SECTION 1: Tiers === */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-espresso">{t("title")}</h2>
          <button
            type="button"
            onClick={openCreateTier}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-espresso to-espresso-light rounded-xl hover:shadow-lg transition-all"
          >
            <Plus size={16} />
            {t("addTier")}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-espresso/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-espresso/10 bg-foam/50">
                  <th className="text-left px-4 py-3 font-medium text-espresso/50">
                    {t("table.level")}
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-espresso/50">
                    {t("table.emoji")}
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-espresso/50">
                    {t("table.discount")}
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-espresso/50">
                    {t("table.threshold")}
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-espresso/50">
                    {t("table.cashback")}
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-espresso/50">
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tiers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-12 text-espresso/40"
                    >
                      {t("empty")}
                    </td>
                  </tr>
                ) : (
                  tiers.map((tier) => (
                    <tr
                      key={tier.id}
                      className="border-b border-espresso/5 hover:bg-foam/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-espresso">
                        {tier.level}
                      </td>
                      <td className="px-4 py-3 text-center text-xl">
                        {tier.emoji}
                      </td>
                      <td className="px-4 py-3 text-center text-espresso/60">
                        {tier.discount_percent}%
                      </td>
                      <td className="px-4 py-3 text-center text-espresso/60 font-mono text-xs">
                        {tier.threshold.toLocaleString()} UZS
                      </td>
                      <td className="px-4 py-3 text-center text-espresso/60">
                        {tier.cashback_percent}%
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditTier(tier)}
                            aria-label={tc("edit")}
                            className="p-2 text-espresso/40 hover:text-espresso transition-colors rounded-lg hover:bg-foam"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTierTarget({
                                id: tier.id,
                                name: tier.level,
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
      </section>

      {/* === SECTION 2: Privilege Matrix === */}
      {tiers.length > 0 && privileges.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-espresso">
              {t("privilegeMatrix")}
            </h2>
            <button
              type="button"
              onClick={saveMatrix}
              disabled={savingMatrix}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-espresso to-espresso-light rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              <Save size={16} />
              {savingMatrix ? "..." : tc("save")}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-espresso/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-espresso/10 bg-foam/50">
                    <th className="text-left px-4 py-3 font-medium text-espresso/50 min-w-[160px]">
                      {t("privilegeLabel")}
                    </th>
                    {tiers.map((tier) => (
                      <th
                        key={tier.id}
                        className="text-center px-3 py-3 font-medium text-espresso/50 min-w-[100px]"
                      >
                        <span className="mr-1">{tier.emoji}</span>
                        {tier.level}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {privileges
                    .filter((p) => p.is_active)
                    .map((priv) => (
                      <tr key={priv.id} className="border-b border-espresso/5">
                        <td className="px-4 py-3 text-espresso/70 font-medium">
                          {priv.label}
                        </td>
                        {tiers.map((tier) => {
                          const val = getMatrixValue(tier.id, priv.key);
                          const isNumeric = typeof val === "number";
                          const isString =
                            typeof val === "string" && val !== "";

                          return (
                            <td key={tier.id} className="px-3 py-3 text-center">
                              {isNumeric || isString ? (
                                <input
                                  type="text"
                                  value={String(val)}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const num = Number(v);
                                    setMatrixValue(
                                      tier.id,
                                      priv.key,
                                      isNaN(num) || v === "" ? v : num,
                                    );
                                  }}
                                  className="admin-input !py-1 !px-2 text-center text-xs w-20 mx-auto"
                                />
                              ) : (
                                <label className="inline-flex items-center justify-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!val}
                                    onChange={(e) =>
                                      setMatrixValue(
                                        tier.id,
                                        priv.key,
                                        e.target.checked,
                                      )
                                    }
                                    className="admin-checkbox"
                                  />
                                </label>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* === SECTION 3: Manage Privileges === */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-espresso">
          {t("managePrivileges")}
        </h2>

        <div className="bg-white rounded-2xl border border-espresso/5 p-6 space-y-4">
          {/* Add new privilege */}
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-espresso/40 mb-1">
                {t("privilegeKey")}
              </label>
              <input
                type="text"
                value={newPrivKey}
                onChange={(e) => setNewPrivKey(e.target.value)}
                placeholder="cashback"
                className="admin-input !py-1.5 text-sm font-mono"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-espresso/40 mb-1">
                {t("privilegeLabel")}
              </label>
              <input
                type="text"
                value={newPrivLabel}
                onChange={(e) => setNewPrivLabel(e.target.value)}
                placeholder="Кэшбэк"
                className="admin-input !py-1.5 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleAddPrivilege}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-espresso to-espresso-light rounded-xl hover:shadow-lg transition-all"
            >
              <Plus size={14} />
              {t("addPrivilege")}
            </button>
          </div>

          {/* Existing privileges list */}
          {privileges.length > 0 && (
            <div className="divide-y divide-espresso/5">
              {privileges.map((priv) => (
                <div
                  key={priv.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <code className="text-xs font-mono text-espresso/40 bg-foam px-2 py-0.5 rounded">
                      {priv.key}
                    </code>
                    <span className="text-sm text-espresso">{priv.label}</span>
                    {!priv.is_active && (
                      <span className="text-xs text-red-400 bg-red-50 px-2 py-0.5 rounded-full">
                        {t("inactive")}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDeletePrivTarget({ id: priv.id, name: priv.label })
                    }
                    aria-label={tc("delete")}
                    className="p-1.5 text-espresso/30 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tier delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTierTarget}
        title={t("deleteTierTitle")}
        message={t("deleteTierMessage", { name: deleteTierTarget?.name ?? "" })}
        onConfirm={handleDeleteTier}
        onCancel={() => setDeleteTierTarget(null)}
      />

      {/* Privilege delete confirm */}
      <ConfirmDialog
        isOpen={!!deletePrivTarget}
        title={t("privilegeDeleteTitle")}
        message={t("privilegeDeleteMessage", {
          name: deletePrivTarget?.name ?? "",
        })}
        onConfirm={handleDeletePrivilege}
        onCancel={() => setDeletePrivTarget(null)}
      />

      {/* Tier Form Modal */}
      {tierFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tier-form-title"
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-espresso/10">
              <h2
                id="tier-form-title"
                className="text-lg font-bold text-espresso"
              >
                {editingTierId ? t("editTierTitle") : t("newTierTitle")}
              </h2>
              <button
                type="button"
                onClick={() => setTierFormOpen(false)}
                aria-label={tc("close")}
                className="text-espresso/40 hover:text-espresso transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleTierSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AdminFormField label={t("form.level")} required>
                  <input
                    type="text"
                    value={tierForm.level}
                    onChange={(e) =>
                      setTierForm((p) => ({ ...p, level: e.target.value }))
                    }
                    required
                    placeholder="Gold"
                    className="admin-input"
                  />
                </AdminFormField>
                <AdminFormField label={t("form.emoji")}>
                  <input
                    type="text"
                    value={tierForm.emoji}
                    onChange={(e) =>
                      setTierForm((p) => ({ ...p, emoji: e.target.value }))
                    }
                    placeholder="🥇"
                    className="admin-input text-xl"
                  />
                </AdminFormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <AdminFormField label={t("form.discount")}>
                  <input
                    type="number"
                    value={tierForm.discount_percent}
                    step="0.1"
                    onChange={(e) =>
                      setTierForm((p) => ({
                        ...p,
                        discount_percent: Number(e.target.value),
                      }))
                    }
                    className="admin-input"
                  />
                </AdminFormField>
                <AdminFormField label={t("form.threshold")}>
                  <input
                    type="number"
                    value={tierForm.threshold}
                    onChange={(e) =>
                      setTierForm((p) => ({
                        ...p,
                        threshold: Number(e.target.value),
                      }))
                    }
                    className="admin-input"
                  />
                </AdminFormField>
                <AdminFormField label={t("form.cashback")}>
                  <input
                    type="number"
                    value={tierForm.cashback_percent}
                    step="0.1"
                    onChange={(e) =>
                      setTierForm((p) => ({
                        ...p,
                        cashback_percent: Number(e.target.value),
                      }))
                    }
                    className="admin-input"
                  />
                </AdminFormField>
              </div>

              <AdminFormField label={t("form.sortOrder")}>
                <input
                  type="number"
                  value={tierForm.sort_order}
                  onChange={(e) =>
                    setTierForm((p) => ({
                      ...p,
                      sort_order: Number(e.target.value),
                    }))
                  }
                  className="admin-input"
                />
              </AdminFormField>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTierFormOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-espresso/60 hover:text-espresso bg-foam rounded-xl transition-colors"
                >
                  {tc("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={savingTier}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-espresso to-espresso-light rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {savingTier
                    ? tc("saving")
                    : editingTierId
                      ? tc("save")
                      : tc("add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
