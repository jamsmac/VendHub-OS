"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, LogOut } from "lucide-react";
import { signOut } from "@/lib/admin-auth";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

interface AdminHeaderProps {
  title: string;
  email: string | null;
  onMenuToggle: () => void;
}

export default function AdminHeader({
  title,
  email,
  onMenuToggle,
}: AdminHeaderProps) {
  const router = useRouter();
  const t = useTranslations("admin.sidebar");

  const handleLogout = async () => {
    await signOut();
    router.push("/admin/login");
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-espresso/10 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden text-espresso/60 hover:text-espresso transition-colors p-1"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-lg font-bold text-espresso">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {email && (
            <span className="hidden sm:block text-sm text-espresso/50">
              {email}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-espresso/50 hover:text-red-500 transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">{t("logout")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
