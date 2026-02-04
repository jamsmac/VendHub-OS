import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('VendHub API')
    .setDescription(`
# VendHub API Documentation

VendHub - платформа для управления вендинговыми автоматами.

## Основные возможности

- **Управление автоматами** - мониторинг, настройка, диагностика
- **Управление товарами** - каталог, категории, ценообразование
- **Заказы** - создание, отслеживание, оплата
- **Лояльность** - баллы, уровни, награды
- **Аналитика** - отчеты, дашборды, метрики

## Аутентификация

API использует JWT токены для аутентификации. Получите токен через endpoint \`/auth/login\`.

\`\`\`
Authorization: Bearer <your-token>
\`\`\`

## Rate Limiting

- 100 запросов в минуту для авторизованных пользователей
- 20 запросов в минуту для неавторизованных

## Версионирование

Текущая версия API: v1

## Ошибки

API возвращает стандартные HTTP коды ошибок:

| Код | Описание |
|-----|----------|
| 400 | Bad Request - некорректные данные |
| 401 | Unauthorized - требуется авторизация |
| 403 | Forbidden - нет доступа |
| 404 | Not Found - ресурс не найден |
| 429 | Too Many Requests - превышен лимит |
| 500 | Internal Server Error - ошибка сервера |

## Контакты

- Email: api@vendhub.uz
- Telegram: @vendhub_support
    `)
    .setVersion('1.0.0')
    .setContact('VendHub Team', 'https://vendhub.uz', 'api@vendhub.uz')
    .setLicense('Proprietary', 'https://vendhub.uz/license')
    .addServer('https://api.vendhub.uz', 'Production')
    .addServer('https://api-staging.vendhub.uz', 'Staging')
    .addServer('http://localhost:4000', 'Development')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key for machine-to-machine communication',
      },
      'ApiKey',
    )
    .addTag('Auth', 'Аутентификация и авторизация')
    .addTag('Users', 'Управление пользователями')
    .addTag('Machines', 'Управление вендинговыми автоматами')
    .addTag('Products', 'Каталог товаров')
    .addTag('Orders', 'Заказы и транзакции')
    .addTag('Payments', 'Платежи и интеграции')
    .addTag('Loyalty', 'Программа лояльности')
    .addTag('Quests', 'Задания и достижения')
    .addTag('Referrals', 'Реферальная программа')
    .addTag('Reports', 'Отчеты и аналитика')
    .addTag('Notifications', 'Уведомления')
    .addTag('Employees', 'Управление сотрудниками')
    .addTag('Maintenance', 'Обслуживание оборудования')
    .addTag('Settings', 'Настройки системы')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'VendHub API Documentation',
    customfavIcon: 'https://vendhub.uz/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { font-size: 2.5em; }
      .swagger-ui .info .description { font-size: 14px; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Export OpenAPI spec as JSON
  app.getHttpAdapter().get('/docs/json', (req, res) => {
    res.json(document);
  });

  // Export OpenAPI spec as YAML
  app.getHttpAdapter().get('/docs/yaml', (req, res) => {
    const yaml = require('js-yaml');
    res.type('text/yaml').send(yaml.dump(document));
  });
}
