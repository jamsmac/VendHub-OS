"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Banknote,
  Calculator,
  Clock,
  CheckCircle2,
  CreditCard,
  TrendingUp,
  Eye,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface PayrollRecord {
  id: string;
  employee_id: string;
  employee?: { id: string; firstName: string; lastName: string };
  period_start: string;
  period_end: string;
  base_salary: number;
  overtime_pay: number;
  bonuses: number;
  deductions: number;
  tax: number;
  net_salary: number;
  working_days: number;
  status: string;
  paid_at?: string;
  created_at: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

const payrollStatusKeys: Record<string, string> = {
  DRAFT: "statusDraft",
  CALCULATED: "statusCalculated",
  APPROVED: "statusApproved",
  PAID: "statusPaid",
  CANCELLED: "statusCancelled",
};

const payrollStatusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  CALCULATED: "bg-blue-500/10 text-blue-500",
  APPROVED: "bg-amber-500/10 text-amber-500",
  PAID: "bg-green-500/10 text-green-500",
  CANCELLED: "bg-red-500/10 text-red-500",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("ru-RU").format(amount) + " UZS";

const monthKeys = [
  "monthJanuary",
  "monthFebruary",
  "monthMarch",
  "monthApril",
  "monthMay",
  "monthJune",
  "monthJuly",
  "monthAugust",
  "monthSeptember",
  "monthOctober",
  "monthNovember",
  "monthDecember",
];

export default function PayrollPage() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const t = useTranslations("payroll");
  const tEmp = useTranslations("employees");
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [isCalculateOpen, setIsCalculateOpen] = useState(false);
  const [detailPayroll, setDetailPayroll] = useState<PayrollRecord | null>(
    null,
  );
  const [payConfirmId, setPayConfirmId] = useState<string | null>(null);

  const { data: payrolls, isLoading } = useQuery<PayrollRecord[]>({
    queryKey: ["payrolls", selectedMonth, selectedYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("month", String(Number(selectedMonth) + 1));
      params.append("year", selectedYear);
      const res = await api.get(`/employees/payroll?${params}`);
      return res.data;
    },
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const res = await api.get("/employees");
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/employees/payroll/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
      toast.success(t("toastApproved"));
    },
    onError: () => {
      toast.error(t("toastApproveError"));
    },
  });

  const payMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/employees/payroll/${id}/pay`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
      toast.success(t("toastPaid"));
      setPayConfirmId(null);
    },
    onError: () => {
      toast.error(t("toastPayError"));
    },
  });

  const records = payrolls || [];
  const totalPayroll = records.reduce((sum, r) => sum + (r.net_salary || 0), 0);
  const avgSalary = records.length > 0 ? totalPayroll / records.length : 0;
  const pendingApproval = records.filter(
    (r) => r.status === "CALCULATED",
  ).length;
  const paidThisMonth = records.filter((r) => r.status === "PAID").length;

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
    years.push(String(y));
  }

  const employeeTabs = [
    { href: "/dashboard/employees", label: tEmp("tabEmployees") },
    { href: "/dashboard/employees/departments", label: tEmp("tabDepartments") },
    { href: "/dashboard/employees/attendance", label: tEmp("tabAttendance") },
    { href: "/dashboard/employees/leave", label: tEmp("tabLeave") },
    { href: "/dashboard/employees/payroll", label: tEmp("tabPayroll") },
    { href: "/dashboard/employees/reviews", label: tEmp("tabReviews") },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tEmp("title")}</h1>
          <p className="text-muted-foreground">{tEmp("subtitle")}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b">
        {employeeTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              pathname === tab.href
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {formatCurrency(totalPayroll)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("statsTotalPayroll")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {formatCurrency(Math.round(avgSalary))}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("statsAvgSalary")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingApproval}</p>
              <p className="text-sm text-muted-foreground">
                {t("statsPendingApproval")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{paidThisMonth}</p>
              <p className="text-sm text-muted-foreground">{t("statsPaid")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">{t("period")}:</label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthKeys.map((key, idx) => (
                <SelectItem key={idx} value={String(idx)}>
                  {t(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isCalculateOpen} onOpenChange={setIsCalculateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Calculator className="w-4 h-4 mr-2" />
              {t("calculatePayroll")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("calculateTitle")}</DialogTitle>
            </DialogHeader>
            <CalculatePayrollForm
              employees={employees || []}
              onSuccess={() => {
                setIsCalculateOpen(false);
                queryClient.invalidateQueries({ queryKey: ["payrolls"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Detail Dialog */}
      <Dialog
        open={!!detailPayroll}
        onOpenChange={(open) => !open && setDetailPayroll(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("detailTitle")}</DialogTitle>
          </DialogHeader>
          {detailPayroll && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {detailPayroll.employee?.firstName?.[0]}
                    {detailPayroll.employee?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    {detailPayroll.employee?.firstName}{" "}
                    {detailPayroll.employee?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(detailPayroll.period_start).toLocaleDateString(
                      "ru-RU",
                    )}{" "}
                    --{" "}
                    {new Date(detailPayroll.period_end).toLocaleDateString(
                      "ru-RU",
                    )}
                  </p>
                </div>
                <Badge
                  className={`ml-auto ${payrollStatusColors[detailPayroll.status]}`}
                >
                  {t(
                    payrollStatusKeys[detailPayroll.status] ??
                      detailPayroll.status,
                  )}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("baseSalary")}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(detailPayroll.base_salary)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("overtimePay")}
                  </span>
                  <span className="font-medium text-blue-600">
                    +{formatCurrency(detailPayroll.overtime_pay)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("bonuses")}</span>
                  <span className="font-medium text-green-600">
                    +{formatCurrency(detailPayroll.bonuses)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("deductions")}
                  </span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(detailPayroll.deductions)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("tax")}</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(detailPayroll.tax)}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">{t("netSalary")}</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(detailPayroll.net_salary)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted-foreground">
                    {t("workingDays")}
                  </span>
                  <span>{detailPayroll.working_days}</span>
                </div>
                {detailPayroll.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("paidDate")}
                    </span>
                    <span>
                      {new Date(detailPayroll.paid_at).toLocaleDateString(
                        "ru-RU",
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pay Confirmation Dialog */}
      <Dialog
        open={!!payConfirmId}
        onOpenChange={(open) => !open && setPayConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("payConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("payConfirmMessage")}
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setPayConfirmId(null)}>
              {t("cancel")}
            </Button>
            <Button
              disabled={payMutation.isPending}
              onClick={() => payConfirmId && payMutation.mutate(payConfirmId)}
            >
              {payMutation.isPending ? t("paying") : t("confirmPayment")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colEmployee")}</TableHead>
              <TableHead>{t("colPeriod")}</TableHead>
              <TableHead className="text-right">{t("colSalary")}</TableHead>
              <TableHead className="text-right">{t("colOvertime")}</TableHead>
              <TableHead className="text-right">{t("colBonuses")}</TableHead>
              <TableHead className="text-right">{t("colDeductions")}</TableHead>
              <TableHead className="text-right">{t("colTax")}</TableHead>
              <TableHead className="text-right">{t("colNetPay")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead>{t("colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={10}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : records.length ? (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">
                          {record.employee?.firstName?.[0]}
                          {record.employee?.lastName?.[0]}
                        </span>
                      </div>
                      <span className="font-medium">
                        {record.employee?.firstName} {record.employee?.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(record.period_start).toLocaleDateString(
                        "ru-RU",
                      )}{" "}
                      --{" "}
                      {new Date(record.period_end).toLocaleDateString("ru-RU")}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCurrency(record.base_salary)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {record.overtime_pay > 0 ? (
                      <span className="text-blue-600">
                        {formatCurrency(record.overtime_pay)}
                      </span>
                    ) : (
                      "--"
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {record.bonuses > 0 ? (
                      <span className="text-green-600">
                        {formatCurrency(record.bonuses)}
                      </span>
                    ) : (
                      "--"
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {record.deductions > 0 ? (
                      <span className="text-red-600">
                        {formatCurrency(record.deductions)}
                      </span>
                    ) : (
                      "--"
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {record.tax > 0 ? (
                      <span className="text-red-600">
                        {formatCurrency(record.tax)}
                      </span>
                    ) : (
                      "--"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold">
                      {formatCurrency(record.net_salary)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        payrollStatusColors[record.status] ||
                        "bg-muted text-muted-foreground"
                      }
                    >
                      {t(payrollStatusKeys[record.status] ?? record.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDetailPayroll(record)}
                        title={t("actionDetails")}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {record.status === "CALCULATED" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => approveMutation.mutate(record.id)}
                          disabled={approveMutation.isPending}
                          title={t("actionApprove")}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      {record.status === "APPROVED" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => setPayConfirmId(record.id)}
                          title={t("actionPay")}
                        >
                          <CreditCard className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <Banknote className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">{t("notFound")}</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CalculatePayrollForm({
  employees,
  onSuccess,
}: {
  employees: Employee[];
  onSuccess: () => void;
}) {
  const t = useTranslations("payroll");
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const [formData, setFormData] = useState({
    employee_id: "",
    period_start: firstDay,
    period_end: lastDay,
    working_days: "22",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post("/employees/payroll/calculate", {
        employee_id: data.employee_id,
        period_start: data.period_start,
        period_end: data.period_end,
        working_days: Number(data.working_days),
      });
    },
    onSuccess: () => {
      toast.success(t("toastCalculated"));
      onSuccess();
    },
    onError: () => {
      toast.error(t("toastCalculateError"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">{t("colEmployee")}</label>
        <Select
          value={formData.employee_id}
          onValueChange={(value) =>
            setFormData({ ...formData, employee_id: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t("selectEmployee")} />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t("periodStart")}</label>
          <Input
            type="date"
            value={formData.period_start}
            onChange={(e) =>
              setFormData({ ...formData, period_start: e.target.value })
            }
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("periodEnd")}</label>
          <Input
            type="date"
            value={formData.period_end}
            onChange={(e) =>
              setFormData({ ...formData, period_end: e.target.value })
            }
            required
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">{t("workingDays")}</label>
        <Input
          type="number"
          value={formData.working_days}
          onChange={(e) =>
            setFormData({ ...formData, working_days: e.target.value })
          }
          min="1"
          max="31"
          required
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="submit"
          disabled={mutation.isPending || !formData.employee_id}
        >
          {mutation.isPending ? t("calculating") : t("calculate")}
        </Button>
      </div>
    </form>
  );
}
