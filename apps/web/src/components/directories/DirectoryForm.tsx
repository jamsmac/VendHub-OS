'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const directorySchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(500),
  slug: z.string()
    .min(1, 'Код обязателен')
    .max(200)
    .regex(/^[a-z][a-z0-9_]*$/, 'Только латинские буквы, цифры и подчёркивание'),
  description: z.string().max(2000).optional().or(z.literal('')),
  type: z.enum(['MANUAL', 'EXTERNAL', 'PARAM', 'TEMPLATE']),
  scope: z.enum(['HQ', 'ORGANIZATION', 'LOCATION']).optional(),
  isHierarchical: z.boolean().optional(),
});

type DirectoryFormData = z.infer<typeof directorySchema>;

interface DirectoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DirectoryFormData) => void;
  defaultValues?: Partial<DirectoryFormData>;
  isSubmitting?: boolean;
  title?: string;
  mode?: 'create' | 'edit';
}

export function DirectoryForm({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isSubmitting = false,
  title,
  mode = 'create',
}: DirectoryFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DirectoryFormData>({
    resolver: zodResolver(directorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      type: 'MANUAL',
      scope: 'HQ',
      isHierarchical: false,
      ...defaultValues,
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        name: '',
        slug: '',
        description: '',
        type: 'MANUAL',
        scope: 'HQ',
        isHierarchical: false,
        ...defaultValues,
      });
    }
  }, [open, defaultValues, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title || (mode === 'create' ? 'Создать справочник' : 'Редактировать справочник')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dir-name">Название *</Label>
            <Input
              id="dir-name"
              {...register('name')}
              placeholder="Единицы измерения"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="dir-slug">Код (slug) *</Label>
              <Input
                id="dir-slug"
                {...register('slug')}
                placeholder="units"
              />
              {errors.slug && (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="dir-description">Описание</Label>
            <Input
              id="dir-description"
              {...register('description')}
              placeholder="Описание справочника"
            />
          </div>

          {mode === 'create' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dir-type">Тип *</Label>
                <select
                  id="dir-type"
                  {...register('type')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="MANUAL">Ручной</option>
                  <option value="EXTERNAL">Внешний</option>
                  <option value="PARAM">Параметр</option>
                  <option value="TEMPLATE">Шаблон</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dir-scope">Область</Label>
                <select
                  id="dir-scope"
                  {...register('scope')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="HQ">Центральный</option>
                  <option value="ORGANIZATION">Организация</option>
                  <option value="LOCATION">Локация</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dir-hierarchical"
              {...register('isHierarchical')}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="dir-hierarchical" className="font-normal">
              Иерархический справочник
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Создать' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
