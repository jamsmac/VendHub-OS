import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Navigation, X } from 'lucide-react';
import {
  formatDistance,
  getMachineTypeIcon,
  getMachineStatusColor,
  cn,
} from '@/lib/utils';

interface MachineCardProps {
  machine: any;
  onClick?: () => void;
  onClose?: () => void;
}

export function MachineCard({ machine, onClick, onClose }: MachineCardProps) {
  const { t } = useTranslation();

  const handleDirections = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${machine.latitude},${machine.longitude}`;
    window.open(url, '_blank');
  };

  const content = (
    <div className="card-coffee p-4 flex gap-4 relative">
      {onClose && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Icon */}
      <div className="w-12 h-12 rounded-xl gradient-coffee flex items-center justify-center text-2xl shrink-0">
        {getMachineTypeIcon(machine.type)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium truncate">{machine.name}</h3>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full shrink-0',
              getMachineStatusColor(machine.status)
            )}
          >
            {t(machine.status)}
          </span>
        </div>

        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate">
            {machine.location?.address || machine.address || 'Адрес не указан'}
          </span>
        </div>

        <div className="flex items-center justify-between mt-2">
          {machine.distance !== null && machine.distance !== undefined && (
            <span className="text-sm font-medium text-primary">
              {formatDistance(machine.distance)} {t('away')}
            </span>
          )}

          <button
            onClick={handleDirections}
            className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Navigation className="w-3 h-3" />
            {t('getDirections')}
          </button>
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  return (
    <Link to={`/machine/${machine.id}`} className="block">
      {content}
    </Link>
  );
}
