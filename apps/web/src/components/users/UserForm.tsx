'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const userSchema = z.object({
  firstName: z.string().min(1, 'Обязательное поле').max(100),
  lastName: z.string().min(1, 'Обязательное поле').max(100),
  email: z.string().email('Введите корректный email'),
  phone: z.string().optional(),
  role: z.enum(['owner', 'admin', 'manager', 'operator', 'warehouse', 'accountant', 'viewer']),
  password: z.string().min(8, 'Минимум 8 символов').optional().or(z.literal('')),
});

export type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  defaultValues?: Partial<UserFormData>;
  onSubmit: (data: UserFormData) => Promise<void>;
  isSubmitting: boolean;
  isEdit?: boolean;
}

const roles = [
  { value: 'owner', label: 'Владелец' },
  { value: 'admin', label: 'Администратор' },
  { value: 'manager', label: 'Менеджер' },
  { value: 'operator', label: 'Оператор' },
  { value: 'warehouse', label: 'Склад' },
  { value: 'accountant', label: 'Бухгалтер' },
  { value: 'viewer', label: 'Наблюдатель' },
];

export function UserForm({ defaultValues, onSubmit, isSubmitting, isEdit }: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(
      isEdit
        ? userSchema.extend({
            password: z.string().min(8, 'Минимум 8 символов').optional().or(z.literal('')),
          })
        : userSchema.extend({
            password: z.string().min(8, 'Минимум 8 символов'),
          })
    ),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'viewer',
      password: '',
      ...defaultValues,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Редактировать пользователя' : 'Новый пользователь'}</CardTitle>
        <CardDescription>
          {isEdit ? 'Измените данные пользователя' : 'Заполните данные нового пользователя'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Имя *</Label>
              <Input id="firstName" placeholder="Иван" {...register('firstName')} />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия *</Label>
              <Input id="lastName" placeholder="Иванов" {...register('lastName')} />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="user@vendhub.com" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" type="tel" placeholder="+998 90 123 4567" {...register('phone')} />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="role">Роль *</Label>
              <select
                id="role"
                {...register('role')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {isEdit ? 'Новый пароль (оставьте пустым)' : 'Пароль *'}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={isEdit ? 'Оставьте пустым' : 'Минимум 8 символов'}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : isEdit ? (
                'Сохранить изменения'
              ) : (
                'Создать пользователя'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
