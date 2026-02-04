import {
  PaymentIntegrationConfig,
  AuthType,
  HttpMethod,
  FieldType,
  PaymentMethod,
} from '../types/integration.types';

/**
 * Payme Integration Template
 * Documentation: https://developer.help.paycom.uz/
 */
export const paymeTemplate: PaymentIntegrationConfig = {
  name: 'payme',
  displayName: 'Payme',
  description: 'Payme - популярная платёжная система Узбекистана',
  website: 'https://payme.uz',
  documentationUrl: 'https://developer.help.paycom.uz/',

  sandboxMode: true,
  baseUrl: 'https://checkout.paycom.uz/api',
  sandboxBaseUrl: 'https://checkout.test.paycom.uz/api',

  auth: {
    type: AuthType.BASIC,
    config: {
      usernameField: 'merchant_id',
      passwordField: 'secret_key',
    },
  },

  credentials: [
    {
      name: 'merchant_id',
      displayName: 'Merchant ID',
      type: 'text',
      required: true,
      description: 'Идентификатор мерчанта в системе Payme',
      placeholder: '5e730e8e0b852a417aa49ceb',
      helpUrl: 'https://developer.help.paycom.uz/initsializatsiya-platezhey/poluchenie-merchant-id',
    },
    {
      name: 'secret_key',
      displayName: 'Secret Key',
      type: 'password',
      required: true,
      description: 'Секретный ключ для авторизации запросов',
      helpUrl: 'https://developer.help.paycom.uz/protokol-merchant-api/avtorizatsiya',
    },
    {
      name: 'checkout_id',
      displayName: 'Checkout ID (для Checkout API)',
      type: 'text',
      required: false,
      description: 'ID для Checkout API (если используется)',
    },
  ],

  supportedCurrencies: ['UZS'],
  supportedMethods: [PaymentMethod.CARD, PaymentMethod.WALLET],
  minAmount: 100, // 1 сум (в тийинах)
  maxAmount: 1000000000, // 10 млн сум

  endpoints: {
    createPayment: {
      id: 'cards.create',
      name: 'Create Payment',
      description: 'Создание платежа через Merchant API',
      method: HttpMethod.POST,
      path: '',
      headers: {
        'Content-Type': 'application/json',
      },
      bodyParams: [
        {
          name: 'method',
          type: FieldType.STRING,
          required: true,
          defaultValue: 'cards.create',
        },
        {
          name: 'params',
          type: FieldType.OBJECT,
          required: true,
        },
      ],
      responseMapping: {
        successPath: 'result',
        errorPath: 'error',
        fields: [
          { source: 'result.card.token', target: 'paymentId', type: FieldType.STRING },
          { source: 'result.card.number', target: 'cardNumber', type: FieldType.STRING },
        ],
      },
      errorMapping: [
        { code: -32504, message: 'Недостаточно средств', internalCode: 'INSUFFICIENT_FUNDS', retry: false },
        { code: -32600, message: 'Неверный формат запроса', internalCode: 'INVALID_REQUEST', retry: false },
        { code: -32504, message: 'Карта не найдена', internalCode: 'CARD_NOT_FOUND', retry: false },
      ],
    },

    checkStatus: {
      id: 'receipts.check',
      name: 'Check Payment Status',
      description: 'Проверка статуса платежа',
      method: HttpMethod.POST,
      path: '',
      bodyParams: [
        {
          name: 'method',
          type: FieldType.STRING,
          required: true,
          defaultValue: 'receipts.check',
        },
        {
          name: 'params',
          type: FieldType.OBJECT,
          required: true,
        },
      ],
      responseMapping: {
        fields: [
          { source: 'result.receipt._id', target: 'paymentId', type: FieldType.STRING },
          { source: 'result.receipt.state', target: 'status', type: FieldType.NUMBER },
          { source: 'result.receipt.amount', target: 'amount', type: FieldType.NUMBER },
        ],
      },
    },

    cancelPayment: {
      id: 'receipts.cancel',
      name: 'Cancel Payment',
      description: 'Отмена платежа',
      method: HttpMethod.POST,
      path: '',
      bodyParams: [
        {
          name: 'method',
          type: FieldType.STRING,
          required: true,
          defaultValue: 'receipts.cancel',
        },
        {
          name: 'params',
          type: FieldType.OBJECT,
          required: true,
        },
      ],
    },

    refund: {
      id: 'receipts.cancel',
      name: 'Refund Payment',
      description: 'Возврат платежа (частичный или полный)',
      method: HttpMethod.POST,
      path: '',
      bodyParams: [
        {
          name: 'method',
          type: FieldType.STRING,
          required: true,
          defaultValue: 'receipts.cancel',
        },
        {
          name: 'params',
          type: FieldType.OBJECT,
          required: true,
        },
      ],
    },
  },

  webhooks: {
    enabled: true,
    path: '/webhooks/payme',
    method: HttpMethod.POST,
    verification: {
      type: 'signature',
      config: {
        headerName: 'Authorization',
        algorithm: 'basic',
      },
    },
    events: [
      {
        name: 'CheckPerformTransaction',
        description: 'Проверка возможности выполнения транзакции',
        payloadMapping: [
          { source: 'params.account.order_id', target: 'orderId', type: FieldType.STRING },
          { source: 'params.amount', target: 'amount', type: FieldType.NUMBER },
        ],
        internalEvent: 'payment.check',
      },
      {
        name: 'CreateTransaction',
        description: 'Создание транзакции',
        payloadMapping: [
          { source: 'params.id', target: 'transactionId', type: FieldType.STRING },
          { source: 'params.account.order_id', target: 'orderId', type: FieldType.STRING },
          { source: 'params.amount', target: 'amount', type: FieldType.NUMBER },
        ],
        internalEvent: 'payment.created',
      },
      {
        name: 'PerformTransaction',
        description: 'Выполнение транзакции (оплата)',
        payloadMapping: [
          { source: 'params.id', target: 'transactionId', type: FieldType.STRING },
        ],
        internalEvent: 'payment.completed',
      },
      {
        name: 'CancelTransaction',
        description: 'Отмена транзакции',
        payloadMapping: [
          { source: 'params.id', target: 'transactionId', type: FieldType.STRING },
          { source: 'params.reason', target: 'reason', type: FieldType.NUMBER },
        ],
        internalEvent: 'payment.cancelled',
      },
    ],
  },

  checkoutConfig: {
    type: 'redirect',
    redirectUrlField: 'checkout_url',
  },
};

export default paymeTemplate;
