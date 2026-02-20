/**
 * Favorites Page
 * User's favorite machines and products
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Heart,
  MapPin,
  Coffee,
  Navigation,
  Trash2,
  Star,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { calculateDistance, formatDistance } from '@/lib/utils';
import { useGeolocation } from '@/hooks/useGeolocation';

interface FavoriteMachine {
  id: string;
  machineId: string;
  machine: {
    id: string;
    serialNumber: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    status: 'online' | 'offline' | 'maintenance';
    imageUrl?: string;
  };
  createdAt: string;
}

interface FavoriteProduct {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    category: string;
  };
  createdAt: string;
}

export function FavoritesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { position } = useGeolocation();
  const [activeTab, setActiveTab] = useState<'machines' | 'products'>('machines');

  // Fetch favorite machines
  const { data: machines, isLoading: machinesLoading } = useQuery<FavoriteMachine[]>({
    queryKey: ['favorites', 'machines'],
    queryFn: async () => {
      const res = await api.get('/favorites/machines');
      return res.data;
    },
  });

  // Fetch favorite products
  const { data: products, isLoading: productsLoading } = useQuery<FavoriteProduct[]>({
    queryKey: ['favorites', 'products'],
    queryFn: async () => {
      const res = await api.get('/favorites/products');
      return res.data;
    },
    enabled: activeTab === 'products',
  });

  // Remove from favorites mutation
  const removeMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'machine' | 'product'; id: string }) => {
      await api.delete(`/favorites/${type}s/${id}`);
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['favorites', `${type}s`] });
      toast.success(t('removedFromFavorites'));
    },
    onError: () => {
      toast.error(t('failedToRemove'));
    },
  });

  // Add distance to machines
  const machinesWithDistance = machines?.map((fav) => ({
    ...fav,
    distance: position
      ? calculateDistance(
          position.latitude,
          position.longitude,
          fav.machine.latitude,
          fav.machine.longitude
        )
      : null,
  })).sort((a, b) => (a.distance || 999) - (b.distance || 999));

  const isLoading = activeTab === 'machines' ? machinesLoading : productsLoading;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">{t('favorites')}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl">
        <button
          onClick={() => setActiveTab('machines')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'machines'
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('favoriteMachines', { count: machines?.length || 0 })}
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'products'
              ? 'bg-background shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('favoriteProducts', { count: products?.length || 0 })}
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Machines Tab */}
      {activeTab === 'machines' && !isLoading && (
        <div className="space-y-3">
          {machinesWithDistance?.map((fav) => {
            const statusColors = {
              online: 'bg-green-500',
              offline: 'bg-red-500',
              maintenance: 'bg-yellow-500',
            };

            return (
              <div key={fav.id} className="card-coffee overflow-hidden">
                <Link
                  to={`/machine/${fav.machine.id}`}
                  className="flex gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  {/* Machine Image */}
                  <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {fav.machine.imageUrl ? (
                      <img
                        src={fav.machine.imageUrl}
                        alt={fav.machine.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Coffee className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Machine Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold line-clamp-1">{fav.machine.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3" />
                          <span className="line-clamp-1">{fav.machine.address}</span>
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${statusColors[fav.machine.status]}`} />
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {fav.distance !== null && (
                        <div className="flex items-center gap-1 text-sm text-primary">
                          <Navigation className="w-3 h-3" />
                          <span>{formatDistance(fav.distance)}</span>
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>

                {/* Remove Button */}
                <div className="px-4 pb-3">
                  <button
                    onClick={() => removeMutation.mutate({ type: 'machine', id: fav.id })}
                    disabled={removeMutation.isPending}
                    className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('removeFromFavorites')}
                  </button>
                </div>
              </div>
            );
          })}

          {!machinesWithDistance?.length && (
            <div className="text-center py-12 text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">{t('noFavoriteMachines')}</p>
              <p className="text-sm mt-1">{t('tapHeartToAdd')}</p>
              <Link
                to="/map"
                className="inline-flex items-center gap-2 mt-4 text-primary font-medium"
              >
                <MapPin className="w-4 h-4" />
                {t('findMachines')}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && !isLoading && (
        <div className="space-y-3">
          {products?.map((fav) => (
            <div key={fav.id} className="card-coffee p-4">
              <div className="flex gap-4">
                {/* Product Image */}
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {fav.product.imageUrl ? (
                    <img
                      src={fav.product.imageUrl}
                      alt={fav.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Coffee className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{fav.product.name}</h3>
                  <p className="text-sm text-muted-foreground">{fav.product.category}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="font-semibold text-primary">
                      {fav.product.price.toLocaleString()} UZS
                    </p>
                    <button
                      onClick={() => removeMutation.mutate({ type: 'product', id: fav.id })}
                      disabled={removeMutation.isPending}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {!products?.length && (
            <div className="text-center py-12 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">{t('noFavoriteProducts')}</p>
              <p className="text-sm mt-1">{t('addFavoriteProductsHint')}</p>
            </div>
          )}
        </div>
      )}

      {/* Tip */}
      <div className="card-coffee p-4 bg-primary/5 border border-primary/10">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{t('quickOrder')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('quickOrderHint')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
