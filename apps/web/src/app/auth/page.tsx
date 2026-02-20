'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Coffee, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
  twoFactorCode: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const result = await login(data.email, data.password, data.twoFactorCode);

      if (result.requiresTwoFactor) {
        setRequires2FA(true);
        toast.info('Введите код из приложения аутентификации');
        return;
      }

      toast.success('Добро пожаловать!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка входа');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-coffee-50 to-coffee-100 dark:from-coffee-900 dark:to-coffee-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
            <Coffee className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">VendHub Admin</CardTitle>
          <CardDescription>Войдите в систему управления</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@vendhub.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Link href="/auth/reset-password" className="text-sm text-primary hover:underline">
                Забыли пароль?
              </Link>
            </div>

            {requires2FA && (
              <div className="space-y-2">
                <Label htmlFor="twoFactorCode">Код 2FA</Label>
                <Input
                  id="twoFactorCode"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  {...register('twoFactorCode')}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Вход...
                </>
              ) : (
                'Войти'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
