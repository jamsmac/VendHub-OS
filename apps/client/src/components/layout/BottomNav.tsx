import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Map, QrCode, Receipt, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'home' },
  { path: '/map', icon: Map, label: 'map' },
  { path: '/scan', icon: QrCode, label: 'scan' },
  { path: '/transactions', icon: Receipt, label: 'История' },
  { path: '/profile', icon: User, label: 'Профиль' },
];

export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-bottom">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'w-5 h-5 transition-transform',
                      isActive && 'scale-110'
                    )}
                  />
                  <span className="text-xs font-medium">
                    {item.label === 'Профиль' ? item.label : t(item.label)}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
