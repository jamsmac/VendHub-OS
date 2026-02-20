import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Locate, List, Map as MapIcon } from 'lucide-react';
import { GoogleMap } from '@/components/map/GoogleMap';
import { MachineCard } from '@/components/machine/MachineCard';
import { useGeolocation } from '@/hooks/useGeolocation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export function MapPage() {
  const { t } = useTranslation();
  const { position, getCurrentPosition } = useGeolocation();
  const [view, setView] = useState<'map' | 'list'>('map');
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { data: machines, isLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const res = await api.get('/machines');
      return res.data;
    },
  });

  const handleCenterOnUser = useCallback(() => {
    getCurrentPosition();
    if (position && mapRef.current) {
      mapRef.current.panTo({
        lat: position.latitude,
        lng: position.longitude,
      });
    }
  }, [position, getCurrentPosition]);

  const handleMachineClick = useCallback((machine: any) => {
    setSelectedMachine(machine);
    if (mapRef.current) {
      mapRef.current.panTo({
        lat: machine.latitude,
        lng: machine.longitude,
      });
      mapRef.current.setZoom(16);
    }
  }, []);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* View Toggle */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b">
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setView('map')}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1',
              view === 'map'
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground'
            )}
          >
            <MapIcon className="w-4 h-4" />
            {t('map')}
          </button>
          <button
            onClick={() => setView('list')}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1',
              view === 'list'
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground'
            )}
          >
            <List className="w-4 h-4" />
            {t('list')}
          </button>
        </div>

        <button
          onClick={handleCenterOnUser}
          className="p-2 rounded-lg bg-primary text-primary-foreground"
        >
          <Locate className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {view === 'map' ? (
          <>
            <GoogleMap
              machines={machines || []}
              userLocation={position}
              onMachineClick={handleMachineClick}
              mapRef={mapRef}
            />

            {/* Selected Machine Card */}
            {selectedMachine && (
              <div className="absolute bottom-4 left-4 right-4">
                <MachineCard
                  machine={selectedMachine}
                  onClose={() => setSelectedMachine(null)}
                />
              </div>
            )}
          </>
        ) : (
          <div className="h-full overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              Array(5)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-2xl bg-muted animate-pulse"
                  />
                ))
            ) : machines?.length > 0 ? (
              machines.map((machine: any) => (
                <MachineCard
                  key={machine.id}
                  machine={machine}
                  onClick={() => {
                    setSelectedMachine(machine);
                    setView('map');
                  }}
                />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {t('noMachinesNearby')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
