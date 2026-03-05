import { ReactNode } from "react";

interface BadgeProps {
  variant:
    | "promo"
    | "new"
    | "unavailable"
    | "status-online"
    | "status-offline"
    | "hot"
    | "cold";
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeProps["variant"], string> = {
  promo: "bg-caramel/20 text-caramel-dark",
  new: "bg-mint/20 text-mint",
  unavailable: "bg-gray-200 text-gray-500",
  "status-online": "bg-mint/20 text-mint",
  "status-offline": "bg-red-100 text-red-500",
  hot: "bg-orange-100 text-orange-600",
  cold: "bg-blue-100 text-blue-600",
};

const variantIcons: Partial<Record<BadgeProps["variant"], string>> = {
  hot: "\uD83D\uDD25",
  cold: "\uD83E\uDDCA",
};

export default function Badge({
  variant,
  children,
  className = "",
}: BadgeProps) {
  const icon = variantIcons[variant];

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon && <span>{icon}</span>}
      {children}
    </span>
  );
}
