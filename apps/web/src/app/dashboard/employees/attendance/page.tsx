"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Clock,
  Users,
  UserCheck,
  UserX,
  AlertCircle,
  CalendarDays,
  LogIn,
  LogOut,
  Timer,
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

interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee?: { id: string; firstName: string; lastName: string };
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  total_hours?: number;
  overtime_hours?: number;
  status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "ON_LEAVE";
  note?: string;
  location?: string;
}

interface DailyReport {
  total_employees: number;
  present: number;
  late: number;
  absent: number;
  on_leave: number;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

const statusColors: Record<string, string> = {
  PRESENT: "bg-green-500/10 text-green-500",
  ABSENT: "bg-red-500/10 text-red-500",
  LATE: "bg-amber-500/10 text-amber-500",
  HALF_DAY: "bg-blue-500/10 text-blue-500",
  ON_LEAVE: "bg-violet-500/10 text-violet-500",
};

export default function AttendancePage() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const te = useTranslations("employees");
  const ta = useTranslations("attendance");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);

  const employeeTabs = [
    { href: "/dashboard/employees", label: te("tabEmployees") },
    { href: "/dashboard/employees/departments", label: te("tabDepartments") },
    { href: "/dashboard/employees/attendance", label: te("tabAttendance") },
    { href: "/dashboard/employees/leave", label: te("tabLeave") },
    { href: "/dashboard/employees/payroll", label: te("tabPayroll") },
    { href: "/dashboard/employees/reviews", label: te("tabReviews") },
  ];

  const statusLabels: Record<string, string> = {
    PRESENT: ta("statusPresent"),
    ABSENT: ta("statusAbsent"),
    LATE: ta("statusLate"),
    HALF_DAY: ta("statusHalfDay"),
    ON_LEAVE: ta("statusOnLeave"),
  };

  const { data: attendance, isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance", selectedDate],
    queryFn: async () => {
      const res = await api.get(`/employees/attendance?date=${selectedDate}`);
      return res.data;
    },
  });

  const { data: dailyReport } = useQuery<DailyReport>({
    queryKey: ["attendance-daily-report", selectedDate],
    queryFn: async () => {
      const res = await api.get(
        `/employees/attendance/daily-report?date=${selectedDate}`,
      );
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

  const stats = dailyReport || {
    total_employees: 0,
    present: 0,
    late: 0,
    absent: 0,
    on_leave: 0,
  };

  const formatTime = (time?: string) => {
    if (!time) return "--";
    return new Date(time).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatHours = (hours?: number) => {
    if (!hours && hours !== 0) return "--";
    return ta("hoursShort", { value: hours.toFixed(1) });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{te("title")}</h1>
          <p className="text-muted-foreground">{te("subtitle")}</p>
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
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total_employees}</p>
              <p className="text-sm text-muted-foreground">
                {ta("statsTotal")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.present}</p>
              <p className="text-sm text-muted-foreground">
                {ta("statsPresent")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.late}</p>
              <p className="text-sm text-muted-foreground">{ta("statsLate")}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <UserX className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.absent}</p>
              <p className="text-sm text-muted-foreground">
                {ta("statsAbsent")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.on_leave}</p>
              <p className="text-sm text-muted-foreground">
                {ta("statsOnLeave")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">{ta("dateLabel")}</label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-48"
          />
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
            <DialogTrigger asChild>
              <Button>
                <LogIn className="w-4 h-4 mr-2" />
                {ta("checkIn")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{ta("checkIn")}</DialogTitle>
              </DialogHeader>
              <CheckInForm
                employees={employees || []}
                onSuccess={() => {
                  setIsCheckInOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["attendance"] });
                  queryClient.invalidateQueries({
                    queryKey: ["attendance-daily-report"],
                  });
                }}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                {ta("checkOut")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{ta("checkOut")}</DialogTitle>
              </DialogHeader>
              <CheckOutForm
                employees={employees || []}
                onSuccess={() => {
                  setIsCheckOutOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["attendance"] });
                  queryClient.invalidateQueries({
                    queryKey: ["attendance-daily-report"],
                  });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{ta("colEmployee")}</TableHead>
              <TableHead>{ta("colCheckIn")}</TableHead>
              <TableHead>{ta("colCheckOut")}</TableHead>
              <TableHead>{ta("colWorked")}</TableHead>
              <TableHead>{ta("colOvertime")}</TableHead>
              <TableHead>{ta("colStatus")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : attendance?.length ? (
              attendance.map((record) => (
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
                    <div className="flex items-center gap-1">
                      <LogIn className="w-3.5 h-3.5 text-green-500" />
                      {formatTime(record.check_in_time)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      {formatTime(record.check_out_time)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                      {formatHours(record.total_hours)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {record.overtime_hours && record.overtime_hours > 0 ? (
                      <span className="text-amber-600 font-medium">
                        +{formatHours(record.overtime_hours)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[record.status]}>
                      {statusLabels[record.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">{ta("noData")}</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CheckInForm({
  employees,
  onSuccess,
}: {
  employees: Employee[];
  onSuccess: () => void;
}) {
  const ta = useTranslations("attendance");
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const [formData, setFormData] = useState({
    employee_id: "",
    time: timeStr,
    note: "",
    location: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post("/employees/attendance/check-in", {
        employee_id: data.employee_id,
        time: data.time,
        note: data.note || undefined,
        location: data.location || undefined,
      });
    },
    onSuccess: () => {
      toast.success(ta("checkInSuccess"));
      onSuccess();
    },
    onError: () => {
      toast.error(ta("checkInError"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">{ta("formEmployee")}</label>
        <Select
          value={formData.employee_id}
          onValueChange={(value) =>
            setFormData({ ...formData, employee_id: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={ta("formSelectEmployee")} />
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
      <div>
        <label className="text-sm font-medium">{ta("formTime")}</label>
        <Input
          type="time"
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">{ta("formNoteOptional")}</label>
        <Input
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          placeholder={ta("formNotePlaceholder")}
        />
      </div>
      <div>
        <label className="text-sm font-medium">
          {ta("formLocationOptional")}
        </label>
        <Input
          value={formData.location}
          onChange={(e) =>
            setFormData({ ...formData, location: e.target.value })
          }
          placeholder={ta("formLocationPlaceholder")}
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="submit"
          disabled={mutation.isPending || !formData.employee_id}
        >
          {mutation.isPending ? ta("saving") : ta("checkIn")}
        </Button>
      </div>
    </form>
  );
}

function CheckOutForm({
  employees,
  onSuccess,
}: {
  employees: Employee[];
  onSuccess: () => void;
}) {
  const ta = useTranslations("attendance");
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const [formData, setFormData] = useState({
    employee_id: "",
    time: timeStr,
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post("/employees/attendance/check-out", {
        employee_id: data.employee_id,
        time: data.time,
      });
    },
    onSuccess: () => {
      toast.success(ta("checkOutSuccess"));
      onSuccess();
    },
    onError: () => {
      toast.error(ta("checkOutError"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">{ta("formEmployee")}</label>
        <Select
          value={formData.employee_id}
          onValueChange={(value) =>
            setFormData({ ...formData, employee_id: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={ta("formSelectEmployee")} />
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
      <div>
        <label className="text-sm font-medium">{ta("formTime")}</label>
        <Input
          type="time"
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          required
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="submit"
          disabled={mutation.isPending || !formData.employee_id}
        >
          {mutation.isPending ? ta("saving") : ta("checkOut")}
        </Button>
      </div>
    </form>
  );
}
