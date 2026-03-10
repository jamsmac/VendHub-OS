"use client";

import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  MinusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatusType =
  | "active"
  | "inactive"
  | "pending"
  | "warning"
  | "on_leave"
  | "error";

interface StatusBadgeProps {
  status: StatusType | string;
  label: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    classes: string;
  }
> = {
  active: {
    icon: CheckCircle2,
    classes: "bg-green-500/10 text-green-700 dark:text-green-400",
  },
  inactive: {
    icon: XCircle,
    classes: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
  pending: {
    icon: Clock,
    classes: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  warning: {
    icon: AlertTriangle,
    classes: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  on_leave: {
    icon: MinusCircle,
    classes: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  error: {
    icon: XCircle,
    classes: "bg-red-500/10 text-red-700 dark:text-red-400",
  },
};

const DEFAULT_CONFIG = {
  icon: MinusCircle,
  classes: "bg-muted text-muted-foreground",
};

/**
 * Status badge with icon + color for color-blind accessibility (Issue #15).
 * Uses both color AND icon shape to convey status.
 */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || DEFAULT_CONFIG;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        config.classes,
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}
