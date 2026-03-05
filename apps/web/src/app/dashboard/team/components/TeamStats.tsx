"use client";

import { Users, UserCheck, Clock, UserX, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { TeamStats } from "./types";

interface TeamStatsProps {
  stats: TeamStats;
}

export function TeamStats({ stats }: TeamStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      <Card className="coffee-card">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-espresso-100">
            <Users className="h-5 w-5 text-espresso" />
          </div>
          <div>
            <p className="text-2xl font-bold text-espresso-dark">
              {stats.total}
            </p>
            <p className="text-xs text-espresso-light">Всего</p>
          </div>
        </CardContent>
      </Card>
      <Card className="coffee-card">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <UserCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">
              {stats.active}
            </p>
            <p className="text-xs text-espresso-light">Активны</p>
          </div>
        </CardContent>
      </Card>
      <Card className="coffee-card">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{stats.away}</p>
            <p className="text-xs text-espresso-light">Отсутствуют</p>
          </div>
        </CardContent>
      </Card>
      <Card className="coffee-card">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
            <UserX className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
            <p className="text-xs text-espresso-light">Неактивны</p>
          </div>
        </CardContent>
      </Card>
      <Card className="coffee-card">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-espresso-dark">
              {stats.avgRating}
            </p>
            <p className="text-xs text-espresso-light">Средний рейтинг</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
