import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Navigation,
  Clock,
  Coffee,
  Share2,
  QrCode,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  getMachineTypeIcon,
  getMachineStatusColor,
} from '@/lib/utils';

export function MachineDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();

  const { data: machine, isLoading } = useQuery({
    queryKey: ['machine', id],
    queryFn: async () => {
      const res = await api.get(`/machines/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="h-48 bg-muted rounded-2xl" />
          <div className="h-24 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="container mx-auto px-4 py-6 text-center">
        <p className="text-muted-foreground">{t('machineNotFound')}</p>
        <Link to="/" className="text-primary mt-2 inline-block">
          {t('goHome')}
        </Link>
      </div>
    );
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: machine.name,
        text: t('machineShareText', { name: machine.name, address: machine.location?.address }),
        url: window.location.href,
      });
    }
  };

  const handleDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${machine.latitude},${machine.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('back')}
      </Link>

      {/* Hero */}
      <div className="card-coffee overflow-hidden">
        <div className="gradient-coffee p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-3xl mb-2 block">
                {getMachineTypeIcon(machine.type)}
              </span>
              <h1 className="text-xl font-bold">{machine.name}</h1>
              <p className="text-white/80 text-sm mt-1">
                {machine.location?.address}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${getMachineStatusColor(
                machine.status
              )}`}
            >
              {t(machine.status)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 divide-x border-t">
          <button
            onClick={handleDirections}
            className="flex flex-col items-center gap-1 py-4 hover:bg-muted transition-colors"
          >
            <Navigation className="w-5 h-5 text-primary" />
            <span className="text-xs">{t('getDirections')}</span>
          </button>
          <Link
            to={`/menu/${machine.id}`}
            className="flex flex-col items-center gap-1 py-4 hover:bg-muted transition-colors"
          >
            <Coffee className="w-5 h-5 text-primary" />
            <span className="text-xs">{t('viewMenu')}</span>
          </Link>
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 py-4 hover:bg-muted transition-colors"
          >
            <Share2 className="w-5 h-5 text-primary" />
            <span className="text-xs">{t('share')}</span>
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-coffee p-4">
          <Clock className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-medium">
            {machine.settings?.is24Hours ? t('open24h') : t('bySchedule')}
          </p>
        </div>
        <div className="card-coffee p-4">
          <QrCode className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-medium">{t('qrPayment')}</p>
        </div>
      </div>

      {/* Description */}
      {machine.description && (
        <div className="card-coffee p-4">
          <h3 className="font-medium mb-2">{t('description')}</h3>
          <p className="text-sm text-muted-foreground">{machine.description}</p>
        </div>
      )}

      {/* View Menu Button */}
      <Link
        to={`/menu/${machine.id}`}
        className="btn-primary w-full text-center block"
      >
        {t('viewMenu')}
      </Link>
    </div>
  );
}
