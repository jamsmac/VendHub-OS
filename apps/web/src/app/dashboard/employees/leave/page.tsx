"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  CalendarOff,
  Filter,
  ChevronDown,
  Check,
  X,
  Ban,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { hrApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface LeaveRequest {
  id: string;
  employee_id: string;
  employee?: { id: string; firstName: string; lastName: string };
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
  status: string;
  approved_by?: string;
  rejected_reason?: string;
  created_at: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

const LEAVE_TYPES = [
  "ANNUAL",
  "SICK",
  "UNPAID",
  "MATERNITY",
  "PATERNITY",
  "BEREAVEMENT",
  "STUDY",
  "OTHER",
] as const;

const leaveTypeColors: Record<string, string> = {
  ANNUAL: "bg-blue-500/10 text-blue-500",
  SICK: "bg-red-500/10 text-red-500",
  UNPAID: "bg-muted text-muted-foreground",
  MATERNITY: "bg-pink-500/10 text-pink-500",
  PATERNITY: "bg-cyan-500/10 text-cyan-500",
  BEREAVEMENT: "bg-violet-500/10 text-violet-500",
  STUDY: "bg-amber-500/10 text-amber-500",
  OTHER: "bg-muted text-muted-foreground",
};

const LEAVE_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

const leaveStatusColors: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-500",
  APPROVED: "bg-green-500/10 text-green-500",
  REJECTED: "bg-red-500/10 text-red-500",
  CANCELLED: "bg-muted text-muted-foreground",
};

export default function LeavePage() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const tl = useTranslations("leave");
  const te = useTranslations("employees");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const employeeTabs = [
    { href: "/dashboard/employees", label: te("tabEmployees") },
    { href: "/dashboard/employees/departments", label: te("tabDepartments") },
    { href: "/dashboard/employees/attendance", label: te("tabAttendance") },
    { href: "/dashboard/employees/leave", label: te("tabLeave") },
    { href: "/dashboard/employees/payroll", label: te("tabPayroll") },
    { href: "/dashboard/employees/reviews", label: te("tabReviews") },
  ];

  const { data: leaveRequests, isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["leave-requests", statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("leave_type", typeFilter);
      const res = await hrApi.getLeaveRequests(Object.fromEntries(params));
      return res.data;
    },
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const res = await hrApi.getEmployees();
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return hrApi.approveLeave(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success(tl("requestApproved"));
    },
    onError: () => {
      toast.error(tl("approveFailed"));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return hrApi.rejectLeave(id, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success(tl("requestRejected"));
      setRejectDialogId(null);
      setRejectReason("");
    },
    onError: () => {
      toast.error(tl("rejectFailed"));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      return hrApi.cancelLeave(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success(tl("requestCancelled"));
    },
    onError: () => {
      toast.error(tl("cancelFailed"));
    },
  });

  const requests = leaveRequests || [];
  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "PENDING").length,
    approvedThisMonth: requests.filter((r) => {
      if (r.status !== "APPROVED") return false;
      const now = new Date();
      const created = new Date(r.created_at);
      return (
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      );
    }).length,
    onLeaveNow: requests.filter((r) => {
      if (r.status !== "APPROVED") return false;
      const now = new Date();
      return new Date(r.start_date) <= now && new Date(r.end_date) >= now;
    }).length,
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
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">
                {tl("statsTotal")}
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
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">
                {tl("statsPending")}
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
              <p className="text-2xl font-bold">{stats.approvedThisMonth}</p>
              <p className="text-sm text-muted-foreground">
                {tl("statsApprovedThisMonth")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <CalendarOff className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.onLeaveNow}</p>
              <p className="text-sm text-muted-foreground">
                {tl("statsOnLeaveNow")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                {tl("filterStatus")}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                {tl("allStatuses")}
              </DropdownMenuItem>
              {LEAVE_STATUSES.map((value) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => setStatusFilter(value)}
                >
                  {tl(`status_${value}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <CalendarDays className="w-4 h-4 mr-2" />
                {tl("filterLeaveType")}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setTypeFilter("all")}>
                {tl("allTypes")}
              </DropdownMenuItem>
              {LEAVE_TYPES.map((value) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => setTypeFilter(value)}
                >
                  {tl(`type_${value}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {tl("createRequest")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{tl("newRequestTitle")}</DialogTitle>
            </DialogHeader>
            <LeaveRequestForm
              employees={employees || []}
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Reject Dialog */}
      <Dialog
        open={!!rejectDialogId}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialogId(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tl("rejectRequestTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {tl("rejectReasonLabel")}
              </label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm min-h-[80px] resize-none"
                placeholder={tl("rejectReasonPlaceholder")}
                required
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogId(null);
                  setRejectReason("");
                }}
              >
                {tl("cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                onClick={() =>
                  rejectDialogId &&
                  rejectMutation.mutate({
                    id: rejectDialogId,
                    reason: rejectReason,
                  })
                }
              >
                {rejectMutation.isPending ? tl("rejecting") : tl("reject")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tl("colEmployee")}</TableHead>
              <TableHead>{tl("colType")}</TableHead>
              <TableHead>{tl("colPeriod")}</TableHead>
              <TableHead>{tl("colDays")}</TableHead>
              <TableHead>{tl("colReason")}</TableHead>
              <TableHead>{tl("colStatus")}</TableHead>
              <TableHead>{tl("colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : requests.length ? (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">
                          {request.employee?.firstName?.[0]}
                          {request.employee?.lastName?.[0]}
                        </span>
                      </div>
                      <span className="font-medium">
                        {request.employee?.firstName}{" "}
                        {request.employee?.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        leaveTypeColors[request.leave_type] ||
                        "bg-muted text-muted-foreground"
                      }
                    >
                      {tl(
                        `type_${request.leave_type}` as Parameters<
                          typeof tl
                        >[0],
                      ) || request.leave_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(request.start_date)} --{" "}
                      {formatDate(request.end_date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{request.total_days}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                      {request.reason || "--"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        leaveStatusColors[request.status] ||
                        "bg-muted text-muted-foreground"
                      }
                    >
                      {tl(
                        `status_${request.status}` as Parameters<typeof tl>[0],
                      ) || request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {request.status === "PENDING" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => approveMutation.mutate(request.id)}
                            disabled={approveMutation.isPending}
                            title={tl("approve")}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setRejectDialogId(request.id)}
                            title={tl("reject")}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {(request.status === "PENDING" ||
                        request.status === "APPROVED") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => cancelMutation.mutate(request.id)}
                          disabled={cancelMutation.isPending}
                          title={tl("cancelRequest")}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">{tl("noRequests")}</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function LeaveRequestForm({
  employees,
  onSuccess,
}: {
  employees: Employee[];
  onSuccess: () => void;
}) {
  const tl = useTranslations("leave");
  const [formData, setFormData] = useState({
    employee_id: "",
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return hrApi.createLeaveRequest(data);
    },
    onSuccess: () => {
      toast.success(tl("requestCreated"));
      onSuccess();
    },
    onError: () => {
      toast.error(tl("createFailed"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const totalDays = (() => {
    if (!formData.start_date || !formData.end_date) return 0;
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const diff =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  })();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">{tl("formEmployee")}</label>
        <Select
          value={formData.employee_id}
          onValueChange={(value) =>
            setFormData({ ...formData, employee_id: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={tl("formEmployeePlaceholder")} />
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
        <label className="text-sm font-medium">{tl("formLeaveType")}</label>
        <Select
          value={formData.leave_type}
          onValueChange={(value) =>
            setFormData({ ...formData, leave_type: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={tl("formLeaveTypePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {LEAVE_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {tl(`type_${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{tl("formStartDate")}</label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) =>
              setFormData({ ...formData, start_date: e.target.value })
            }
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">{tl("formEndDate")}</label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) =>
              setFormData({ ...formData, end_date: e.target.value })
            }
            min={formData.start_date}
            required
          />
        </div>
      </div>
      {totalDays > 0 && (
        <p className="text-sm text-muted-foreground">
          {tl("formTotalDays")}{" "}
          <span className="font-semibold text-foreground">{totalDays}</span>
        </p>
      )}
      <div>
        <label className="text-sm font-medium">{tl("formReason")}</label>
        <Textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm min-h-[80px] resize-none"
          placeholder={tl("formReasonPlaceholder")}
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="submit"
          disabled={
            mutation.isPending ||
            !formData.employee_id ||
            !formData.leave_type ||
            !formData.start_date ||
            !formData.end_date
          }
        >
          {mutation.isPending ? tl("creating") : tl("createRequest")}
        </Button>
      </div>
    </form>
  );
}
