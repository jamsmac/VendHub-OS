"use client";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  SALARY_DATA,
  SALARY_BY_ROLE,
  BONUS_DISTRIBUTION,
  fmt,
} from "./constants";

export function SalaryTab() {
  const totalPayroll = SALARY_DATA.reduce(
    (s, e) => s + e.base + e.bonus - e.deductions,
    0,
  );
  const avgSalary = Math.round(totalPayroll / SALARY_DATA.length);
  const totalBonuses = SALARY_DATA.reduce((s, e) => s + e.bonus, 0);
  const totalDeductions = SALARY_DATA.reduce((s, e) => s + e.deductions, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="coffee-card">
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light mb-1">
              Общий фонд оплаты труда
            </p>
            <p className="text-2xl font-bold text-espresso-dark">
              {fmt(totalPayroll)}
            </p>
            <p className="text-xs text-espresso-light mt-2">UZS в месяц</p>
          </CardContent>
        </Card>
        <Card className="coffee-card">
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light mb-1">Средняя зарплата</p>
            <p className="text-2xl font-bold text-espresso-dark">
              {fmt(avgSalary)}
            </p>
            <p className="text-xs text-espresso-light mt-2">
              UZS на сотрудника
            </p>
          </CardContent>
        </Card>
        <Card className="coffee-card">
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light mb-1">Всего премий</p>
            <p className="text-2xl font-bold text-espresso-dark">
              {fmt(totalBonuses)}
            </p>
            <p className="text-xs text-espresso-light mt-2">UZS за месяц</p>
          </CardContent>
        </Card>
        <Card className="coffee-card">
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light mb-1">Всего вычетов</p>
            <p className="text-2xl font-bold text-red-600">
              {fmt(totalDeductions)}
            </p>
            <p className="text-xs text-espresso-light mt-2">UZS за месяц</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Salary by Role */}
        <Card className="coffee-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-espresso-dark">
              Зарплата по ролям
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={SALARY_BY_ROLE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                <XAxis
                  dataKey="role"
                  stroke="#92400e"
                  fontSize={10}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="#92400e" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fdf8f3",
                    border: "1px solid #f3e8d0",
                  }}
                  formatter={(v) => fmt(Number(v))}
                />
                <Bar dataKey="amount" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bonus Distribution */}
        <Card className="coffee-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-espresso-dark">
              Распределение стимулов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={BONUS_DISTRIBUTION}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {BONUS_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fdf8f3",
                    border: "1px solid #f3e8d0",
                  }}
                  formatter={(v) => fmt(Number(v))}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Salary Table */}
      <Card className="coffee-card overflow-x-auto">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-espresso-dark">
            Детализация зарплаты сотрудников
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-espresso/10">
                <th className="text-left py-2 px-3 text-xs font-semibold text-espresso-light">
                  Сотрудник
                </th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-espresso-light">
                  Базовая
                </th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-espresso-light">
                  Премия
                </th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-espresso-light">
                  Вычеты
                </th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-espresso-light">
                  Итого к выплате
                </th>
              </tr>
            </thead>
            <tbody>
              {SALARY_DATA.map((row) => {
                const total = row.base + row.bonus - row.deductions;
                return (
                  <tr
                    key={row.name}
                    className="border-b border-espresso/5 hover:bg-espresso-50/30"
                  >
                    <td className="py-2 px-3 font-medium text-espresso-dark text-xs">
                      {row.name}
                    </td>
                    <td className="text-right py-2 px-3 text-xs">
                      {fmt(row.base)}
                    </td>
                    <td className="text-right py-2 px-3 text-xs text-emerald-600">
                      +{fmt(row.bonus)}
                    </td>
                    <td className="text-right py-2 px-3 text-xs text-red-600">
                      −{fmt(row.deductions)}
                    </td>
                    <td className="text-right py-2 px-3 text-xs font-semibold text-espresso-dark">
                      {fmt(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
