'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Coffee, ArrowLeft, Loader2, Eye, EyeOff, Check } from 'lucide-react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const emailSchema = z.object({
  email: z.string().email('Введите корректный email'),
});

const resetSchema = z.object({
  password: z.string().min(8, 'Минимум 8 символов'),
  confirmPassword: z.string().min(8, 'Минимум 8 символов'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type EmailForm = z.infer<typeof emailSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // Email form for requesting reset
  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
  });

  // Password form for reset
  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const onRequestReset = async (data: EmailForm) => {
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(data.email);
      setEmailSent(true);
      toast.success('Инструкции отправлены на email');
    } catch (error: any) {
      // Don't reveal whether email exists
      setEmailSent(true);
      toast.success('Если email существует, инструкции будут отправлены');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResetPassword = async (data: ResetForm) => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      await authApi.resetPassword(token, data.password);
      setResetDone(true);
      toast.success('Пароль успешно изменен');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ссылка недействительна или истекла');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-coffee-50 to-coffee-100 dark:from-coffee-900 dark:to-coffee-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
            <Coffee className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">
            {token ? 'Новый пароль' : 'Восстановление пароля'}
          </CardTitle>
          <CardDescription>
            {token
              ? 'Введите новый пароль для вашего аккаунта'
              : 'Введите email для получения ссылки восстановления'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Request Reset Form */}
          {!token && !emailSent && (
            <form onSubmit={emailForm.handleSubmit(onRequestReset)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@vendhub.com"
                  {...emailForm.register('email')}
                />
                {emailForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  'Отправить ссылку'
                )}
              </Button>
              <Link
                href="/auth"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Вернуться ко входу
              </Link>
            </form>
          )}

          {/* Email Sent Confirmation */}
          {!token && emailSent && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Если указанный email зарегистрирован в системе, на него будет отправлена ссылка
                для восстановления пароля.
              </p>
              <Link
                href="/auth"
                className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Вернуться ко входу
              </Link>
            </div>
          )}

          {/* Reset Password Form */}
          {token && !resetDone && (
            <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Новый пароль</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Минимум 8 символов"
                    {...resetForm.register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {resetForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {resetForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Подтверждение пароля</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Повторите пароль"
                  {...resetForm.register('confirmPassword')}
                />
                {resetForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {resetForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  'Сохранить пароль'
                )}
              </Button>
            </form>
          )}

          {/* Reset Done Confirmation */}
          {token && resetDone && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Пароль успешно изменен. Теперь вы можете войти с новым паролем.
              </p>
              <Link href="/auth">
                <Button className="w-full">Перейти ко входу</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
