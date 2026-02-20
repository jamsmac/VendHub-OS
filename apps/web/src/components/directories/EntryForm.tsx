'use client';

import * as React from 'react';
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

interface FieldDefinition {
  id: string;
  name: string;
  displayName: string;
  fieldType: string;
  isRequired: boolean;
  defaultValue: unknown;
  validationRules: Record<string, unknown>;
}

interface EntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; code?: string; description?: string; data: Record<string, unknown> }) => void;
  fields?: FieldDefinition[];
  defaultValues?: {
    name?: string;
    code?: string;
    description?: string;
    data?: Record<string, unknown>;
  };
  isSubmitting?: boolean;
  title?: string;
  mode?: 'create' | 'edit';
}

export function EntryForm({
  open,
  onOpenChange,
  onSubmit,
  fields = [],
  defaultValues,
  isSubmitting = false,
  title,
  mode = 'create',
}: EntryFormProps) {
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [fieldValues, setFieldValues] = React.useState<Record<string, unknown>>({});

  React.useEffect(() => {
    if (open) {
      setName(defaultValues?.name || '');
      setCode(defaultValues?.code || '');
      setDescription(defaultValues?.description || '');
      setFieldValues(defaultValues?.data || {});
    }
  }, [open, defaultValues]);

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFieldValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      code: code.trim() || undefined,
      description: description.trim() || undefined,
      data: fieldValues,
    });
  };

  const renderField = (field: FieldDefinition) => {
    const value = fieldValues[field.name] ?? field.defaultValue ?? '';

    switch (field.fieldType) {
      case 'TEXT':
        return (
          <Input
            value={String(value)}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.displayName}
          />
        );

      case 'NUMBER':
        return (
          <Input
            type="number"
            value={String(value)}
            onChange={(e) => handleFieldChange(field.name, Number(e.target.value))}
            placeholder={field.displayName}
          />
        );

      case 'BOOLEAN':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm text-muted-foreground">{field.displayName}</span>
          </div>
        );

      case 'DATE':
        return (
          <Input
            type="date"
            value={String(value)}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          />
        );

      case 'DATETIME':
        return (
          <Input
            type="datetime-local"
            value={String(value)}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          />
        );

      case 'SELECT_SINGLE':
        return (
          <select
            value={String(value)}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Выберите...</option>
            {(field.validationRules?.options as string[] || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <Input
            value={String(value)}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.displayName}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {title || (mode === 'create' ? 'Создать запись' : 'Редактировать запись')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Название *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Код</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Код записи"
            />
          </div>

          <div className="space-y-2">
            <Label>Описание</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание"
            />
          </div>

          {fields.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium text-muted-foreground">
                Дополнительные поля
              </p>
              {fields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <Label className="text-sm">
                    {field.displayName}
                    {field.isRequired && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {renderField(field)}
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Создать' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
