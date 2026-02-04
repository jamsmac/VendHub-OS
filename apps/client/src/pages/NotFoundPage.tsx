import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Coffee, Home } from 'lucide-react';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <Coffee className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
      <h1 className="text-2xl font-bold mb-2">{t('pageNotFound')}</h1>
      <p className="text-muted-foreground mb-6">
        {t('pageNotFoundDescription')}
      </p>
      <Link
        to="/"
        className="btn-primary inline-flex items-center gap-2"
      >
        <Home className="w-4 h-4" />
        {t('goToHome')}
      </Link>
    </div>
  );
}
