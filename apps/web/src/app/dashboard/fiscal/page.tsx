'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Receipt,
  CreditCard,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Settings,
  Play,
  Square,
  FileText,
  RefreshCw,
  Download,
  QrCode,
  Search,
} from 'lucide-react';
import { fiscalApi } from '@/lib/api';
import type {
  FiscalDevice,
  FiscalReceipt,
  FiscalReceiptItem,
  FiscalReceiptStatus,
  FiscalReceiptsResponse,
  DeviceStatistics,
  FiscalDeviceStatus,
  CreateFiscalDeviceRequest,
  OpenShiftResponse,
  CloseShiftResponse,
  XReportResponse,
} from '@/types/fiscal.types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' sum';
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DeviceStatusBadge({ status }: { status: FiscalDeviceStatus }) {
  const config: Record<FiscalDeviceStatus, { label: string; className: string }> = {
    active: { label: 'Aktivnyj', className: 'bg-green-500' },
    inactive: { label: 'Neaktivnyj', className: 'bg-gray-400' },
    error: { label: 'Oshibka', className: 'bg-red-500' },
    maintenance: { label: 'Obsluzhivanie', className: 'bg-yellow-500 text-white' },
  };

  const { label, className } = config[status];
  return <Badge className={className}>{label}</Badge>;
}

function ReceiptStatusBadge({ status }: { status: FiscalReceiptStatus }) {
  const config: Record<FiscalReceiptStatus, { icon: React.ElementType; label: string; className: string }> = {
    pending: { icon: Clock, label: 'Ozhidanie', className: 'text-yellow-600' },
    processing: { icon: RefreshCw, label: 'Obrabotka', className: 'text-blue-600 animate-spin' },
    success: { icon: CheckCircle, label: 'Uspeshno', className: 'text-green-600' },
    failed: { icon: XCircle, label: 'Oshibka', className: 'text-red-600' },
    cancelled: { icon: XCircle, label: 'Otmeneno', className: 'text-gray-600' },
  };

  const { icon: Icon, label, className } = config[status];
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function DeviceCard({ device, onOpenShift, onCloseShift, onXReport, isActioning }: {
  device: DeviceStatistics;
  onOpenShift: (deviceId: string) => void;
  onCloseShift: (deviceId: string) => void;
  onXReport: (deviceId: string) => void;
  isActioning: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            <CardTitle className="text-lg">{device.deviceName}</CardTitle>
          </div>
          <DeviceStatusBadge status={device.status} />
        </div>
      </CardHeader>
      <CardContent>
        {device.currentShift ? (
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-green-800">
                Smena #{device.currentShift.shiftNumber} otkryta
              </span>
              <Badge className="bg-green-500">Aktivna</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
              <div>Kassir: {device.currentShift.cashierName}</div>
              <div>Otkryta: {formatDateTime(device.currentShift.openedAt)}</div>
              <div>Prodazh: {formatCurrency(device.currentShift.totalSales)}</div>
              <div>Chekov: {device.currentShift.receiptsCount}</div>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
            <div className="text-muted-foreground">Smena ne otkryta</div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-2xl font-bold text-blue-600">
              {device.todayStats.receiptsCount}
            </div>
            <div className="text-xs text-blue-600">Chekov segodnya</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(device.todayStats.totalSales)}
            </div>
            <div className="text-xs text-green-600">Prodazhi</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <div className="text-lg font-bold text-red-600">
              {formatCurrency(device.todayStats.totalRefunds)}
            </div>
            <div className="text-xs text-red-600">Vozvraty</div>
          </div>
        </div>

        {(device.queueStats.pending > 0 || device.queueStats.failed > 0) && (
          <div className="mb-4 p-2 bg-yellow-50 rounded border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                V ocheredi: {device.queueStats.pending} | Oshibok: {device.queueStats.failed}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!device.currentShift ? (
            <Button
              size="sm"
              onClick={() => onOpenShift(device.deviceId)}
              disabled={device.status !== 'active' || isActioning}
            >
              <Play className="h-4 w-4 mr-1" />
              Otkryt' smenu
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onCloseShift(device.deviceId)}
                disabled={isActioning}
              >
                <Square className="h-4 w-4 mr-1" />
                Zakryt' smenu
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onXReport(device.deviceId)}
                disabled={isActioning}
              >
                <FileText className="h-4 w-4 mr-1" />
                X-otchyot
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ReceiptRow({ receipt }: { receipt: FiscalReceipt }) {
  return (
    <div className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${receipt.type === 'sale' ? 'bg-green-100' : 'bg-red-100'}`}>
          {receipt.type === 'sale' ? (
            <CreditCard className="h-4 w-4 text-green-600" />
          ) : (
            <RefreshCw className="h-4 w-4 text-red-600" />
          )}
        </div>
        <div>
          <div className="font-medium">
            {receipt.type === 'sale' ? 'Prodazha' : 'Vozvrat'} {formatCurrency(receipt.total)}
          </div>
          <div className="text-sm text-muted-foreground">
            {receipt.items.map(i => i.name).join(', ')}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDateTime(receipt.createdAt)}
            {receipt.fiscalNumber && ` | ${receipt.fiscalNumber}`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ReceiptStatusBadge status={receipt.status} />
        {receipt.qrCodeUrl && (
          <Button size="sm" variant="ghost" asChild>
            <a href={receipt.qrCodeUrl} target="_blank" rel="noopener noreferrer">
              <QrCode className="h-4 w-4" />
            </a>
          </Button>
        )}
        {receipt.receiptUrl && (
          <Button size="sm" variant="ghost" asChild>
            <a href={receipt.receiptUrl} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function FiscalPage() {
  const queryClient = useQueryClient();
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [receiptFilter, setReceiptFilter] = useState<string>('');
  const [newDevice, setNewDevice] = useState<Partial<CreateFiscalDeviceRequest>>({
    provider: 'multikassa',
    sandboxMode: true,
    credentials: {},
    config: { defaultCashier: 'VendHub Auto' },
  });

  const { data: devices = [], isLoading: devicesLoading } = useQuery<FiscalDevice[]>({
    queryKey: ['fiscal', 'devices'],
    queryFn: fiscalApi.getDevices,
  });

  const deviceStatsQueries = useQuery<DeviceStatistics[]>({
    queryKey: ['fiscal', 'device-stats', devices.map((d: FiscalDevice) => d.id)],
    queryFn: async (): Promise<DeviceStatistics[]> => {
      if (devices.length === 0) return [];
      const stats = await Promise.all(
        devices.map((d: FiscalDevice) => fiscalApi.getDeviceStatistics(d.id).catch(() => ({
          deviceId: d.id,
          deviceName: d.name,
          status: d.status,
          todayStats: { receiptsCount: 0, totalSales: 0, totalRefunds: 0 },
          queueStats: { pending: 0, failed: 0 },
        })))
      );
      return stats;
    },
    enabled: devices.length > 0,
  });

  const deviceStats = deviceStatsQueries.data ?? [];

  const { data: receiptsData, isLoading: receiptsLoading } = useQuery<FiscalReceiptsResponse>({
    queryKey: ['fiscal', 'receipts'],
    queryFn: () => fiscalApi.getReceipts({ limit: 50 }),
  });

  const receipts = receiptsData?.receipts ?? [];

  const openShiftMutation = useMutation({
    mutationFn: (deviceId: string) => fiscalApi.openShift(deviceId, { cashierName: 'VendHub Auto' }),
    onSuccess: (data: OpenShiftResponse) => {
      toast.success('Smena otkryta', { description: `Smena #${data.shiftNumber}` });
      queryClient.invalidateQueries({ queryKey: ['fiscal'] });
    },
    onError: () => toast.error('Oshibka otkrytiya smeny'),
  });

  const closeShiftMutation = useMutation({
    mutationFn: (deviceId: string) => fiscalApi.closeShift(deviceId),
    onSuccess: (data: CloseShiftResponse) => {
      toast.success('Smena zakryta', {
        description: `Z-otchyot: ${data.zReportNumber} | Prodazhi: ${formatCurrency(data.totalSales)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['fiscal'] });
    },
    onError: () => toast.error('Oshibka zakrytiya smeny'),
  });

  const xReportMutation = useMutation({
    mutationFn: (deviceId: string) => fiscalApi.getXReport(deviceId),
    onSuccess: (data: XReportResponse) => {
      toast.success('X-otchyot sformirovan', {
        description: `Prodazhi: ${formatCurrency(data.totalSales)} | Chekov: ${data.receiptsCount}`,
      });
    },
    onError: () => toast.error('Oshibka formirovaniya X-otchyota'),
  });

  const createDeviceMutation = useMutation({
    mutationFn: (data: CreateFiscalDeviceRequest) => fiscalApi.createDevice(data),
    onSuccess: () => {
      toast.success('Ustrojstvo dobavleno');
      setShowAddDevice(false);
      setNewDevice({
        provider: 'multikassa',
        sandboxMode: true,
        credentials: {},
        config: { defaultCashier: 'VendHub Auto' },
      });
      queryClient.invalidateQueries({ queryKey: ['fiscal'] });
    },
    onError: () => toast.error('Oshibka dobavleniya ustrojstva'),
  });

  const isActioning = openShiftMutation.isPending || closeShiftMutation.isPending || xReportMutation.isPending;

  const { totalSalesToday, totalReceiptsToday, totalRefundsToday, pendingQueue } = useMemo(() => ({
    totalSalesToday: deviceStats.reduce((sum, d) => sum + d.todayStats.totalSales, 0),
    totalReceiptsToday: deviceStats.reduce((sum, d) => sum + d.todayStats.receiptsCount, 0),
    totalRefundsToday: deviceStats.reduce((sum, d) => sum + d.todayStats.totalRefunds, 0),
    pendingQueue: deviceStats.reduce((sum, d) => sum + d.queueStats.pending, 0),
  }), [deviceStats]);

  const filteredReceipts = receipts.filter((r: FiscalReceipt) =>
    !receiptFilter ||
    r.fiscalNumber?.toLowerCase().includes(receiptFilter.toLowerCase()) ||
    r.items.some((i: FiscalReceiptItem) => i.name.toLowerCase().includes(receiptFilter.toLowerCase()))
  );

  const handleSubmitDevice = () => {
    if (!newDevice.name || !newDevice.credentials?.login || !newDevice.credentials?.password) {
      toast.error('Zapolnite obyazatel\'nye polya');
      return;
    }
    createDeviceMutation.mutate(newDevice as CreateFiscalDeviceRequest);
  };

  if (devicesLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fiskalizatsiya</h1>
          <p className="text-muted-foreground">
            MultiKassa | Cheki | Z-otchyoty | Smeny
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['fiscal'] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Obnovit'
          </Button>
          <Button onClick={() => setShowAddDevice(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Dobavit' ustrojstvo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prodazhi segodnya</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSalesToday)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chekov segodnya</p>
                <p className="text-2xl font-bold text-blue-600">{totalReceiptsToday}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Receipt className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vozvraty</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalRefundsToday)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <RefreshCw className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">V ocheredi</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingQueue}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Fiskal'nye ustrojstva</h2>
        {deviceStats.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Net podklyuchennykh ustrojstv</p>
              <Button className="mt-4" onClick={() => setShowAddDevice(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Dobavit' ustrojstvo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {deviceStats.map(device => (
              <DeviceCard
                key={device.deviceId}
                device={device}
                onOpenShift={(id) => openShiftMutation.mutate(id)}
                onCloseShift={(id) => closeShiftMutation.mutate(id)}
                onXReport={(id) => xReportMutation.mutate(id)}
                isActioning={isActioning}
              />
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Poslednie cheki</CardTitle>
              <CardDescription>Istoriya fiskalizirovannykh chekov</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Poisk chekov..."
                  value={receiptFilter}
                  onChange={(e) => setReceiptFilter(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {receiptsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Net chekov
            </div>
          ) : (
            <div className="divide-y">
              {filteredReceipts.map((receipt: FiscalReceipt) => (
                <ReceiptRow key={receipt.id} receipt={receipt} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showAddDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Dobavit' fiskal'noe ustrojstvo</CardTitle>
              <CardDescription>Podklyuchenie k MultiKassa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nazvanie ustrojstva *</Label>
                <Input
                  id="name"
                  placeholder="MultiKassa Terminal 1"
                  value={newDevice.name ?? ''}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="login">Login *</Label>
                <Input
                  id="login"
                  placeholder="Login ot MultiKassa"
                  value={newDevice.credentials?.login ?? ''}
                  onChange={(e) => setNewDevice(prev => ({
                    ...prev,
                    credentials: { ...prev.credentials, login: e.target.value },
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="password">Parol' *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Parol'"
                  value={newDevice.credentials?.password ?? ''}
                  onChange={(e) => setNewDevice(prev => ({
                    ...prev,
                    credentials: { ...prev.credentials, password: e.target.value },
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="tin">INN kompanii</Label>
                <Input
                  id="tin"
                  placeholder="123456789"
                  value={newDevice.credentials?.companyTin ?? ''}
                  onChange={(e) => setNewDevice(prev => ({
                    ...prev,
                    credentials: { ...prev.credentials, companyTin: e.target.value },
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="cashier">Kassir po umolchaniyu</Label>
                <Input
                  id="cashier"
                  placeholder="VendHub Auto"
                  value={newDevice.config?.defaultCashier ?? ''}
                  onChange={(e) => setNewDevice(prev => ({
                    ...prev,
                    config: { ...prev.config, defaultCashier: e.target.value },
                  }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sandbox"
                  checked={newDevice.sandboxMode ?? true}
                  onChange={(e) => setNewDevice(prev => ({ ...prev, sandboxMode: e.target.checked }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="sandbox">Rezhim pesochnitsy (Sandbox)</Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddDevice(false)}>
                  Otmena
                </Button>
                <Button onClick={handleSubmitDevice} disabled={createDeviceMutation.isPending}>
                  {createDeviceMutation.isPending ? 'Dobavlenie...' : 'Dobavit\''}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
