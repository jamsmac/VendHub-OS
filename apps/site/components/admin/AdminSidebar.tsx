"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Coffee,
  MapPin,
  Cpu,
  Tag,
  Award,
  Coins,
  FileText,
  HeartHandshake,
  X,
} from "lucide-react";
import { ReactNode } from "react";

interface NavItem {
  key: string;
  icon: ReactNode;
  href: string;
}

const navItems: NavItem[] = [
  { key: "dashboard", icon: <LayoutDashboard size={20} />, href: "/admin" },
  { key: "products", icon: <Coffee size={20} />, href: "/admin/products" },
  { key: "machines", icon: <MapPin size={20} />, href: "/admin/machines" },
  {
    key: "machineTypes",
    icon: <Cpu size={20} />,
    href: "/admin/machine-types",
  },
  { key: "promotions", icon: <Tag size={20} />, href: "/admin/promotions" },
  {
    key: "bonusActions",
    icon: <Coins size={20} />,
    href: "/admin/bonus-actions",
  },
  { key: "loyalty", icon: <Award size={20} />, href: "/admin/loyalty" },
  { key: "content", icon: <FileText size={20} />, href: "/admin/content" },
  {
    key: "partnership",
    icon: <HeartHandshake size={20} />,
    href: "/admin/partnership",
  },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cooperationNewCount?: number;
}

export default function AdminSidebar({
  isOpen,
  onClose,
  cooperationNewCount,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("admin.sidebar");

  const isActive = (href: string) => {
    if (href === "/admin") return pathname.endsWith("/admin");
    return pathname.includes(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed top-0 left-0 z-50 h-full w-64 bg-espresso-dark text-white transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
          <Link href="/admin" className="flex items-center gap-2">
            <Coffee size={24} className="text-caramel" />
            <span className="text-lg font-bold tracking-tight">VendHub</span>
            <span className="text-xs text-caramel font-medium bg-caramel/10 px-2 py-0.5 rounded-full">
              Admin
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeSidebar")}
            className="lg:hidden text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive(item.href)
                  ? "bg-caramel/20 text-caramel"
                  : "text-white/60 hover:text-white hover:bg-white/5",
              ].join(" ")}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1">{t(item.key)}</span>
              {item.key === "partnership" &&
                !!cooperationNewCount &&
                cooperationNewCount > 0 && (
                  <span className="min-w-5 h-5 flex items-center justify-center text-xs font-bold text-white bg-caramel rounded-full px-1.5">
                    {cooperationNewCount}
                  </span>
                )}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-white/10">
          <a
            href={`https://${process.env.NEXT_PUBLIC_SITE_DOMAIN || "vendhub.uz"}`}
            className="text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            &larr; {t("backToSite")}
          </a>
        </div>
      </aside>
    </>
  );
}
