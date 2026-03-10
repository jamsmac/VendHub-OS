"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  Shield,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usersApi } from "@/lib/api";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  role:
    | "owner"
    | "admin"
    | "manager"
    | "operator"
    | "warehouse"
    | "accountant"
    | "viewer";
  status: "active" | "inactive" | "suspended";
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

// Structural data at module level (no labels)
const roleColors: Record<string, { color: string; bgColor: string }> = {
  owner: { color: "text-purple-600", bgColor: "bg-purple-100" },
  admin: { color: "text-red-600", bgColor: "bg-red-100" },
  manager: { color: "text-blue-600", bgColor: "bg-blue-100" },
  operator: { color: "text-green-600", bgColor: "bg-green-100" },
  warehouse: { color: "text-orange-600", bgColor: "bg-orange-100" },
  accountant: { color: "text-cyan-600", bgColor: "bg-cyan-100" },
  viewer: { color: "text-muted-foreground", bgColor: "bg-muted" },
};

const statusIcons: Record<string, { color: string; icon: LucideIcon }> = {
  active: { color: "text-green-600", icon: CheckCircle },
  inactive: { color: "text-muted-foreground", icon: XCircle },
  suspended: { color: "text-red-600", icon: XCircle },
};

export default function UsersPage() {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    action: () => void;
  } | null>(null);
  const queryClient = useQueryClient();

  const roleConfig: Record<
    string,
    { label: string; color: string; bgColor: string }
  > = useMemo(
    () => ({
      owner: { ...roleColors.owner, label: t("roles.owner") },
      admin: { ...roleColors.admin, label: t("roles.admin") },
      manager: { ...roleColors.manager, label: t("roles.manager") },
      operator: { ...roleColors.operator, label: t("roles.operator") },
      warehouse: { ...roleColors.warehouse, label: t("roles.warehouse") },
      accountant: { ...roleColors.accountant, label: t("roles.accountant") },
      viewer: { ...roleColors.viewer, label: t("roles.viewer") },
    }),
    [t],
  );

  const statusConfig = useMemo(
    () => ({
      active: { ...statusIcons.active, label: t("statusActive") },
      inactive: { ...statusIcons.inactive, label: t("statusInactive") },
      suspended: { ...statusIcons.suspended, label: t("statusSuspended") },
    }),
    [t],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: users,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["users", debouncedSearch, roleFilter],
    queryFn: () => usersApi.getAll().then((res) => res.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("deleted"));
    },
    onError: () => {
      toast.error(t("deleteFailed"));
    },
  });

  // Filter users
  const filteredUsers = users?.filter((user: User) => {
    if (search) {
      const searchLower = search.toLowerCase();
      const fullName = `${user.firstName} ${user.lastName || ""}`.toLowerCase();
      if (
        !fullName.includes(searchLower) &&
        !user.email.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    if (roleFilter && user.role !== roleFilter) {
      return false;
    }
    return true;
  });

  // Stats
  const stats = useMemo(
    () => ({
      total: users?.length || 0,
      active: users?.filter((u: User) => u.status === "active").length || 0,
      byRole: Object.fromEntries(
        Object.keys(roleColors).map((role) => [
          role,
          users?.filter((u: User) => u.role === role).length || 0,
        ]),
      ),
    }),
    [users],
  );

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{tCommon("loadError")}</p>
        <p className="text-muted-foreground mb-4">{t("loadFailed")}</p>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
        >
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link href="/dashboard/users/new">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            {t("addUser")}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsTotal")}
                </p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsActive")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.active}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsManagers")}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.byRole.manager || 0}
                </p>
              </div>
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsOperators")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.byRole.operator || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {roleFilter ? roleConfig[roleFilter]?.label : tCommon("allRoles")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setRoleFilter(null)}>
              {tCommon("allRoles")}
            </DropdownMenuItem>
            {Object.entries(roleConfig).map(([key, config]) => (
              <DropdownMenuItem key={key} onClick={() => setRoleFilter(key)}>
                <span
                  className={`w-2 h-2 rounded-full ${config.bgColor} mr-2`}
                />
                {config.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* User List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredUsers?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t("notFound")}</p>
            <p className="text-muted-foreground mb-4">{t("addFirst")}</p>
            <Link href="/dashboard/users/new">
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                {t("addUser")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers?.map((user: User) => {
            const role = roleConfig[user.role] || roleConfig.viewer;
            const status = statusConfig[user.status] || statusConfig.inactive;
            const StatusIcon = status.icon;
            const initials =
              `${user.firstName[0]}${user.lastName?.[0] || ""}`.toUpperCase();

            return (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback className={role.bgColor}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">
                          {user.firstName} {user.lastName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${role.bgColor} ${role.color}`}
                          >
                            {role.label}
                          </span>
                          <StatusIcon className={`h-4 w-4 ${status.color}`} />
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={tCommon("actions")}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/dashboard/users/${user.id}`}>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            {tCommon("view")}
                          </DropdownMenuItem>
                        </Link>
                        <Link href={`/dashboard/users/${user.id}/edit`}>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            {tCommon("edit")}
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setConfirmState({
                              title: t("deleteConfirm"),
                              action: () => deleteMutation.mutate(user.id),
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {tCommon("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {tCommon("created")}: {formatDate(user.createdAt)}
                      </span>
                      {user.lastLoginAt && (
                        <span>
                          {tCommon("lastLogin")}:{" "}
                          {new Date(user.lastLoginAt).toLocaleDateString(
                            "ru-RU",
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
        title={confirmState?.title ?? ""}
        onConfirm={() => confirmState?.action()}
      />
    </div>
  );
}
