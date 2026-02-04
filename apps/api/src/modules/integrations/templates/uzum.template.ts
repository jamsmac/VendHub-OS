import {
  PaymentIntegrationConfig,
  AuthType,
  HttpMethod,
  FieldType,
  PaymentMethod,
} from '../types/integration.types';

/**
 * Uzum (Apelsin) Integration Template
 * Documentation: https://developer.uzumbank.uz/
 */
export const uzumTemplate: PaymentIntegrationConfig = {
  name: 'uzum',
  displayName: 'Uzum Bank',
  description: 'Uzum Bank (бывший Apelsin) - платёжная система',
  website: 'https://uzumbank.uz',
  documentationUrl: 'https://developer.uzumbank.uz/',

  sandboxMode: true,
  baseUrl: 'https://api.uzumbank.uz/api/v1',
  sandboxBaseUrl: 'https://sandbox.uzumbank.uz/api/v1',

  auth: {
    type: AuthType.BEARER,
    config: {
      tokenEndpoint: '/auth/token',
      tokenField: 'access_token',
      refreshEndpoint: '/auth/refresh',
      expiresIn: 3600,
    },
  },

  credentials: [
    {
      name: 'merchant_id',
      displayName: 'Merchant ID',
      type: 'text',
      required: true,
      description: 'Идентификатор мерчанта',
      placeholder: 'your-merchant-id',
    },
    {
      name: 'terminal_id',
      displayName: 'Terminal ID',
      type: 'text',
      required: true,
      description: 'Идентификатор терминала',
    },
    {
      name: 'client_id',
      displayName: 'Client ID',
      type: 'text',
      required: true,
      description: 'OAuth Client ID',
    },
    {
      name: 'client_secret',
      displayName: 'Client Secret',
      type: 'password',
      required: true,
      description: 'OAuth Client Secret',
    },
    {
      name: 'api_key',
      displayName: 'API Key',
      type: 'password',
      required: false,
      description: 'Дополнительный API ключ (если требуется)',
    },
  ],

  supportedCurrencies: ['UZS'],
  supportedMethods: [PaymentMethod.CARD, PaymentMethod.WALLET, PaymentMethod.QR, PaymentMethod.INSTALLMENT],
  minAmount: 1000,
  maxAmount: 50000000000, // 500 млн сум

  endpoints: {
    createPayment: {
      id: 'create_payment',
      name: 'Create Payment',
      description: 'Создание платежа',
      method: HttpMethod.POST,
      path: '/payments',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      bodyParams: [
        {
          name: 'merchantId',
          type: FieldType.STRING,
          required: true,
          mapping: 'merchant_id',
        },
        {
          name: 'terminalId',
          type: FieldType.STRING,
          required: true,
          mapping: 'terminal_id',
        },
        {
          name: 'amount',
          type: FieldType.NUMBER,
          required: true,
          description: 'Сумма в тийинах',
          transform: { type: 'format', format: 'tiyn' },
        },
        {
          name: 'currency',
          type: FieldType.STRING,
          required: true,
          defaultValue: '860', // UZS code
        },
        {
          name: 'orderId',
          type: FieldType.STRING,
          required: true,
          mapping: 'order_id',
        },
        {
          name: 'description',
          type: FieldType.STRING,
          required: false,
        },
        {
          name: 'returnUrl',
          type: FieldType.STRING,
          required: true,
          mapping: 'return_url',
        },
        {
          name: 'callbackUrl',
          type: FieldType.STRING,
          required: false,
          mapping: 'callback_url',
        },
        {
          name: 'paymentMethod',
          type: FieldType.ENUM,
          required: false,
          enumValues: ['CARD', 'WALLET', 'QR', 'INSTALLMENT'],
        },
      ],
      responseMapping: {
        successPath: 'success',
        dataPath: 'data',
        errorPath: 'error',
        fields: [
          { source: 'data.paymentId', target: 'paymentId', type: FieldType.STRING },
          { source: 'data.status', target: 'status', type: FieldType.STRING },
          { source: 'data.redirectUrl', target: 'redirectUrl', type: FieldType.STRING },
          { source: 'data.qrCode', target: 'qrCode', type: FieldType.STRING },
        ],
      },
      errorMapping: [
        { code: 'INVALID_AMOUNT', message: 'Неверная сумма', internalCode: 'INVALID_AMOUNT', retry: false },
        { code: 'MERCHANT_NOT_FOUND', message: 'Мерчант не найден', internalCode: 'MERCHANT_NOT_FOUND', retry: false },
        { code: 'DUPLICATE_ORDER', message: 'Дублирующийся заказ', internalCode: 'DUPLICATE_ORDER', retry: false },
        { code: 'INSUFFICIENT_FUNDS', message: 'Недостаточно средств', internalCode: 'INSUFFICIENT_FUNDS', retry: false },
      ],
      timeout: 30000,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
        retryableErrors: ['NETWORK_ERROR', 'TIMEOUT'],
      },
    },

    checkStatus: {
      id: 'check_status',
      name: 'Check Payment Status',
      description: 'Проверка статуса платежа',
      method: HttpMethod.GET,
      path: '/payments/{paymentId}',
      pathParams: [
        { name: 'paymentId', type: FieldType.STRING, required: true, mapping: 'payment_id' },
      ],
      responseMapping: {
        fields: [
          { source: 'data.paymentId', target: 'paymentId', type: FieldType.STRING },
          { source: 'data.status', target: 'status', type: FieldType.STRING },
          { source: 'data.amount', target: 'amount', type: FieldType.NUMBER },
          { source: 'data.paidAt', target: 'paidAt', type: FieldType.DATE },
        ],
      },
    },

    cancelPayment: {
      id: 'cancel_payment',
      name: 'Cancel Payment',
      description: 'Отмена платежа',
      method: HttpMethod.POST,
      path: '/payments/{paymentId}/cancel',
      pathParams: [
        { name: 'paymentId', type: FieldType.STRING, required: true },
      ],
      bodyParams: [
        {
          name: 'reason',
          type: FieldType.STRING,
          required: false,
          description: 'Причина отмены',
        },
      ],
    },

    refund: {
      id: 'refund_payment',
      name: 'Refund Payment',
      description: 'Возврат платежа',
      method: HttpMethod.POST,
      path: '/payments/{paymentId}/refund',
      pathParams: [
        { name: 'paymentId', type: FieldType.STRING, required: true },
      ],
      bodyParams: [
        {
          name: 'amount',
          type: FieldType.NUMBER,
          required: false,
          description: 'Сумма возврата (для частичного возврата)',
        },
        {
          name: 'reason',
          type: FieldType.STRING,
          required: false,
          description: 'Причина возврата',
        },
      ],
    },
  },

  webhooks: {
    enabled: true,
    path: '/webhooks/uzum',
    method: HttpMethod.POST,
    verification: {
      type: 'signature',
      config: {
        headerName: 'X-Signature',
        algorithm: 'sha256',
        signatureFormat: 'base64',
      },
    },
    events: [
      {
        name: 'payment.created',
        description: 'Платёж создан',
        payloadMapping: [
          { source: 'paymentId', target: 'paymentId', type: FieldType.STRING },
          { source: 'orderId', target: 'orderId', type: FieldType.STRING },
          { source: 'amount', target: 'amount', type: FieldType.NUMBER },
          { source: 'status', target: 'status', type: FieldType.STRING },
        ],
        internalEvent: 'payment.created',
      },
      {
        name: 'payment.completed',
        description: 'Платёж успешно завершён',
        payloadMapping: [
          { source: 'paymentId', target: 'paymentId', type: FieldType.STRING },
          { source: 'orderId', target: 'orderId', type: FieldType.STRING },
          { source: 'amount', target: 'amount', type: FieldType.NUMBER },
          { source: 'paidAt', target: 'paidAt', type: FieldType.DATE },
        ],
        internalEvent: 'payment.completed',
      },
      {
        name: 'payment.failed',
        description: 'Платёж не прошёл',
        payloadMapping: [
          { source: 'paymentId', target: 'paymentId', type: FieldType.STRING },
          { source: 'orderId', target: 'orderId', type: FieldType.STRING },
          { source: 'errorCode', target: 'errorCode', type: FieldType.STRING },
          { source: 'errorMessage', target: 'errorMessage', type: FieldType.STRING },
        ],
        internalEvent: 'payment.failed',
      },
      {
        name: 'payment.cancelled',
        description: 'Платёж отменён',
        payloadMapping: [
          { source: 'paymentId', target: 'paymentId', type: FieldType.STRING },
          { source: 'orderId', target: 'orderId', type: FieldType.STRING },
          { source: 'cancelledAt', target: 'cancelledAt', type: FieldType.DATE },
        ],
        internalEvent: 'payment.cancelled',
      },
      {
        name: 'payment.refunded',
        description: 'Платёж возвращён',
        payloadMapping: [
          { source: 'paymentId', target: 'paymentId', type: FieldType.STRING },
          { source: 'orderId', target: 'orderId', type: FieldType.STRING },
          { source: 'refundAmount', target: 'amount', type: FieldType.NUMBER },
          { source: 'refundedAt', target: 'refundedAt', type: FieldType.DATE },
        ],
        internalEvent: 'payment.refunded',
      },
    ],
  },

  checkoutConfig: {
    type: 'redirect',
    redirectUrlField: 'redirectUrl',
  },
};

export default uzumTemplate;
