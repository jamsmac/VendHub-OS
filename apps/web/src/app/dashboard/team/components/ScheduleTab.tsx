"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SCHEDULE_DATA, SHIFT_TYPES } from "./constants";

export function ScheduleTab() {
  return (
    <div className="space-y-4">
      <Card className="coffee-card overflow-x-auto">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-espresso-dark">
            Еженедельное расписание
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-espresso/20">
                <th className="text-left py-2 px-3 text-xs font-semibold text-espresso-light whitespace-nowrap">
                  Сотрудник
                </th>
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                  <th
                    key={day}
                    className="text-center py-2 px-2 text-xs font-semibold text-espresso-light"
                  >
                    {day}
                  </th>
                ))}
                <th className="text-center py-2 px-3 text-xs font-semibold text-espresso-light">
                  Часов/неделю
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(SCHEDULE_DATA).map(([name, schedule]) => {
                const totalHours = schedule.filter((s) => s).length * 8;
                const isOvertime = totalHours > 40;
                return (
                  <tr
                    key={name}
                    className="border-b border-espresso/5 hover:bg-espresso-50/30"
                  >
                    <td className="py-3 px-3 font-medium text-espresso-dark text-xs">
                      {name}
                    </td>
                    {schedule.map((shift, i) => {
                      const shiftType = SHIFT_TYPES.find((s) => s.id === shift);
                      return (
                        <td key={i} className="text-center py-3 px-2">
                          {shiftType ? (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${shiftType.color}`}
                            >
                              {shiftType.name}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-espresso-light">
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center py-3 px-3">
                      <Badge
                        variant={isOvertime ? "destructive" : "default"}
                        className="text-xs"
                      >
                        {totalHours}ч
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {SHIFT_TYPES.map((shift) => (
          <Card key={shift.id} className="coffee-card">
            <CardContent className="p-4">
              <div
                className={`inline-block px-3 py-1 rounded-lg ${shift.color} text-xs font-medium mb-2`}
              >
                {shift.name}
              </div>
              <p className="text-sm font-semibold text-espresso-dark">
                {shift.time}
              </p>
              <p className="text-xs text-espresso-light mt-1">
                {shift.name === "Утро"
                  ? "6 часов"
                  : shift.name === "День"
                    ? "8 часов"
                    : "8 часов"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
