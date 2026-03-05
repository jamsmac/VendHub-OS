import type { ReactNode } from "react";

interface AdminFormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

export default function AdminFormField({
  label,
  required,
  error,
  children,
}: AdminFormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-espresso/70 mb-1.5">
        {label}
        {required && " *"}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
