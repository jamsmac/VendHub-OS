'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Battery, Banknote, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface MapMachine {
  id: string;
  name: string;
  machineNumber?: string;
  latitude?: number;
  longitude?: number;
  status: string;
  address?: string;
  stockLevel?: number;
  cashAmount?: number;
}

const statusConfig: Record<string, { label: string; color: string; markerColor: string }> = {
  active: { label: 'Активен', color: 'text-green-600', markerColor: 'bg-green-500' },
  low_stock: { label: 'Мало товара', color: 'text-yellow-600', markerColor: 'bg-yellow-500' },
  error: { label: 'Ошибка', color: 'text-red-600', markerColor: 'bg-red-500' },
  maintenance: { label: 'Обслуживание', color: 'text-blue-600', markerColor: 'bg-blue-500' },
  offline: { label: 'Оффлайн', color: 'text-gray-600', markerColor: 'bg-gray-400' },
  disabled: { label: 'Отключен', color: 'text-gray-400', markerColor: 'bg-gray-300' },
};

interface MachineMapProps {
  machines: MapMachine[];
}

export function MachineMap({ machines }: MachineMapProps) {
  const [selectedMachine, setSelectedMachine] = useState<MapMachine | null>(null);

  // Count by status for legend
  const statusCounts = machines.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(statusConfig).map(([key, config]) => (
          statusCounts[key] ? (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className={`w-3 h-3 rounded-full ${config.markerColor}`} />
              <span>{config.label}</span>
              <span className="text-muted-foreground">({statusCounts[key]})</span>
            </div>
          ) : null
        ))}
      </div>

      {/* Map placeholder -- will be replaced with Yandex Maps integration */}
      <Card className="overflow-hidden">
        <div className="relative bg-slate-100 h-[500px] flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium text-muted-foreground">
              Карта автоматов
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {machines.length} автоматов на карте
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Интеграция с Яндекс Картами будет добавлена после установки пакета
            </p>
          </div>
        </div>
      </Card>

      {/* Machine list below map -- grouped by status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {machines.map((machine) => {
          const status = statusConfig[machine.status] || statusConfig.offline;
          return (
            <Card
              key={machine.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                selectedMachine?.id === machine.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedMachine(machine)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status.markerColor}`} />
                    <span className="font-medium text-sm truncate">{machine.name}</span>
                  </div>
                  <span className={`text-xs ${status.color}`}>{status.label}</span>
                </div>
                {machine.address && (
                  <p className="text-xs text-muted-foreground truncate mb-1">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    {machine.address}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  {machine.stockLevel !== undefined && (
                    <span className="flex items-center gap-1">
                      <Battery className="h-3 w-3" />
                      {machine.stockLevel}%
                    </span>
                  )}
                  {machine.cashAmount !== undefined && (
                    <span className="flex items-center gap-1">
                      <Banknote className="h-3 w-3" />
                      {new Intl.NumberFormat('uz-UZ').format(machine.cashAmount)} сум
                    </span>
                  )}
                  <Link href={`/dashboard/machines/${machine.id}`}>
                    <Button variant="ghost" size="sm" className="h-6 px-2">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
