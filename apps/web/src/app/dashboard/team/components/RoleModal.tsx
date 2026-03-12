"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PERMISSION_CATEGORIES } from "./constants";

interface RoleModalProps {
  open: boolean;
  onClose: () => void;
}

export function RoleModal({ open, onClose }: RoleModalProps) {
  const t = useTranslations("team");

  const permCategoryLabels: Record<string, string> = {
    machines: t("permMachines"),
    inventory: t("permInventory"),
    tasks: t("permTasks"),
    finance: t("permFinance"),
    reports: t("permReports"),
    team: t("permTeam"),
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-espresso-dark mb-4">
          {t("roleModalTitle")}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-espresso-light mb-1 block">
              {t("roleName")}
            </label>
            <Input placeholder={t("roleName")} />
          </div>
          <div>
            <label className="text-sm text-espresso-light mb-1 block">
              {t("roleDescription")}
            </label>
            <Input placeholder={t("roleDescription")} />
          </div>
          <div>
            <label className="text-sm text-espresso-light mb-1 block">
              {t("roleColor")}
            </label>
            <div className="flex gap-2">
              {[
                "bg-red-500",
                "bg-blue-500",
                "bg-emerald-500",
                "bg-purple-500",
                "bg-amber-500",
                "bg-cyan-500",
                "bg-pink-500",
                "bg-gray-500",
              ].map((c) => (
                <Button
                  key={c}
                  variant="ghost"
                  className={`w-8 h-8 rounded-full p-0 ${c} hover:ring-2 ring-offset-2`}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-espresso-light mb-2 block">
              {t("rolePermissions")}
            </label>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {PERMISSION_CATEGORIES.map((cat) => (
                <div key={cat.id}>
                  <p className="text-xs font-semibold text-espresso-dark mb-1">
                    {permCategoryLabels[cat.id] || cat.name}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {cat.perms.map((perm) => (
                      <label
                        key={perm}
                        className="flex items-center gap-2 text-xs text-espresso-light hover:text-espresso-dark cursor-pointer p-1"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-espresso/30"
                        />
                        <span>{perm.replace(/_/g, " ")}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t("roleCancel")}
          </Button>
          <Button className="flex-1 bg-espresso hover:bg-espresso-dark">
            {t("roleSave")}
          </Button>
        </div>
      </div>
    </div>
  );
}
