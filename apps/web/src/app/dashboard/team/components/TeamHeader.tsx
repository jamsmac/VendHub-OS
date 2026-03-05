"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TeamHeaderProps {
  onInviteClick: () => void;
}

export function TeamHeader({ onInviteClick }: TeamHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-espresso-dark font-display">
          Команда
        </h1>
        <p className="mt-1 text-sm text-espresso-light">
          Управление сотрудниками, ролями и правами доступа (RBAC)
        </p>
      </div>
      <Button
        className="gap-2 bg-espresso hover:bg-espresso-dark"
        onClick={onInviteClick}
      >
        <Plus className="h-4 w-4" />
        Пригласить
      </Button>
    </div>
  );
}
