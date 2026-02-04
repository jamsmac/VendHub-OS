'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { usersApi } from '@/lib/api';
import { UserForm, UserFormData } from '@/components/users/UserForm';

export default function CreateUserPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      await usersApi.create(data);
      toast.success('Пользователь создан');
      router.push('/dashboard/users');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка создания пользователя');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Новый пользователь</h1>
          <p className="text-muted-foreground">Создание нового пользователя системы</p>
        </div>
      </div>
      <UserForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
