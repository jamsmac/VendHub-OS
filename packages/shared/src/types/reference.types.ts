/**
 * Reference Types for VendHub OS
 * Uzbekistan tax codes and reference data
 */

/**
 * MXIK - International Classification of Goods and Services
 * Used for product classification in Uzbekistan
 */
export interface IMxikCode {
  id: string;
  code: string;
  name: string;
  nameUz: string;
  nameEn?: string;
  parentCode?: string;
  level: number;
  isLeaf: boolean;
  vatRate?: number;
  exciseRate?: number;
  unit?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * IKPU - Unified Product Catalogue Code
 * Used for fiscal receipt generation in Uzbekistan
 */
export interface IIkpuCode {
  id: string;
  code: string;
  mxikCode: string;
  name: string;
  nameUz: string;
  nameEn?: string;
  unit: string;
  unitCode: string;
  vatRate: number;
  exciseRate?: number;
  packageCode?: string;
  barcode?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * TIN/INN - Taxpayer Identification Number
 * Used for business identification in Uzbekistan
 */
export interface ITinInfo {
  tin: string;
  name: string;
  nameEn?: string;
  address?: string;
  director?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive' | 'suspended';
  registrationDate?: Date;
  oked?: string; // Economic activity code
  soato?: string; // Administrative territorial division code
}

/**
 * Currency exchange rates
 */
export interface IExchangeRate {
  code: string;
  name: string;
  rate: number;
  date: Date;
  source: string;
}

/**
 * Units of measurement
 */
export interface IUnit {
  code: string;
  name: string;
  nameUz: string;
  nameEn: string;
  symbol: string;
}

// Common units used in vending
export const COMMON_UNITS: IUnit[] = [
  { code: '796', name: 'Штука', nameUz: 'Dona', nameEn: 'Piece', symbol: 'шт' },
  { code: '166', name: 'Килограмм', nameUz: 'Kilogramm', nameEn: 'Kilogram', symbol: 'кг' },
  { code: '112', name: 'Литр', nameUz: 'Litr', nameEn: 'Liter', symbol: 'л' },
  { code: '736', name: 'Упаковка', nameUz: "Qadoq", nameEn: 'Package', symbol: 'уп' },
  { code: '778', name: 'Бутылка', nameUz: 'Shisha', nameEn: 'Bottle', symbol: 'бут' },
  { code: '356', name: 'Грамм', nameUz: 'Gramm', nameEn: 'Gram', symbol: 'г' },
  { code: '111', name: 'Миллилитр', nameUz: 'Millilitr', nameEn: 'Milliliter', symbol: 'мл' },
];

// VAT rates in Uzbekistan
export const UZ_VAT_RATES = {
  STANDARD: 12, // Standard VAT rate
  ZERO: 0, // Zero-rated
  EXEMPT: 0, // VAT exempt
} as const;

// Common MXIK codes for vending products
export const COMMON_MXIK_CODES = {
  // Beverages
  COFFEE: '1074011',
  TEA: '1074012',
  SOFT_DRINKS: '1107011',
  JUICE: '1104011',
  WATER: '1101011',
  ENERGY_DRINKS: '1107099',

  // Snacks
  CHOCOLATE: '1073011',
  COOKIES: '1072011',
  CHIPS: '1071011',
  CANDY: '1073012',
  NUTS: '1081011',

  // Ice cream
  ICE_CREAM: '1052011',

  // Fresh food
  SANDWICHES: '1079011',
  SALADS: '1079012',
} as const;

// Package codes for fiscal receipts
export const PACKAGE_CODES = {
  PIECE: '1',
  BOTTLE: '2',
  CAN: '3',
  BOX: '4',
  BAG: '5',
  WRAPPER: '6',
} as const;

// Bank codes in Uzbekistan
export const UZ_BANKS = {
  CENTRAL_BANK: '00001',
  NATIONAL_BANK: '00014',
  IPAK_YULI: '00018',
  HAMKOR_BANK: '00083',
  KAPITAL_BANK: '01018',
  ORIENT_FINANS: '01134',
  ALOQA_BANK: '00062',
  ASIA_ALLIANCE: '00846',
  TRUSTBANK: '01145',
  DAVR_BANK: '01156',
} as const;

// Payment system codes
export const PAYMENT_SYSTEMS = {
  UZCARD: 'uzcard',
  HUMO: 'humo',
  VISA: 'visa',
  MASTERCARD: 'mastercard',
  UNIONPAY: 'unionpay',
} as const;

// Mobile payment providers
export const MOBILE_PAYMENT_PROVIDERS = {
  PAYME: {
    code: 'payme',
    name: 'Payme',
    merchantId: 'MERCHANT_ID',
  },
  CLICK: {
    code: 'click',
    name: 'Click',
    merchantId: 'MERCHANT_ID',
  },
  PAYNET: {
    code: 'paynet',
    name: 'Paynet',
    merchantId: 'MERCHANT_ID',
  },
  APELSIN: {
    code: 'apelsin',
    name: 'Apelsin',
    merchantId: 'MERCHANT_ID',
  },
} as const;

// Fiscal device types
export const FISCAL_DEVICE_TYPES = {
  ONLINE_KKM: 'online_kkm',
  VIRTUAL_KKM: 'virtual_kkm',
} as const;

// Receipt types for fiscal system
export const RECEIPT_TYPES = {
  SALE: 0,
  REFUND: 1,
  ADVANCE: 2,
  CREDIT: 3,
} as const;

// Document types for fiscal system
export const DOCUMENT_TYPES = {
  CHECK: 1,
  INVOICE: 2,
  ACT: 3,
  CONTRACT: 4,
} as const;
