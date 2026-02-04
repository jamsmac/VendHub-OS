/**
 * Telegram Payments Constants
 * VendHub Telegram Bot Payments Integration
 */

export enum TelegramPaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum TelegramPaymentProvider {
  PAYME = 'payme',
  CLICK = 'click',
  UZUM = 'uzum',
  STRIPE = 'stripe',
}

export enum TelegramPaymentCurrency {
  UZS = 'UZS',
  USD = 'USD',
  RUB = 'RUB',
}

export const TELEGRAM_PAYMENT_PROVIDERS_CONFIG: Record<TelegramPaymentProvider, {
  name: string;
  token: string;
  currencies: TelegramPaymentCurrency[];
  minAmount: Record<TelegramPaymentCurrency, number>;
  maxAmount: Record<TelegramPaymentCurrency, number>;
}> = {
  [TelegramPaymentProvider.PAYME]: {
    name: 'Payme',
    token: process.env.TELEGRAM_PAYMENT_PAYME_TOKEN || '',
    currencies: [TelegramPaymentCurrency.UZS],
    minAmount: { [TelegramPaymentCurrency.UZS]: 100000, [TelegramPaymentCurrency.USD]: 0, [TelegramPaymentCurrency.RUB]: 0 },
    maxAmount: { [TelegramPaymentCurrency.UZS]: 100000000, [TelegramPaymentCurrency.USD]: 0, [TelegramPaymentCurrency.RUB]: 0 },
  },
  [TelegramPaymentProvider.CLICK]: {
    name: 'Click',
    token: process.env.TELEGRAM_PAYMENT_CLICK_TOKEN || '',
    currencies: [TelegramPaymentCurrency.UZS],
    minAmount: { [TelegramPaymentCurrency.UZS]: 100000, [TelegramPaymentCurrency.USD]: 0, [TelegramPaymentCurrency.RUB]: 0 },
    maxAmount: { [TelegramPaymentCurrency.UZS]: 100000000, [TelegramPaymentCurrency.USD]: 0, [TelegramPaymentCurrency.RUB]: 0 },
  },
  [TelegramPaymentProvider.UZUM]: {
    name: 'Uzum Bank',
    token: process.env.TELEGRAM_PAYMENT_UZUM_TOKEN || '',
    currencies: [TelegramPaymentCurrency.UZS],
    minAmount: { [TelegramPaymentCurrency.UZS]: 100000, [TelegramPaymentCurrency.USD]: 0, [TelegramPaymentCurrency.RUB]: 0 },
    maxAmount: { [TelegramPaymentCurrency.UZS]: 50000000, [TelegramPaymentCurrency.USD]: 0, [TelegramPaymentCurrency.RUB]: 0 },
  },
  [TelegramPaymentProvider.STRIPE]: {
    name: 'Stripe',
    token: process.env.TELEGRAM_PAYMENT_STRIPE_TOKEN || '',
    currencies: [TelegramPaymentCurrency.USD, TelegramPaymentCurrency.RUB],
    minAmount: { [TelegramPaymentCurrency.UZS]: 0, [TelegramPaymentCurrency.USD]: 100, [TelegramPaymentCurrency.RUB]: 10000 },
    maxAmount: { [TelegramPaymentCurrency.UZS]: 0, [TelegramPaymentCurrency.USD]: 100000, [TelegramPaymentCurrency.RUB]: 10000000 },
  },
};

export const TELEGRAM_PAYMENT_ERRORS = {
  INVALID_PROVIDER: 'Invalid payment provider',
  INVALID_CURRENCY: 'Currency not supported by provider',
  AMOUNT_TOO_LOW: 'Amount is below minimum',
  AMOUNT_TOO_HIGH: 'Amount exceeds maximum',
  PAYMENT_NOT_FOUND: 'Payment not found',
  PAYMENT_ALREADY_PROCESSED: 'Payment already processed',
  REFUND_NOT_ALLOWED: 'Refund not allowed for this payment',
  WEBHOOK_INVALID_SIGNATURE: 'Invalid webhook signature',
};
