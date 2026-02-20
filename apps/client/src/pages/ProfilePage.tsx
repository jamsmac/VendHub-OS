/**
 * Profile Page
 * User profile with settings and preferences
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  User,
  Bell,
  Globe,
  Moon,
  Sun,
  Shield,
  HelpCircle,
  MessageCircle,
  FileText,
  ChevronRight,
  Phone,
  Mail,
  ExternalLink,
  QrCode,
  History,
  Heart,
} from 'lucide-react';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';

type Language = 'ru' | 'uz' | 'en';
type Theme = 'light' | 'dark' | 'system';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  href?: string;
  external?: boolean;
  value?: string | boolean;
  toggle?: boolean;
  onClick?: () => void;
}

const languages: Record<Language, string> = {
  ru: 'Русский',
  uz: "O'zbekcha",
  en: 'English',
};

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<Theme>('system');
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState<Language>(
    (i18n.language as Language) || 'ru'
  );
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    setShowLanguagePicker(false);
    toast.success(t('languageChangedTo', { lang: languages[lang] }));
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    // Apply theme
    if (newTheme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', systemDark);
    } else {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
    toast.success(t('themeChanged'));
  };

  const menuItems: { group: string; items: MenuItem[] }[] = [
    {
      group: t('profileGroupAccount'),
      items: [
        {
          icon: History,
          label: t('purchaseHistory'),
          href: '/transactions',
        },
        {
          icon: Heart,
          label: t('favoriteMachines'),
          href: '/favorites',
        },
        {
          icon: QrCode,
          label: t('scanQR'),
          href: '/scan',
        },
      ],
    },
    {
      group: t('settings'),
      items: [
        {
          icon: Globe,
          label: t('language'),
          value: languages[language],
          onClick: () => setShowLanguagePicker(true),
        },
        {
          icon: theme === 'dark' ? Moon : Sun,
          label: t('profileTheme'),
          value: theme === 'light' ? t('themeLight') : theme === 'dark' ? t('themeDark') : t('themeSystem'),
          onClick: () => handleThemeChange(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'),
        },
        {
          icon: Bell,
          label: t('notifications'),
          toggle: true,
          value: notifications,
          onClick: () => {
            setNotifications(!notifications);
            toast.success(notifications ? t('notificationsDisabled') : t('notificationsEnabled'));
          },
        },
      ],
    },
    {
      group: t('profileGroupSupport'),
      items: [
        {
          icon: MessageCircle,
          label: t('telegramBot'),
          href: 'https://t.me/VendHubBot',
          external: true,
        },
        {
          icon: Phone,
          label: t('hotline'),
          value: '+998 71 200 00 00',
          onClick: () => window.open('tel:+998712000000'),
        },
        {
          icon: Mail,
          label: t('supportEmail'),
          value: 'support@vendhub.uz',
          onClick: () => window.open('mailto:support@vendhub.uz'),
        },
        {
          icon: HelpCircle,
          label: t('faq'),
          href: '/faq',
        },
      ],
    },
    {
      group: t('profileGroupInfo'),
      items: [
        {
          icon: FileText,
          label: t('termsOfService'),
          href: '/terms',
        },
        {
          icon: Shield,
          label: t('privacyPolicy'),
          href: '/privacy',
        },
      ],
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">{t('profile')}</h1>
      </div>

      {/* User Card */}
      <div className="card-coffee p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{t('guest')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('loginToSaveHistory')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t">
          <Link to="/transactions" className="text-center">
            <p className="text-2xl font-bold text-primary">0</p>
            <p className="text-xs text-muted-foreground">{t('profilePurchases')}</p>
          </Link>
          <Link to="/favorites" className="text-center">
            <p className="text-2xl font-bold text-primary">0</p>
            <p className="text-xs text-muted-foreground">{t('profileFavorites')}</p>
          </Link>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">0</p>
            <p className="text-xs text-muted-foreground">UZS</p>
          </div>
        </div>
      </div>

      {/* Menu Groups */}
      {menuItems.map((group) => (
        <div key={group.group} className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-1">
            {group.group}
          </h3>
          <div className="card-coffee divide-y">
            {group.items.map((item, idx) => {
              const Icon = item.icon;
              const content = (
                <div className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.label}</p>
                    {item.value && typeof item.value === 'string' && (
                      <p className="text-sm text-muted-foreground truncate">
                        {item.value}
                      </p>
                    )}
                  </div>
                  {item.toggle ? (
                    <button
                      onClick={item.onClick}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        item.value ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          item.value ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  ) : item.external ? (
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              );

              if (item.href && !item.external) {
                return (
                  <Link key={idx} to={item.href} className="block hover:bg-muted/50 transition-colors">
                    {content}
                  </Link>
                );
              }

              if (item.external && item.href) {
                return (
                  <a
                    key={idx}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:bg-muted/50 transition-colors"
                  >
                    {content}
                  </a>
                );
              }

              return (
                <button
                  key={idx}
                  onClick={item.onClick}
                  className="w-full text-left hover:bg-muted/50 transition-colors"
                >
                  {content}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* App Version */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          VendHub v1.0.0
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('allRightsReserved')}
        </p>
      </div>

      {/* Language Picker Modal */}
      {showLanguagePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-background rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-center">{t('chooseLanguage')}</h3>
            <div className="space-y-2">
              {(Object.entries(languages) as [Language, string][]).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => handleLanguageChange(code)}
                  className={`w-full p-4 rounded-xl text-left transition-colors ${
                    language === code
                      ? 'bg-primary text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowLanguagePicker(false)}
              className="w-full py-3 border border-border rounded-xl font-medium"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
