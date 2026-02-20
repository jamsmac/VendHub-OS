'use client';

/**
 * Form Field Components
 * Reusable form inputs with validation support
 */

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// FORM FIELD WRAPPER
// ============================================================================

interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  error,
  hint,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

// ============================================================================
// TEXT INPUT
// ============================================================================

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors',
            error && 'border-destructive focus:ring-destructive/20 focus:border-destructive',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className,
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {rightIcon}
          </div>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

// ============================================================================
// TEXTAREA
// ============================================================================

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors resize-none',
          'min-h-[100px]',
          error && 'border-destructive focus:ring-destructive/20 focus:border-destructive',
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

// ============================================================================
// SELECT
// ============================================================================

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, options, placeholder, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full px-3 py-2 border rounded-lg bg-background text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors appearance-none cursor-pointer',
          'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3E%3C/svg%3E")]',
          'bg-[length:1.5em_1.5em] bg-[right_0.5rem_center] bg-no-repeat',
          'pr-10',
          error && 'border-destructive focus:ring-destructive/20 focus:border-destructive',
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    );
  },
);
Select.displayName = 'Select';

// ============================================================================
// CHECKBOX
// ============================================================================

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          ref={ref}
          type="checkbox"
          className={cn(
            'w-4 h-4 rounded border-input text-primary',
            'focus:ring-2 focus:ring-primary/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className,
          )}
          {...props}
        />
        {label && <span className="text-sm">{label}</span>}
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';

// ============================================================================
// RADIO GROUP
// ============================================================================

interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  className,
}: RadioGroupProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            'flex items-start gap-3 p-3 border rounded-lg cursor-pointer',
            'hover:bg-muted/50 transition-colors',
            value === option.value && 'border-primary bg-primary/5',
            option.disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={option.disabled}
            className="mt-0.5"
          />
          <div>
            <p className="font-medium">{option.label}</p>
            {option.description && (
              <p className="text-sm text-muted-foreground">
                {option.description}
              </p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}

// ============================================================================
// SWITCH
// ============================================================================

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

export function Switch({
  checked = false,
  onChange,
  disabled,
  label,
  description,
}: SwitchProps) {
  return (
    <label
      className={cn(
        'flex items-center justify-between gap-4 cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {(label || description) && (
        <div>
          {label && <p className="font-medium">{label}</p>}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </label>
  );
}

export default FormField;
