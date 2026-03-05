"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════
// SlideOver — reusable right-side panel component
// Usage:
//   <SlideOver open={open} onClose={() => setOpen(false)} title="Заголовок">
//     <SlideOverBody>...content...</SlideOverBody>
//     <SlideOverFooter>...buttons...</SlideOverFooter>
//   </SlideOver>
// ═══════════════════════════════════════════════════════════

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Width class, default: 'w-[480px]' */
  width?: string;
  children: React.ReactNode;
}

export function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  width = "w-[480px]",
  children,
}: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "relative flex flex-col bg-white shadow-2xl",
          "animate-in slide-in-from-right duration-300",
          "max-w-full h-full",
          width,
        )}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-start justify-between border-b border-espresso/10 px-6 py-4">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 className="text-lg font-bold text-espresso-dark font-display truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-0.5 text-sm text-espresso-light truncate">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-3 shrink-0 rounded-lg p-1.5 text-espresso-light hover:bg-espresso/5 hover:text-espresso transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content area */}
        {children}
      </div>
    </div>
  );
}

/** Scrollable body area */
export function SlideOverBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex-1 overflow-y-auto px-6 py-5", className)}>
      {children}
    </div>
  );
}

/** Sticky footer with actions */
export function SlideOverFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-espresso/10 px-6 py-4 bg-white",
        className,
      )}
    >
      {children}
    </div>
  );
}
