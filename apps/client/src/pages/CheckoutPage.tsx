/**
 * Checkout Page
 * Payment method selection and order confirmation
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  Wallet,
  Star,
  CheckCircle2,
  Loader2,
  MapPin,
  Coffee,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCartStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';

type PaymentMethod = 'payme' | 'click' | 'uzum' | 'telegram_stars' | 'cash';

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: typeof CreditCard;
  color: string;
  available: boolean;
}

const paymentOptions: PaymentOption[] = [
  {
    id: 'payme',
    name: 'Payme',
    description: 'paymentCardUzcard',
    icon: CreditCard,
    color: 'bg-[#00CCCC]/10 text-[#00CCCC]',
    available: true,
  },
  {
    id: 'click',
    name: 'Click',
    description: 'paymentViaClick',
    icon: Smartphone,
    color: 'bg-[#00B5E2]/10 text-[#00B5E2]',
    available: true,
  },
  {
    id: 'uzum',
    name: 'Uzum Bank',
    description: 'paymentViaUzum',
    icon: Wallet,
    color: 'bg-[#7B2BFF]/10 text-[#7B2BFF]',
    available: true,
  },
  {
    id: 'telegram_stars',
    name: 'Telegram Stars',
    description: 'paymentTelegramStars',
    icon: Star,
    color: 'bg-amber-500/10 text-amber-500',
    available: true,
  },
];

export function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('payme');
  const [showDetails, setShowDetails] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const { items, machine, getSubtotal, getTotalItems, clearCart } = useCartStore();

  const subtotal = getSubtotal();
  const serviceFee = 0; // Free for now
  const total = subtotal + serviceFee;

  // Calculate stars equivalent (1 star ≈ 1000 UZS)
  const starsAmount = Math.ceil(total / 1000);

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/orders', {
        machineId: machine?.id,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        paymentMethod: selectedPayment,
        totalAmount: total,
      });
      return res.data;
    },
    onSuccess: (data) => {
      clearCart();

      if (selectedPayment === 'telegram_stars') {
        // Redirect to Telegram payment
        window.location.href = data.telegramPaymentUrl;
      } else if (data.paymentUrl) {
        // Redirect to payment provider
        window.location.href = data.paymentUrl;
      } else {
        // Order created, go to success page
        navigate(`/order/${data.id}/success`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('orderFailed'));
    },
  });

  const handleCheckout = () => {
    if (!agreeToTerms) {
      toast.error(t('acceptTerms'));
      return;
    }

    if (!machine) {
      toast.error(t('machineNotSelected'));
      return;
    }

    createOrderMutation.mutate();
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-32 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/cart"
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">{t('checkoutTitle')}</h1>
      </div>

      {/* Machine Info */}
      {machine && (
        <div className="card-coffee p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Coffee className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium line-clamp-1">{machine.name}</p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="line-clamp-1">{machine.address}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className="card-coffee overflow-hidden">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="font-semibold">{t('yourOrder')}</span>
            <span className="text-sm text-muted-foreground">
              {t('itemsCountSimple', { count: getTotalItems() })}
            </span>
          </div>
          {showDetails ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        {showDetails && (
          <div className="px-4 pb-4 space-y-3 border-t">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 pt-3">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Coffee className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × {formatNumber(item.price)} UZS
                  </p>
                </div>
                <p className="text-sm font-semibold">
                  {formatNumber(item.price * item.quantity)} UZS
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <div className="space-y-3">
        <h2 className="font-semibold">{t('paymentMethod')}</h2>

        <div className="space-y-2">
          {paymentOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedPayment === option.id;

            return (
              <button
                key={option.id}
                onClick={() => setSelectedPayment(option.id)}
                disabled={!option.available}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-muted/50 hover:bg-muted'
                } ${!option.available ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${option.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">{option.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t(option.description)}
                    </p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedPayment === 'telegram_stars' && (
          <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-amber-500" />
              <div>
                <p className="font-medium text-amber-600">
                  {t('starsPayment', { count: starsAmount })}
                </p>
                <p className="text-xs text-amber-600/80">
                  {t('starsWillBeCharged')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Total */}
      <div className="card-coffee p-4 space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('orderAmount')}</span>
            <span>{formatNumber(subtotal)} UZS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('serviceFee')}</span>
            <span className="text-green-500">{t('free')}</span>
          </div>
          <div className="pt-3 border-t">
            <div className="flex justify-between text-lg font-semibold">
              <span>{t('total')}</span>
              <span className="text-primary">{formatNumber(total)} UZS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terms Agreement */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreeToTerms}
          onChange={(e) => setAgreeToTerms(e.target.checked)}
          className="mt-1 w-5 h-5 rounded border-2 border-muted-foreground/30 checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <span className="text-sm text-muted-foreground">
          {t('agreeToTerms')}{' '}
          <Link to="/terms" className="text-primary hover:underline">
            {t('termsOfService')}
          </Link>{' '}
          {t('and')}{' '}
          <Link to="/privacy" className="text-primary hover:underline">
            {t('privacyPolicy')}
          </Link>
        </span>
      </label>

      {/* Security Notice */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
        <Shield className="w-5 h-5 text-green-500" />
        <p className="text-xs text-muted-foreground">
          {t('paymentSecure')}
        </p>
      </div>

      {/* Checkout Button - Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t safe-area-inset-bottom">
        <button
          onClick={handleCheckout}
          disabled={createOrderMutation.isPending || !agreeToTerms}
          className="w-full py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {createOrderMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('processing')}
            </>
          ) : (
            <>
              {t('pay')}
              <span className="bg-white/20 px-3 py-1 rounded-lg text-sm">
                {selectedPayment === 'telegram_stars'
                  ? `${starsAmount} ⭐`
                  : `${formatNumber(total)} UZS`}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
