/**
 * Cart Page
 * Shopping cart with selected products
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  Coffee,
  MapPin,
  Tag,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';

export function CartPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  const {
    items,
    machine,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
    getTotalItems,
  } = useCartStore();

  const subtotal = getSubtotal();
  const discount = promoDiscount;
  const total = subtotal - discount;

  const handleApplyPromo = () => {
    if (!promoCode.trim()) {
      toast.error(t('enterPromoCode'));
      return;
    }

    // Mock promo validation
    if (promoCode.toUpperCase() === 'COFFEE10') {
      setPromoApplied(true);
      setPromoDiscount(Math.round(subtotal * 0.1));
      toast.success(t('promoApplied'));
    } else {
      toast.error(t('promoInvalid'));
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error(t('cartEmpty'));
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
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
          <h1 className="text-xl font-bold">{t('cart')}</h1>
        </div>

        {/* Empty State */}
        <div className="text-center py-16">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold mb-2">{t('cartEmpty')}</h2>
          <p className="text-muted-foreground mb-6">
            {t('addItemsFromMenu')}
          </p>
          <Link
            to="/map"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            {t('findMachine')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-32 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">{t('cart')}</h1>
        </div>
        <button
          onClick={() => {
            clearCart();
            toast.success(t('cartCleared'));
          }}
          className="text-sm text-red-500 hover:text-red-600"
        >
          {t('clear')}
        </button>
      </div>

      {/* Machine Info */}
      {machine && (
        <Link
          to={`/machine/${machine.id}`}
          className="card-coffee p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Coffee className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium line-clamp-1">{machine.name}</p>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {machine.address}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>
      )}

      {/* Cart Items */}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="card-coffee p-4">
            <div className="flex gap-4">
              {/* Product Image */}
              <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Coffee className="w-8 h-8 text-muted-foreground" />
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold line-clamp-2">{item.name}</h3>
                  <button
                    onClick={() => {
                      removeItem(item.id);
                      toast.success(t('itemRemoved'));
                    }}
                    className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-muted-foreground">{item.category}</p>

                <div className="flex items-center justify-between mt-3">
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 disabled:opacity-50 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= 10}
                      className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 disabled:opacity-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Price */}
                  <p className="font-semibold text-primary">
                    {formatNumber(item.price * item.quantity)} UZS
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Promo Code */}
      <div className="card-coffee p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder={t('promoCode')}
              disabled={promoApplied}
              className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleApplyPromo}
            disabled={promoApplied}
            className={`px-6 py-3 rounded-xl font-medium transition-colors ${
              promoApplied
                ? 'bg-green-500/10 text-green-500'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            {promoApplied ? '✓' : t('apply')}
          </button>
        </div>
        {promoApplied && (
          <p className="text-sm text-green-500 mt-2">
            {t('promoCodeApplied')}
          </p>
        )}
      </div>

      {/* Order Summary */}
      <div className="card-coffee p-4 space-y-3">
        <h3 className="font-semibold">{t('total')}</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t('itemsCount', { count: getTotalItems() })}
            </span>
            <span>{formatNumber(subtotal)} UZS</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-green-500">
              <span>{t('promoDiscount')}</span>
              <span>-{formatNumber(discount)} UZS</span>
            </div>
          )}

          <div className="pt-2 border-t">
            <div className="flex justify-between text-lg font-semibold">
              <span>{t('toPay')}</span>
              <span className="text-primary">{formatNumber(total)} UZS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Warning */}
      {items.some((item) => item.stock && item.stock < 3) && (
        <div className="flex gap-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-600">
              {t('limitedStock')}
            </p>
            <p className="text-xs text-amber-600/80">
              {t('limitedStockDescription')}
            </p>
          </div>
        </div>
      )}

      {/* Checkout Button - Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t safe-area-inset-bottom">
        <button
          onClick={handleCheckout}
          className="w-full py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          {t('checkout')}
          <span className="bg-white/20 px-3 py-1 rounded-lg text-sm">
            {formatNumber(total)} UZS
          </span>
        </button>
      </div>
    </div>
  );
}
