"use client";

import { Plus, FileText, Truck, Settings } from "lucide-react";

const QUICK_ACTIONS_LIST = [
  {
    icon: Plus,
    label: "Создать задачу",
    color: "bg-blue-500 hover:bg-blue-600",
    textColor: "text-blue-500",
  },
  {
    icon: FileText,
    label: "Отчёт дня",
    color: "bg-amber-500 hover:bg-amber-600",
    textColor: "text-amber-500",
  },
  {
    icon: Truck,
    label: "Пополнение",
    color: "bg-emerald-500 hover:bg-emerald-600",
    textColor: "text-emerald-500",
  },
  {
    icon: Settings,
    label: "Проверка",
    color: "bg-cyan-500 hover:bg-cyan-600",
    textColor: "text-cyan-500",
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {QUICK_ACTIONS_LIST.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            className="group flex flex-col items-center gap-2 rounded-xl border border-stone-100 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <div
              className={`rounded-xl p-2.5 text-white ${action.color} transition-transform group-hover:scale-110`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-espresso-dark">
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
