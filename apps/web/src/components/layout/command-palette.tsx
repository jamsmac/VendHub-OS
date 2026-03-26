"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { navigation, type NavItem } from "./sidebar";
import { useAuthStore } from "@/lib/store/auth";
import { UserRole } from "@vendhub/shared";

const SECTION_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  operations: "Operations",
  logistics: "Logistics",
  finance: "Finance",
  marketing: "Marketing",
  hr: "HR & Team",
  reporting: "Reporting",
  admin: "Administration",
  system: "System",
  general: "General",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("nav");
  const user = useAuthStore((s) => s.user);
  const userRole = (user?.role as UserRole) || UserRole.VIEWER;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const filteredNav = useMemo(() => {
    return navigation.filter(
      (item) => !item.roles || item.roles.includes(userRole),
    );
  }, [userRole]);

  const sections = useMemo(() => {
    const grouped = new Map<string, NavItem[]>();
    for (const item of filteredNav) {
      const section = item.section || "general";
      const existing = grouped.get(section) || [];
      existing.push(item);
      grouped.set(section, existing);
    }
    return grouped;
  }, [filteredNav]);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={t("searchPages", { fallback: "Search pages..." })}
      />
      <CommandList>
        <CommandEmpty>
          {t("noResults", { fallback: "No results found." })}
        </CommandEmpty>
        {Array.from(sections.entries()).map(([section, items]) => (
          <CommandGroup
            key={section}
            heading={SECTION_LABELS[section] || section}
          >
            {items.map((item) => {
              const Icon = item.icon;
              const label = t(item.nameKey, { fallback: "" }) || item.fallback;
              return (
                <CommandItem
                  key={item.href}
                  value={`${label} ${item.fallback}`}
                  onSelect={() => handleSelect(item.href)}
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{label}</span>
                  <span className="ml-auto text-xs text-muted-foreground/50">
                    {item.href.replace("/dashboard/", "/")}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
