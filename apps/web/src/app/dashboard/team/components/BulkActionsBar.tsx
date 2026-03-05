"use client";

import { Shield, Building, UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BulkActionsBarProps {
  count: number;
  onClear: () => void;
}

export function BulkActionsBar({ count, onClear }: BulkActionsBarProps) {
  if (count === 0) return null;

  return (
    <Card className="coffee-card border-amber-200 bg-amber-50/50">
      <CardContent className="p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-espresso-dark">
          Выбрано: {count} сотрудников
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Shield className="h-4 w-4" />
            Роль
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Building className="h-4 w-4" />
            Зона
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-red-600">
            <UserX className="h-4 w-4" />
            Деактивировать
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Очистить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
