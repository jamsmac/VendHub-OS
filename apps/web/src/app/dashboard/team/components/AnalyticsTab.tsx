"use client";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  HEADCOUNT_BY_ROLE,
  HIRING_TIMELINE,
  TENURE_DISTRIBUTION,
  PERFORMANCE_DATA,
  RESPONSE_TIME_DATA,
  TOP_PERFORMERS,
  getKPIBadgeVariant,
} from "./constants";

export function AnalyticsTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Headcount by Role */}
        <Card className="coffee-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-espresso-dark">
              Численность по ролям
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={HEADCOUNT_BY_ROLE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                <XAxis
                  dataKey="role"
                  stroke="#92400e"
                  fontSize={11}
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
                />
                <Bar dataKey="count" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hiring Timeline */}
        <Card className="coffee-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-espresso-dark">
              Найм за 12 месяцев
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={HIRING_TIMELINE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                <XAxis dataKey="month" stroke="#92400e" fontSize={11} />
                <YAxis stroke="#92400e" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fdf8f3",
                    border: "1px solid #f3e8d0",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hired"
                  stroke="#f59e0b"
                  fill="#fef3c7"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tenure Distribution */}
        <Card className="coffee-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-espresso-dark">
              Распределение стажа
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={TENURE_DISTRIBUTION}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {TENURE_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fdf8f3",
                    border: "1px solid #f3e8d0",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Avg Response Time */}
        <Card className="coffee-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-espresso-dark">
              Среднее время ответа (минуты)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={RESPONSE_TIME_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                <XAxis dataKey="week" stroke="#92400e" fontSize={11} />
                <YAxis stroke="#92400e" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fdf8f3",
                    border: "1px solid #f3e8d0",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avgTime"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: "#f59e0b" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Grid */}
      <Card className="coffee-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-espresso-dark">
            Матрица производительности
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-espresso/10">
                <th className="text-left py-2 px-3 text-xs font-semibold text-espresso-light">
                  Сотрудник
                </th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-espresso-light">
                  Выполнено задач
                </th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-espresso-light">
                  Рейтинг
                </th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-espresso-light">
                  Своевременность
                </th>
              </tr>
            </thead>
            <tbody>
              {PERFORMANCE_DATA.map((row) => (
                <tr
                  key={row.name}
                  className="border-b border-espresso/5 hover:bg-espresso-50/30"
                >
                  <td className="py-2 px-3 font-medium text-espresso-dark">
                    {row.name}
                  </td>
                  <td className="text-center py-2 px-3">
                    <Badge
                      variant={getKPIBadgeVariant(row.tasks)}
                      className="text-xs"
                    >
                      {row.tasks}%
                    </Badge>
                  </td>
                  <td className="text-center py-2 px-3">
                    <Badge
                      variant={getKPIBadgeVariant(row.rating)}
                      className="text-xs"
                    >
                      {row.rating}%
                    </Badge>
                  </td>
                  <td className="text-center py-2 px-3">
                    <Badge
                      variant={getKPIBadgeVariant(row.timelyCompletion)}
                      className="text-xs"
                    >
                      {row.timelyCompletion}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card className="coffee-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-espresso-dark">
            Лучшие сотрудники (по выполненным задачам)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {TOP_PERFORMERS.map((emp) => (
            <div
              key={emp.name}
              className="flex items-center gap-3 p-3 rounded-lg bg-espresso-50/50"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">
                {emp.rank}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-espresso-dark">
                  {emp.name}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {emp.tasks} задач
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
