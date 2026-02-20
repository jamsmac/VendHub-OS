'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Package,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { productsApi } from '@/lib/api';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: 'active' | 'low_stock' | 'out_of_stock';
}

const categories = [
  { key: 'All', label: 'Все' },
  { key: 'Beverages', label: 'Напитки' },
  { key: 'Snacks', label: 'Снэки' },
  { key: 'Energy', label: 'Энергетики' },
  { key: 'Dairy', label: 'Молочные' },
  { key: 'Other', label: 'Другое' },
];

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  active: { label: 'В наличии', color: 'text-green-600', bgColor: 'bg-green-100' },
  low_stock: { label: 'Мало', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  out_of_stock: { label: 'Нет в наличии', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('uz-UZ').format(price) + ' сум';
};

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [confirmState, setConfirmState] = useState<{ title: string; action: () => void } | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: products, isLoading, isError } = useQuery({
    queryKey: ['products', debouncedSearch, selectedCategory],
    queryFn: () =>
      productsApi
        .getAll({
          search: debouncedSearch,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
        })
        .then((res) => res.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Продукт удалён');
    },
    onError: () => {
      toast.error('Не удалось удалить продукт');
    },
  });

  // Stats
  const stats = useMemo(() => ({
    total: products?.length || 0,
    inStock: products?.filter((p: Product) => p.status === 'active').length || 0,
    lowStock: products?.filter((p: Product) => p.status === 'low_stock').length || 0,
    outOfStock: products?.filter((p: Product) => p.status === 'out_of_stock').length || 0,
  }), [products]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">Не удалось загрузить продукты</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })}>
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Продукты</h1>
          <p className="text-muted-foreground">
            Управление каталогом продуктов
          </p>
        </div>
        <Link href="/dashboard/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Добавить продукт
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">В наличии</p>
                <p className="text-2xl font-bold text-green-600">{stats.inStock}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Мало</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Нет в наличии</p>
                <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
              </div>
              <Package className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или артикулу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {categories.map((cat) => (
            <Button
              key={cat.key}
              variant={selectedCategory === cat.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.key)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-0 divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : products?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Продукты не найдены</p>
            <p className="text-muted-foreground mb-4">
              Добавьте первый продукт в каталог
            </p>
            <Link href="/dashboard/products/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Добавить продукт
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Продукт
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Артикул
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Категория
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Цена
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Остаток
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products?.map((product: Product) => {
                    const status = statusConfig[product.status] || statusConfig.active;

                    return (
                      <tr key={product.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {product.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {product.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {formatPrice(product.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {product.stock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" aria-label="Действия">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link href={`/dashboard/products/${product.id}`}>
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Просмотр
                                </DropdownMenuItem>
                              </Link>
                              <Link href={`/dashboard/products/${product.id}/edit`}>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Редактировать
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setConfirmState({ title: 'Удалить продукт?', action: () => deleteMutation.mutate(product.id) });
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => { if (!open) setConfirmState(null); }}
        title={confirmState?.title ?? ''}
        onConfirm={() => confirmState?.action()}
      />
    </div>
  );
}
