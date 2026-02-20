import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Coffee, Globe, Menu, X } from 'lucide-react';

export function Header() {
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ru' ? 'uz' : 'ru';
    i18n.changeLanguage(newLang);
  };

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border safe-top">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 gradient-coffee rounded-lg flex items-center justify-center">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">VendHub</span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="p-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-1"
          >
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium uppercase">
              {i18n.language}
            </span>
          </button>

          {/* Mobile Menu */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-lg hover:bg-muted transition-colors md:hidden"
          >
            {isMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-card p-4">
          <nav className="space-y-2">
            <Link
              to="/"
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-2 rounded-lg hover:bg-muted"
            >
              {t('home')}
            </Link>
            <Link
              to="/map"
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-2 rounded-lg hover:bg-muted"
            >
              {t('map')}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
