"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usersApi } from "@/lib/api";
import { UserForm, UserFormData } from "@/components/users/UserForm";
import { RoleAssignment } from "@/components/users/RoleAssignment";

const roleStyleConfig: Record<string, { color: string; bgColor: string }> = {
  owner: {
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  admin: {
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  manager: {
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  operator: {
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  warehouse: {
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  accountant: {
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
  },
  viewer: {
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
};

const statusStyleConfig: Record<
  string,
  { color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  active: { color: "text-green-600", icon: CheckCircle },
  inactive: {
    color: "text-muted-foreground",
    icon: XCircle,
  },
  suspended: { color: "text-red-600", icon: XCircle },
  pending: { color: "text-yellow-600", icon: Shield },
  rejected: { color: "text-red-600", icon: XCircle },
};

export default function UserDetailPage() {
  const params = useParams();
  useRouter();
  const queryClient = useQueryClient();
  const tl = useTranslations("userDetail");
  const userId = params.id as string;
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", userId],
    queryFn: () =>
      usersApi.getById(userId).then((res) => res.data.data || res.data),
    enabled: !!userId,
  });

  const handleUpdate = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      // Remove empty password
      const payload = { ...data };
      if (!payload.password) delete (payload as Partial<UserFormData>).password;
      await usersApi.update(userId, payload);
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      toast.success(tl("updateSuccess"));
      setIsEditing(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || tl("updateError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium">{tl("notFound")}</p>
        <Link href="/dashboard/users">
          <Button variant="link">{tl("backToList")}</Button>
        </Link>
      </div>
    );
  }

  const roleKey = (user.role as string) || "viewer";
  const roleStyle = roleStyleConfig[roleKey] || roleStyleConfig.viewer;
  const statusKey = (user.status as string) || "inactive";
  const statusStyle =
    statusStyleConfig[statusKey] || statusStyleConfig.inactive;
  const StatusIcon = statusStyle.icon;
  const initials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/users">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {tl("back")}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {user.firstName} {user.lastName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${roleStyle.bgColor} ${roleStyle.color}`}
              >
                {tl(`role_${roleKey}`)}
              </span>
              <div className={`flex items-center gap-1 ${statusStyle.color}`}>
                <StatusIcon className="h-4 w-4" />
                <span className="text-xs">{tl(`status_${statusKey}`)}</span>
              </div>
            </div>
          </div>
        </div>
        <Button
          variant={isEditing ? "outline" : "default"}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? tl("cancel") : tl("edit")}
        </Button>
      </div>

      {isEditing ? (
        /* Edit Form */
        <UserForm
          defaultValues={{
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone || "",
            role: user.role,
          }}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          isEdit
        />
      ) : (
        /* User Detail Cards */
        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>{tl("profile")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback className={`text-lg ${roleStyle.bgColor}`}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tl(`role_${roleKey}`)}
                  </p>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {tl("createdAt", {
                      date: new Date(
                        user.createdAt || user.created_at,
                      ).toLocaleDateString("ru-RU"),
                    })}
                  </span>
                </div>
                {(user.lastLoginAt || user.last_login_at) && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {tl("lastLogin", {
                        date: new Date(
                          user.lastLoginAt || user.last_login_at,
                        ).toLocaleDateString("ru-RU"),
                      })}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* RBAC Role Assignment */}
          <RoleAssignment userId={userId} />
        </div>
      )}
    </div>
  );
}
