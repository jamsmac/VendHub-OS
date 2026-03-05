"use client";

import { Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ACTION_ICON } from "./constants";
import type { ActivityLog } from "./types";

interface ActivityTabProps {
  logs: ActivityLog[];
}

export function ActivityTab({ logs }: ActivityTabProps) {
  return (
    <Card className="coffee-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-espresso-dark">
          История изменений
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {logs.map((act: ActivityLog) => {
          const actionMeta = ACTION_ICON[act.action];
          const ActionIcon = actionMeta?.icon || Activity;
          return (
            <div
              key={act.id}
              className="flex gap-3 pb-3 border-b border-espresso/5 last:border-0"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${actionMeta?.color}`}
              >
                <ActionIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-espresso-dark">
                  <span className="font-medium">{act.userName}</span>{" "}
                  {act.action === "create" && "добавил сотрудника"}
                  {act.action === "edit" && "отредактировал"}
                  {act.action === "delete" && "удалил"}
                  {act.action === "role_change" && "изменил роль"}
                  {act.action === "login" && "вошёл"}{" "}
                  <span className="font-medium text-espresso">
                    {act.target}
                  </span>
                </p>
                <p className="text-xs text-espresso-light mt-0.5">
                  {act.details}
                </p>
              </div>
              <span className="text-xs text-espresso-light shrink-0">
                {act.timestamp}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
