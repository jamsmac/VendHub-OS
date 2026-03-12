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
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
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
  const t = useTranslations("team");

  const roleNameMap: Record<string, string> = {
    Владелец: t("roleOwner"),
    Администратор: t("roleAdmin"),
    Менеджер: t("roleManager"),
    Оператор: t("roleOperator"),
    Склад: t("roleWarehouse"),
    Бухгалтер: t("roleAccountant"),
    Наблюдатель: t("roleViewer"),
  };

  const monthMap: Record<string, string> = {
    Январь: t("monthJan"),
    Февраль: t("monthFeb"),
    Март: t("monthMar"),
    Апрель: t("monthApr"),
    Май: t("monthMay"),
    Июнь: t("monthJun"),
    Июль: t("monthJul"),
    Август: t("monthAug"),
    Сентябрь: t("monthSep"),
    Октябрь: t("monthOct"),
    Ноябрь: t("monthNov"),
    Декабрь: t("monthDec"),
  };

  const tenureMap: Record<string, string> = {
    "0-3 месяца": t("tenure0to3"),
    "3-6 месяцев": t("tenure3to6"),
    "6-12 месяцев": t("tenure6to12"),
    "12+ месяцев": t("tenure12plus"),
  };

  const localHeadcount = HEADCOUNT_BY_ROLE.map((d) => ({
    ...d,
    role: roleNameMap[d.role] || d.role,
  }));
  const localHiring = HIRING_TIMELINE.map((d) => ({
    ...d,
    month: monthMap[d.month] || d.month,
  }));
  const localTenure = TENURE_DISTRIBUTION.map((d) => ({
    ...d,
    name: tenureMap[d.name] || d.name,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Headcount by Role */}
        <Card className="coffee-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-espresso-dark">
              {t("headcountByRole")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={localHeadcount}>
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
              {t("hiringTimeline")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={localHiring}>
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
              {t("tenureDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={localTenure}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {localTenure.map((entry, index) => (
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
              {t("avgResponseTime")}
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
            {t("performanceMatrix")}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="border-b border-espresso/10">
                <TableHead className="text-left py-2 px-3 text-xs font-semibold text-espresso-light">
                  {t("employee")}
                </TableHead>
                <TableHead className="text-center py-2 px-3 text-xs font-semibold text-espresso-light">
                  {t("colTasksDone")}
                </TableHead>
                <TableHead className="text-center py-2 px-3 text-xs font-semibold text-espresso-light">
                  {t("memberRating")}
                </TableHead>
                <TableHead className="text-center py-2 px-3 text-xs font-semibold text-espresso-light">
                  {t("colTimeliness")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERFORMANCE_DATA.map((row) => (
                <TableRow
                  key={row.name}
                  className="border-b border-espresso/5 hover:bg-espresso-50/30"
                >
                  <TableCell className="py-2 px-3 font-medium text-espresso-dark">
                    {row.name}
                  </TableCell>
                  <TableCell className="text-center py-2 px-3">
                    <Badge
                      variant={getKPIBadgeVariant(row.tasks)}
                      className="text-xs"
                    >
                      {row.tasks}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center py-2 px-3">
                    <Badge
                      variant={getKPIBadgeVariant(row.rating)}
                      className="text-xs"
                    >
                      {row.rating}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center py-2 px-3">
                    <Badge
                      variant={getKPIBadgeVariant(row.timelyCompletion)}
                      className="text-xs"
                    >
                      {row.timelyCompletion}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card className="coffee-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-espresso-dark">
            {t("topPerformers")}
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
                {emp.tasks} {t("tasksSuffix")}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
