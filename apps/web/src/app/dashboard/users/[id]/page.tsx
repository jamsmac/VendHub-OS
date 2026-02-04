'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usersApi } from '@/lib/api';
import { UserForm, UserFormData } from '@/components/users/UserForm';
import { RoleAssignment } from '@/components/users/RoleAssignment';

const roleConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  owner: { label: 'Владелец', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  admin: { label: 'Администратор', color: 'text-red-600', bgColor: 'bg-red-100' },
  manager: { label: 'Менеджер', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  operator: { label: 'Оператор', color: 'text-green-600', bgColor: 'bg-green-100' },
  warehouse: { label: 'Склад', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  accountant: { label: 'Бухгалтер', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  viewer: { label: 'Наблюдатель', color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: 'Активен', color: 'text-green-600', icon: CheckCircle },
  inactive: { label: 'Неактивен', color: 'text-muted-foreground', icon: XCircle },
  suspended: { label: 'Заблокирован', color: 'text-red-600', icon: XCircle },
  pending: { label: 'Ожидает', color: 'text-yellow-600', icon: Shield },
  rejected: { label: 'Отклонен', color: 'text-red-600', icon: XCircle },
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = params.id as string;
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersApi.getById(userId).then((res) => res.data.data || res.data),
    enabled: !!userId,
  });

  const handleUpdate = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      // Remove empty password
      const payload = { ...data };
      if (!payload.password) delete (payload as any).password;
      await usersApi.update(userId, payload);
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      toast.success('Данные обновлены');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка обновления');
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
        <p className="text-lg font-medium">Пользователь не найден</p>
        <Link href="/dashboard/users">
          <Button variant="link">Вернуться к списку</Button>
        </Link>
      </div>
    );
  }

  const role = roleConfig[user.role] || roleConfig.viewer;
  const status = statusConfig[user.status] || statusConfig.inactive;
  const StatusIcon = status.icon;
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/users">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {user.firstName} {user.lastName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${role.bgColor} ${role.color}`}
              >
                {role.label}
              </span>
              <div className={`flex items-center gap-1 ${status.color}`}>
                <StatusIcon className="h-4 w-4" />
                <span className="text-xs">{status.label}</span>
              </div>
            </div>
          </div>
        </div>
        <Button
          variant={isEditing ? 'outline' : 'default'}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Отменить' : 'Редактировать'}
        </Button>
      </div>

      {isEditing ? (
        /* Edit Form */
        <UserForm
          defaultValues={{
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone || '',
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
              <CardTitle>Профиль</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback className={`text-lg ${role.bgColor}`}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{role.label}</p>
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
                    Создан:{' '}
                    {new Date(user.createdAt || user.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                {(user.lastLoginAt || user.last_login_at) && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Последний вход:{' '}
                      {new Date(user.lastLoginAt || user.last_login_at).toLocaleDateString(
                        'ru-RU'
                      )}
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
