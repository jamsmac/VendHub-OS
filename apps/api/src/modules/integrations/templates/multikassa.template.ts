import {
  PaymentIntegrationConfig,
  AuthType,
  HttpMethod,
  FieldType,
} from '../types/integration.types';

/**
 * MultiKassa (Virtual Kassa) Integration Template
 * Фискализация чеков в Узбекистане
 * Documentation: https://docs-virtual-kassa.multibank.uz/
 */
export const multikassaTemplate: PaymentIntegrationConfig = {
  name: 'multikassa',
  displayName: 'MultiKassa',
  description: 'Виртуальная касса для фискализации чеков в Узбекистане (ГНК)',
  website: 'https://multibank.uz',
  documentationUrl: 'https://docs-virtual-kassa.multibank.uz/',

  sandboxMode: true,
  baseUrl: 'http://localhost:8080/api/v1',
  sandboxBaseUrl: 'http://localhost:8080/api/v1',

  auth: {
    type: AuthType.BASIC,
    config: {
      usernameField: 'login',
      passwordField: 'password',
    },
  },

  credentials: [
    {
      name: 'login',
      displayName: 'Логин',
      type: 'text',
      required: true,
      description: 'Логин для доступа к API MultiKassa',
    },
    {
      name: 'password',
      displayName: 'Пароль',
      type: 'password',
      required: true,
      description: 'Пароль для доступа к API MultiKassa',
    },
    {
      name: 'company_tin',
      displayName: 'ИНН компании',
      type: 'text',
      required: true,
      description: 'Идентификационный номер налогоплательщика',
      placeholder: '123456789',
    },
    {
      name: 'default_cashier',
      displayName: 'Кассир по умолчанию',
      type: 'text',
      required: false,
      defaultValue: 'VendHub Online',
      description: 'Имя кассира в чеках',
    },
  ],

  supportedCurrencies: ['UZS'],
  supportedMethods: [],

  endpoints: {
    // Открытие смены
    createPayment: {
      id: 'shift_open',
      name: 'Open Shift',
      description: 'Открытие кассовой смены',
      method: HttpMethod.POST,
      path: '/shift/open',
      bodyParams: [
        {
          name: 'cashier_name',
          type: FieldType.STRING,
          required: true,
          description: 'Имя кассира',
        },
      ],
      responseMapping: {
        fields: [
          { source: 'shift_id', target: 'paymentId', type: FieldType.STRING },
          { source: 'shift_number', target: 'shiftNumber', type: FieldType.NUMBER },
          { source: 'opened_at', target: 'openedAt', type: FieldType.DATE },
        ],
      },
    },

    // Закрытие смены (Z-отчёт)
    checkStatus: {
      id: 'shift_status',
      name: 'Shift Status',
      description: 'Статус текущей смены',
      method: HttpMethod.GET,
      path: '/shift/status',
      responseMapping: {
        fields: [
          { source: 'shift_id', target: 'paymentId', type: FieldType.STRING },
          { source: 'status', target: 'status', type: FieldType.STRING },
          { source: 'receipts_count', target: 'receiptsCount', type: FieldType.NUMBER },
          { source: 'total_sales', target: 'totalSales', type: FieldType.NUMBER },
        ],
      },
    },

    // Закрытие смены
    cancelPayment: {
      id: 'shift_close',
      name: 'Close Shift',
      description: 'Закрытие смены и формирование Z-отчёта',
      method: HttpMethod.POST,
      path: '/shift/close',
      responseMapping: {
        fields: [
          { source: 'z_report_number', target: 'zReportNumber', type: FieldType.STRING },
          { source: 'z_report_url', target: 'zReportUrl', type: FieldType.STRING },
          { source: 'total_sales', target: 'totalSales', type: FieldType.NUMBER },
          { source: 'total_refunds', target: 'totalRefunds', type: FieldType.NUMBER },
        ],
      },
    },

    // X-отчёт (промежуточный)
    refund: {
      id: 'x_report',
      name: 'X-Report',
      description: 'Получение X-отчёта (промежуточного)',
      method: HttpMethod.GET,
      path: '/shift/x-report',
      responseMapping: {
        fields: [
          { source: 'total_sales', target: 'totalSales', type: FieldType.NUMBER },
          { source: 'total_refunds', target: 'totalRefunds', type: FieldType.NUMBER },
          { source: 'receipts_count', target: 'receiptsCount', type: FieldType.NUMBER },
        ],
      },
    },
  },
};

/**
 * MultiKassa Receipt Types
 */
export interface MultiKassaReceiptItem {
  name: string;
  ikpu_code: string;          // ИКПУ код товара
  package_code?: string;       // Код маркировки
  quantity: number;
  price: number;              // В тийинах
  vat_rate: number;           // 0, 12, 15
  unit: string;               // шт, кг, л
}

export interface MultiKassaReceipt {
  type: 'sale' | 'refund';
  items: MultiKassaReceiptItem[];
  payment: {
    cash: number;
    card: number;
  };
  total: number;
}

export interface MultiKassaReceiptResponse {
  success: boolean;
  receipt_id: string;
  fiscal_number: string;
  fiscal_sign: string;
  qr_code_url: string;
  receipt_url: string;
  timestamp: string;
}

export interface MultiKassaShift {
  shift_id: string;
  shift_number: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
  cashier_name: string;
  total_sales: number;
  total_refunds: number;
  total_cash: number;
  total_card: number;
  receipts_count: number;
}

export interface MultiKassaZReport {
  z_report_number: string;
  z_report_url: string;
  shift_number: number;
  opened_at: string;
  closed_at: string;
  total_sales: number;
  total_refunds: number;
  total_cash: number;
  total_card: number;
  receipts_count: number;
  vat_summary: {
    rate: number;
    amount: number;
  }[];
}

export default multikassaTemplate;
