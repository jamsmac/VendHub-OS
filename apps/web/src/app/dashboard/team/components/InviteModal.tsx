"use client";

import { Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_META, DEPARTMENTS, ZONES } from "./constants";

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

export function InviteModal({ open, onClose }: InviteModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-espresso-dark mb-4">
          Пригласить сотрудника
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-espresso-light mb-1 block">
              Email
            </label>
            <Input placeholder="email@vendhub.uz" type="email" />
          </div>
          <div>
            <label className="text-sm text-espresso-light mb-1 block">
              Роль
            </label>
            <select className="w-full rounded-lg border border-espresso/20 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-espresso">
              {Object.entries(ROLE_META)
                .filter(([k]) => k !== "owner")
                .map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-espresso-light mb-1 block">
              Зона
            </label>
            <select className="w-full rounded-lg border border-espresso/20 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-espresso">
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-espresso-light mb-1 block">
              Отдел
            </label>
            <select className="w-full rounded-lg border border-espresso/20 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-espresso">
              {DEPARTMENTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-espresso-light mb-1 block">
              Должность
            </label>
            <Input placeholder="Оператор" />
          </div>
          <div className="p-3 rounded-lg bg-espresso-50/50 dark:bg-gray-800/50">
            <p className="text-xs text-espresso-light mb-1">
              Ссылка-приглашение
            </p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-espresso-dark flex-1 truncate">
                https://vendhub.uz/invite/abc123xyz
              </code>
              <Button variant="ghost" size="sm" className="shrink-0">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Отмена
          </Button>
          <Button className="flex-1 bg-espresso hover:bg-espresso-dark gap-2">
            <Send className="h-4 w-4" />
            Отправить
          </Button>
        </div>
      </div>
    </div>
  );
}
