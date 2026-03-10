"use client";

import { Bell, Moon, Sun, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MobileSidebar } from "./sidebar";

interface User {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role?: string;
}

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("common");
  const tAuth = useTranslations("auth");
  const tSettings = useTranslations("settings");

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
  };

  const notificationCount = 3;

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger (Issue #1) */}
        <MobileSidebar />

        {/* Search — responsive width (Issue #3 + #8) + shortcut hint (Issue #20) */}
        <div className="relative hidden sm:block w-full max-w-96">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={t("search")}
            className="pl-10 pr-12"
            aria-label={t("search")}
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Theme Toggle — announces current state (Issue #10) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={
            theme === "dark"
              ? tSettings.has("switchToLight")
                ? tSettings("switchToLight")
                : "Switch to light mode"
              : tSettings.has("switchToDark")
                ? tSettings("switchToDark")
                : "Switch to dark mode"
          }
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* Notifications — count announced to screen readers (Issue #4) */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`${tSettings.has("notifications") ? tSettings("notifications") : "Notifications"}: ${notificationCount}`}
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center"
              aria-hidden="true"
            >
              {notificationCount}
            </span>
          )}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback>
                  {getInitials(user?.firstName, user?.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user?.role}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{tAuth("login")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{tSettings("general")}</DropdownMenuItem>
            <DropdownMenuItem>{tSettings("settings")}</DropdownMenuItem>
            <DropdownMenuItem>{tSettings("security")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              {tAuth("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
