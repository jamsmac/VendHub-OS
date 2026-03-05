"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PERMISSION_CATEGORIES } from "./constants";

interface RoleModalProps {
  open: boolean;
  onClose: () => void;
}

export function RoleModal({ open, onClose }: RoleModalProps) {
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
          Создать роль
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-espresso-light mb-1 block">
              Название
            </label>
            <Input placeholder="Название роли" />
          </div>
          <div>
            <label className="text-sm text-espresso-light mb-1 block">
              Описание
            </label>
            <Input placeholder="Описание роли" />
          </div>
          <div>
            <label className="text-sm text-espresso-light mb-1 block">
              Цвет
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
                <button
                  key={c}
                  className={`w-8 h-8 rounded-full ${c} hover:ring-2 ring-offset-2 transition-all`}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-espresso-light mb-2 block">
              Права доступа
            </label>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {PERMISSION_CATEGORIES.map((cat) => (
                <div key={cat.id}>
                  <p className="text-xs font-semibold text-espresso-dark mb-1">
                    {cat.name}
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
            Отмена
          </Button>
          <Button className="flex-1 bg-espresso hover:bg-espresso-dark">
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}
