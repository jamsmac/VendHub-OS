import { ReactNode } from "react";

interface PillProps {
  active?: boolean;
  onClick?: () => void;
  icon?: string | ReactNode;
  count?: number;
  label: string;
  className?: string;
  role?: string;
  ariaSelected?: boolean;
}

export default function Pill({
  active = false,
  onClick,
  icon,
  count,
  label,
  className = "",
  role,
  ariaSelected,
}: PillProps) {
  return (
    <button
      type="button"
      className={["pill", active ? "pill-active" : "pill-inactive", className]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      role={role}
      aria-selected={ariaSelected}
    >
      {icon && <span className="mr-1.5">{icon}</span>}
      {label}
      {count !== undefined && (
        <span className="ml-1 opacity-70">({count})</span>
      )}
    </button>
  );
}
