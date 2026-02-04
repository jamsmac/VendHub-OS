import {
  PaymentIntegrationConfig,
  AuthType,
  HttpMethod,
  FieldType,
  PaymentMethod,
} from '../types/integration.types';

/**
 * Click Integration Template
 * Documentation: https://docs.click.uz/
 */
export const clickTemplate: PaymentIntegrationConfig = {
  name: 'click',
  displayName: 'Click',
  description: 'Click - платёжная система Узбекистана',
  website: 'https://click.uz',
  documentationUrl: 'https://docs.click.uz/',

  sandboxMode: true,
  baseUrl: 'https://api.click.uz/v2/merchant',
  sandboxBaseUrl: 'https://test.click.uz/v2/merchant',

  auth: {
    type: AuthType.HMAC,
    config: {
      algorithm: 'sha1',
      secretField: 'secret_key',
      signatureHeader: 'Auth',
      signatureFormat: 'hex',
      dataToSign: '{header.X-Auth}:{body.click_trans_id}:{body.service_id}:{body.merchant_trans_id}:{body.amount}:{body.action}:{body.sign_time}',
    },
  },

  credentials: [
    {
      name: 'merchant_id',
      displayName: 'Merchant ID',
      type: 'text',
      required: true,
      description: 'Идентификатор мерчанта в системе Click',
      placeholder: '12345',
      helpUrl: 'https://docs.click.uz/click-api-request/',
    },
    {
      name: 'service_id',
      displayName: 'Service ID',
      type: 'text',
      required: true,
      description: 'Идентификатор сервиса',
      placeholder: '12345',
    },
    {
      name: 'merchant_user_id',
      displayName: 'Merchant User ID',
      type: 'text',
      required: true,
      description: 'ID пользователя мерчанта для API',
    },
    {
      name: 'secret_key',
      displayName: 'Secret Key',
      type: 'password',
      required: true,
      description: 'Секретный ключ для подписи запросов',
    },
  ],

  supportedCurrencies: ['UZS'],
  supportedMethods: [PaymentMethod.CARD, PaymentMethod.WALLET],
  minAmount: 100,
  maxAmount: 1000000000,

  endpoints: {
    createPayment: {
      id: 'create_invoice',
      name: 'Create Invoice',
      description: 'Создание счёта на оплату',
      method: HttpMethod.POST,
      path: '/invoice/create',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      bodyParams: [
        {
          name: 'service_id',
          type: FieldType.NUMBER,
          required: true,
          mapping: 'service_id',
        },
        {
          name: 'amount',
          type: FieldType.NUMBER,
          required: true,
          transform: { type: 'format', format: 'cents' },
        },
        {
          name: 'phone_number',
          type: FieldType.STRING,
          required: false,
          description: 'Номер телефона клиента',
        },
        {
          name: 'merchant_trans_id',
          type: FieldType.STRING,
          required: true,
          mapping: 'order_id',
        },
      ],
      responseMapping: {
        successPath: 'error_code',
        dataPath: '',
        fields: [
          { source: 'invoice_id', target: 'paymentId', type: FieldType.NUMBER },
          { source: 'payment_url', target: 'redirectUrl', type: FieldType.STRING },
        ],
      },
      errorMapping: [
        { code: -1, message: 'Ошибка подписи', internalCode: 'SIGNATURE_ERROR', retry: false },
        { code: -2, message: 'Неверная сумма', internalCode: 'INVALID_AMOUNT', retry: false },
        { code: -5, message: 'Не найден', internalCode: 'NOT_FOUND', retry: false },
        { code: -9, message: 'Транзакция отменена', internalCode: 'CANCELLED', retry: false },
      ],
    },

    checkStatus: {
      id: 'check_invoice',
      name: 'Check Invoice Status',
      description: 'Проверка статуса счёта',
      method: HttpMethod.GET,
      path: '/invoice/status/{service_id}/{invoice_id}',
      pathParams: [
        { name: 'service_id', type: FieldType.NUMBER, required: true },
        { name: 'invoice_id', type: FieldType.NUMBER, required: true, mapping: 'payment_id' },
      ],
      responseMapping: {
        fields: [
          { source: 'invoice_id', target: 'paymentId', type: FieldType.NUMBER },
          { source: 'invoice_status', target: 'status', type: FieldType.NUMBER },
          { source: 'invoice_status_note', target: 'statusMessage', type: FieldType.STRING },
        ],
      },
    },

    cancelPayment: {
      id: 'cancel_invoice',
      name: 'Cancel Invoice',
      description: 'Отмена счёта',
      method: HttpMethod.DELETE,
      path: '/invoice/cancel/{service_id}/{invoice_id}',
      pathParams: [
        { name: 'service_id', type: FieldType.NUMBER, required: true },
        { name: 'invoice_id', type: FieldType.NUMBER, required: true },
      ],
    },

    refund: {
      id: 'refund_payment',
      name: 'Refund Payment',
      description: 'Возврат платежа',
      method: HttpMethod.POST,
      path: '/payment/reversal/{service_id}/{payment_id}',
      pathParams: [
        { name: 'service_id', type: FieldType.NUMBER, required: true },
        { name: 'payment_id', type: FieldType.NUMBER, required: true },
      ],
    },
  },

  webhooks: {
    enabled: true,
    path: '/webhooks/click',
    method: HttpMethod.POST,
    verification: {
      type: 'signature',
      config: {
        algorithm: 'md5',
        fields: ['click_trans_id', 'service_id', 'merchant_trans_id', 'amount', 'action', 'sign_time'],
        secretField: 'secret_key',
      },
    },
    events: [
      {
        name: 'prepare',
        description: 'Подготовка к оплате (action=0)',
        payloadMapping: [
          { source: 'click_trans_id', target: 'transactionId', type: FieldType.STRING },
          { source: 'merchant_trans_id', target: 'orderId', type: FieldType.STRING },
          { source: 'amount', target: 'amount', type: FieldType.NUMBER },
        ],
        internalEvent: 'payment.prepare',
      },
      {
        name: 'complete',
        description: 'Завершение оплаты (action=1)',
        payloadMapping: [
          { source: 'click_trans_id', target: 'transactionId', type: FieldType.STRING },
          { source: 'merchant_trans_id', target: 'orderId', type: FieldType.STRING },
          { source: 'amount', target: 'amount', type: FieldType.NUMBER },
          { source: 'merchant_prepare_id', target: 'prepareId', type: FieldType.STRING },
        ],
        internalEvent: 'payment.completed',
      },
    ],
  },

  checkoutConfig: {
    type: 'redirect',
    redirectUrlField: 'payment_url',
  },
};

export default clickTemplate;
