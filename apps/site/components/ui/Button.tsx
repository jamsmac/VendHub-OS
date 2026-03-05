import { ReactNode } from "react";

interface ButtonProps {
  variant?: "espresso" | "caramel" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const sizeClasses = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3",
  lg: "px-8 py-4 text-lg",
};

const variantClasses = {
  espresso: "btn-espresso",
  caramel: "btn-caramel",
  outline:
    "border-2 border-espresso text-espresso hover:bg-espresso/10 font-medium rounded-xl transition-all duration-300",
  ghost:
    "text-espresso hover:bg-espresso/5 font-medium rounded-xl transition-all duration-300",
};

export default function Button({
  variant = "espresso",
  size = "md",
  icon,
  children,
  onClick,
  href,
  disabled = false,
  className = "",
  type = "button",
}: ButtonProps) {
  const classes = [
    variantClasses[variant],
    sizeClasses[size],
    "inline-flex items-center justify-center gap-2",
    disabled ? "opacity-50 cursor-not-allowed" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    const isExternal = href.startsWith("http");
    return (
      <a
        href={href}
        className={classes}
        onClick={disabled ? undefined : onClick}
        aria-disabled={disabled}
        {...(isExternal && { target: "_blank", rel: "noopener noreferrer" })}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
