'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
  Package,
  AlertTriangle,
  ArrowUpDown,
  Warehouse,
  User,
  Coffee,
  TrendingDown,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { inventoryApi } from '@/lib/api';
import Link from 'next/link';

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  minQuantity: number;
  maxQuantity?: number;
  unit: string;
  locationName?: string;
}

interface Movement {
  id: string;
  type: 'in' | 'out' | 'transfer' | 'adjustment';
  productName: string;
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
  createdAt: string;
  createdBy?: string;
}

type TabType = 'warehouse' | 'operator' | 'machine' | 'low-stock' | 'movements';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('warehouse');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: warehouseInventory, isLoading: warehouseLoading } = useQuery({
    queryKey: ['inventory', 'warehouse'],
    queryFn: () => inventoryApi.getWarehouse().then((res) => res.data.data),
    enabled: activeTab === 'warehouse',
  });

  const { data: lowStock, isLoading: lowStockLoading } = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: () => inventoryApi.getLowStock().then((res) => res.data.data),
    enabled: activeTab === 'low-stock',
  });

  const { data: movements, isLoading: movementsLoading } = useQuery({
    queryKey: ['inventory', 'movements'],
    queryFn: () => inventoryApi.getMovements().then((res) => res.data.data),
    enabled: activeTab === 'movements',
  });

  // Stats
  const stats = useMemo(() => ({
    totalProducts: warehouseInventory?.length || 0,
    lowStockCount: lowStock?.length || 0,
    totalValue: 0,
  }), [warehouseInventory, lowStock]);

  const tabs = [
    { id: 'warehouse' as const, label: 'Склад', icon: Warehouse },
    { id: 'operator' as const, label: 'У операторов', icon: User },
    { id: 'machine' as const, label: 'В автоматах', icon: Coffee },
    { id: 'low-stock' as const, label: 'Низкий запас', icon: AlertTriangle, count: stats.lowStockCount },
    { id: 'movements' as const, label: 'Движения', icon: ArrowUpDown },
  ];

  const isLoading = warehouseLoading || lowStockLoading || movementsLoading;

  const renderInventoryTable = (items: InventoryItem[]) => {
    const filtered = items?.filter((item) =>
      item.productName.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Товар</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">SKU</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Количество</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Мин.</th>
              <th className="text-center py-3 px-4 font-medium text-muted-foreground">Статус</th>
              {activeTab !== 'warehouse' && (
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Локация</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered?.map((item) => {
              const isLow = item.quantity <= item.minQuantity;
              return (
                <tr key={item.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.productName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {item.productSku || '-'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={isLow ? 'text-red-600 font-medium' : ''}>
                      {item.quantity} {item.unit}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-muted-foreground">
                    {item.minQuantity} {item.unit}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center">
                      {isLow ? (
                        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          Низкий
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600">
                          OK
                        </span>
                      )}
                    </div>
                  </td>
                  {activeTab !== 'warehouse' && (
                    <td className="py-3 px-4 text-muted-foreground">
                      {item.locationName || '-'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Товары не найдены
          </div>
        )}
      </div>
    );
  };

  const renderMovements = () => {
    return (
      <div className="space-y-4">
        {movements?.map((movement: Movement) => {
          const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
            in: { label: 'Приход', icon: TrendingUp, color: 'text-green-600' },
            out: { label: 'Расход', icon: TrendingDown, color: 'text-red-600' },
            transfer: { label: 'Перемещение', icon: ArrowRight, color: 'text-blue-600' },
            adjustment: { label: 'Корректировка', icon: ArrowUpDown, color: 'text-yellow-600' },
          };
          const config = typeConfig[movement.type] || typeConfig.adjustment;

          return (
            <Card key={movement.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg bg-muted ${config.color}`}>
                      <config.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{movement.productName}</h3>
                        <span className={`text-sm font-medium ${config.color}`}>
                          {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span>{config.label}</span>
                        {movement.fromLocation && movement.toLocation && (
                          <>
                            <span>•</span>
                            <span>{movement.fromLocation} → {movement.toLocation}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{new Date(movement.createdAt).toLocaleDateString('ru-RU')}</p>
                    {movement.createdBy && <p>{movement.createdBy}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {movements?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Нет движений за выбранный период
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Склад</h1>
          <p className="text-muted-foreground">
            3-уровневая система учёта: Склад → Оператор → Автомат
          </p>
        </div>
        <Link href="/dashboard/inventory/transfer">
          <Button>
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Перемещение
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Товаров на складе</p>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
              </div>
              <Boxes className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Низкий запас</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.lowStockCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Движений сегодня</p>
                <p className="text-2xl font-bold">{movements?.length || 0}</p>
              </div>
              <ArrowUpDown className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab.id)}
            className="gap-2"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
                {tab.count}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Search */}
      {activeTab !== 'movements' && (
        <Input
          placeholder="Поиск товара..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      )}

      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-16 ml-auto" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-12" />
                </div>
              ))}
            </div>
          ) : activeTab === 'movements' ? (
            renderMovements()
          ) : activeTab === 'low-stock' ? (
            renderInventoryTable(lowStock || [])
          ) : (
            renderInventoryTable(warehouseInventory || [])
          )}
        </CardContent>
      </Card>
    </div>
  );
}
