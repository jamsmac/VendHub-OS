import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Coffee, Cookie, Droplets } from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice, cn } from '@/lib/utils';
import { useState } from 'react';

export function MenuPage() {
  const { machineId } = useParams();
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: t('menuCategoryAll'), icon: null },
    { id: 'coffee', label: t('coffee'), icon: Coffee },
    { id: 'drink', label: t('drinks'), icon: Droplets },
    { id: 'snack', label: t('snacks'), icon: Cookie },
  ];

  const { data: machine } = useQuery({
    queryKey: ['machine', machineId],
    queryFn: async () => {
      const res = await api.get(`/machines/${machineId}`);
      return res.data;
    },
    enabled: !!machineId,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', machineId],
    queryFn: async () => {
      // В реальном приложении - запрос продуктов для конкретного автомата
      const res = await api.get('/products');
      return res.data;
    },
  });

  const filteredProducts =
    activeCategory === 'all'
      ? products
      : products?.filter((p: any) => p.type === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              to={`/machine/${machineId}`}
              className="p-2 -ml-2 rounded-lg hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-semibold">{machine?.name || t('menu')}</h1>
              <p className="text-xs text-muted-foreground">
                {machine?.location?.address}
              </p>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-4 pb-3 overflow-x-auto no-scrollbar">
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  activeCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {cat.icon && <cat.icon className="w-4 h-4" />}
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-2xl bg-muted animate-pulse"
                />
              ))}
          </div>
        ) : filteredProducts?.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Coffee className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('noProductsAvailable')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: any }) {
  return (
    <div className="card-coffee overflow-hidden">
      {/* Image */}
      <div className="aspect-square bg-muted relative">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {product.type === 'coffee' && '☕'}
            {product.type === 'drink' && '🥤'}
            {product.type === 'snack' && '🍫'}
          </div>
        )}

        {/* Price Badge */}
        <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-lg text-sm font-bold">
          {formatPrice(product.sellPrice)}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {product.description}
          </p>
        )}
      </div>
    </div>
  );
}
