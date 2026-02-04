'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Coffee,
  LayoutDashboard,
  Package,
  Boxes,
  ClipboardList,
  Users,
  MapPin,
  BarChart3,
  Settings,
  LogOut,
  MessageSquare,
  CreditCard,
  Bell,
  FileText,
  UserCog,
  Wrench,
  ShoppingCart,
  PackagePlus,
  Clock,
  Building2,
  Receipt,
  Plug,
  Database,
  Navigation,
  Route,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth';

const navigation = [
  { name: 'Дашборд', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Автоматы', href: '/dashboard/machines', icon: Coffee },
  { name: 'Товары', href: '/dashboard/products', icon: Package },
  { name: 'Склад', href: '/dashboard/inventory', icon: Boxes },
  { name: 'Заказы', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'Задачи', href: '/dashboard/tasks', icon: ClipboardList },
  { name: 'Рейсы', href: '/dashboard/trips', icon: Navigation },
  { name: 'Маршруты', href: '/dashboard/routes', icon: Route },
  { name: 'Техобслуживание', href: '/dashboard/maintenance', icon: Wrench },
  { name: 'Заявки', href: '/dashboard/material-requests', icon: PackagePlus },
  { name: 'Жалобы', href: '/dashboard/complaints', icon: MessageSquare },
  { name: 'Транзакции', href: '/dashboard/transactions', icon: CreditCard },
  { name: 'Сотрудники', href: '/dashboard/employees', icon: UserCog },
  { name: 'Подрядчики', href: '/dashboard/contractors', icon: Building2 },
  { name: 'Табель', href: '/dashboard/work-logs', icon: Clock },
  { name: 'Пользователи', href: '/dashboard/users', icon: Users },
  { name: 'Локации', href: '/dashboard/locations', icon: MapPin },
  { name: 'Отчёты', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Фискализация', href: '/dashboard/fiscal', icon: Receipt },
  { name: 'Мастер-данные', href: '/dashboard/directories', icon: Database },
  { name: 'Интеграции', href: '/dashboard/integrations', icon: Plug },
  { name: 'Аудит', href: '/dashboard/audit', icon: FileText },
  { name: 'Уведомления', href: '/dashboard/notifications', icon: Bell },
  { name: 'Настройки', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuthStore();

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Coffee className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg">VendHub</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t p-3">
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </div>
  );
}
