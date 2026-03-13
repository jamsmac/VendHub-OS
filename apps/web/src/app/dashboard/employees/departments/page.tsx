"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  CheckCircle2,
  GitBranch,
  ChevronRight,
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
import { toast } from "sonner";
import { api } from "@/lib/api";

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  manager_id?: string;
  manager?: { id: string; firstName: string; lastName: string };
  parent_id?: string;
  parent?: { id: string; name: string };
  children?: Department[];
  is_active: boolean;
  employee_count?: number;
  created_at: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

export default function DepartmentsPage() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const t = useTranslations("departments");
  const tEmp = useTranslations("employees");
  const [search, setSearch] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: departments, isLoading } = useQuery<Department[]>({
    queryKey: ["departments", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const res = await api.get(`/employees/departments?${params}`);
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/employees/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success(t("deleted"));
      setDeleteConfirmId(null);
    },
    onError: () => {
      toast.error(t("deleteFailed"));
    },
  });

  const flatDepartments = departments || [];
  const rootDepartments = flatDepartments.filter((d) => !d.parent_id);
  const childDepartments = flatDepartments.filter((d) => d.parent_id);

  const stats = {
    total: flatDepartments.length,
    active: flatDepartments.filter((d) => d.is_active).length,
    withManager: flatDepartments.filter((d) => d.manager_id).length,
    subDepartments: childDepartments.length,
  };

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
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">{t("statsTotal")}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">
                {t("statsActive")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.withManager}</p>
              <p className="text-sm text-muted-foreground">
                {t("statsWithManager")}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.subDepartments}</p>
              <p className="text-sm text-muted-foreground">
                {t("statsSubDepartments")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t("createDepartment")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("newDepartment")}</DialogTitle>
            </DialogHeader>
            <DepartmentForm
              employees={employees || []}
              departments={flatDepartments}
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["departments"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingDepartment}
        onOpenChange={(open) => !open && setEditingDepartment(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("editDepartment")}</DialogTitle>
          </DialogHeader>
          {editingDepartment && (
            <DepartmentForm
              department={editingDepartment}
              employees={employees || []}
              departments={flatDepartments.filter(
                (d) => d.id !== editingDepartment.id,
              )}
              onSuccess={() => {
                setEditingDepartment(null);
                queryClient.invalidateQueries({ queryKey: ["departments"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("deleteConfirmText")}
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteConfirmId && deleteMutation.mutate(deleteConfirmId)
              }
            >
              {deleteMutation.isPending ? t("deleting") : t("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colName")}</TableHead>
              <TableHead>{t("colCode")}</TableHead>
              <TableHead>{t("colManager")}</TableHead>
              <TableHead>{t("colSubDepartments")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead className="w-12"></TableHead>
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
            ) : flatDepartments.length ? (
              <>
                {rootDepartments.map((dept) => (
                  <DepartmentRow
                    key={dept.id}
                    department={dept}
                    level={0}
                    allDepartments={flatDepartments}
                    onEdit={setEditingDepartment}
                    onDelete={setDeleteConfirmId}
                  />
                ))}
              </>
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
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

function DepartmentRow({
  department,
  level,
  allDepartments,
  onEdit,
  onDelete,
}: {
  department: Department;
  level: number;
  allDepartments: Department[];
  onEdit: (dept: Department) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("departments");
  const children = allDepartments.filter((d) => d.parent_id === department.id);

  return (
    <>
      <TableRow>
        <TableCell>
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${level * 24}px` }}
          >
            {level > 0 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">{department.name}</p>
              {department.description && (
                <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                  {department.description}
                </p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline">{department.code}</Badge>
        </TableCell>
        <TableCell>
          {department.manager ? (
            <span>
              {department.manager.firstName} {department.manager.lastName}
            </span>
          ) : (
            <span className="text-muted-foreground">--</span>
          )}
        </TableCell>
        <TableCell>{children.length}</TableCell>
        <TableCell>
          <Badge
            className={
              department.is_active
                ? "bg-green-500/10 text-green-500"
                : "bg-red-500/10 text-red-500"
            }
          >
            {department.is_active ? t("statusActive") : t("statusInactive")}
          </Badge>
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("actionsLabel", { defaultValue: "Actions" })}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(department)}>
                <Edit className="w-4 h-4 mr-2" />
                {t("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(department.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {children.map((child) => (
        <DepartmentRow
          key={child.id}
          department={child}
          level={level + 1}
          allDepartments={allDepartments}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

function DepartmentForm({
  department,
  employees,
  departments,
  onSuccess,
}: {
  department?: Department;
  employees: Employee[];
  departments: Department[];
  onSuccess: () => void;
}) {
  const t = useTranslations("departments");
  const [formData, setFormData] = useState({
    name: department?.name || "",
    code: department?.code || "",
    description: department?.description || "",
    manager_id: department?.manager_id || "",
    parent_id: department?.parent_id || "",
    is_active:
      department?.is_active !== undefined ? department.is_active : true,
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        manager_id: data.manager_id || null,
        parent_id: data.parent_id || null,
      };
      if (department) {
        return api.put(`/employees/departments/${department.id}`, payload);
      }
      return api.post("/employees/departments", payload);
    },
    onSuccess: () => {
      toast.success(department ? t("updated") : t("created"));
      onSuccess();
    },
    onError: () => {
      toast.error(t("saveError"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">{t("formName")}</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t("formNamePlaceholder")}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("formCode")}</label>
          <Input
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="SALES"
            required
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">{t("formDescription")}</label>
        <Input
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder={t("formDescriptionPlaceholder")}
        />
      </div>
      <div>
        <label className="text-sm font-medium">{t("formManager")}</label>
        <Select
          value={formData.manager_id}
          onValueChange={(value) =>
            setFormData({ ...formData, manager_id: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t("formManagerPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("formManagerNone")}</SelectItem>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">{t("formParent")}</label>
        <Select
          value={formData.parent_id}
          onValueChange={(value) =>
            setFormData({ ...formData, parent_id: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t("formParentNone")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("formParentNone")}</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) =>
            setFormData({ ...formData, is_active: e.target.checked })
          }
          className="rounded border-input"
        />
        <label htmlFor="is_active" className="text-sm font-medium">
          {t("formIsActive")}
        </label>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? t("saving")
            : department
              ? t("formUpdate")
              : t("formCreate")}
        </Button>
      </div>
    </form>
  );
}
