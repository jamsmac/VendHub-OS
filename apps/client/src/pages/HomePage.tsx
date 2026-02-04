import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin, Coffee, ArrowRight, Navigation } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { MachineCard } from '@/components/machine/MachineCard';
import { api } from '@/lib/api';
import { calculateDistance } from '@/lib/utils';

export function HomePage() {
  const { t } = useTranslation();
  const { position, error: geoError } = useGeolocation();

  const { data: machines, isLoading } = useQuery({
    queryKey: ['machines', position?.latitude, position?.longitude],
    queryFn: async () => {
      const res = await api.get('/machines');
      return res.data;
    },
  });

  // Sort by distance if we have user location
  const sortedMachines = machines
    ? [...machines]
        .map((m: any) => ({
          ...m,
          distance: position
            ? calculateDistance(
                position.latitude,
                position.longitude,
                m.latitude,
                m.longitude
              )
            : null,
        }))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, 6)
    : [];

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl gradient-coffee p-6 text-white">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-2">
            {t('findNearestMachine')}
          </h1>
          <p className="text-white/80 mb-4">
            {t('coffeeSnacksDrinksNearby')}
          </p>
          <Link
            to="/map"
            className="inline-flex items-center gap-2 bg-white text-primary px-4 py-2 rounded-xl font-medium hover:bg-white/90 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            {t('findNearest')}
          </Link>
        </div>
        <Coffee className="absolute right-4 bottom-4 w-24 h-24 text-white/20" />
      </section>

      {/* Quick Stats */}
      <section className="grid grid-cols-3 gap-3">
        <div className="card-coffee p-4 text-center">
          <div className="text-2xl font-bold text-primary">
            {machines?.length || 0}
          </div>
          <div className="text-xs text-muted-foreground">{t('machines')}</div>
        </div>
        <div className="card-coffee p-4 text-center">
          <div className="text-2xl font-bold text-primary">24/7</div>
          <div className="text-xs text-muted-foreground">{t('weWork')}</div>
        </div>
        <div className="card-coffee p-4 text-center">
          <div className="text-2xl font-bold text-primary">54+</div>
          <div className="text-xs text-muted-foreground">{t('drinksCount')}</div>
        </div>
      </section>

      {/* Nearby Machines */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('nearby')}</h2>
          <Link
            to="/map"
            className="text-sm text-primary flex items-center gap-1"
          >
            {t('all')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : sortedMachines.length > 0 ? (
          <div className="space-y-3">
            {sortedMachines.map((machine: any) => (
              <MachineCard key={machine.id} machine={machine} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Coffee className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('noMachinesNearby')}</p>
          </div>
        )}
      </section>

      {/* Location Permission Notice */}
      {geoError && (
        <section className="card-coffee p-4">
          <div className="flex items-start gap-3">
            <Navigation className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">{t('enableGeolocation')}</p>
              <p className="text-xs text-muted-foreground">
                {t('locationPermission')}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
