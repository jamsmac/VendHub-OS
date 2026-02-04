# 🚀 МАСТЕР-ПРОМПТ: СОЗДАНИЕ VENDHUB UNIFIED PLATFORM

> **Версия:** 1.0
> **Дата:** 14 января 2026
> **Цель:** Создание единой платформы VendHub с Web, Mobile (iOS/Android), Telegram версиями для всех типов пользователей

---

## 📋 ИНСТРУКЦИЯ ДЛЯ AI

Ты — senior full-stack архитектор с 15+ годами опыта в разработке enterprise SaaS платформ. Твоя задача — создать **детальный план разработки VendHub Unified Platform** на основе существующих проектов в папке `/VHM24`.

### Исходные данные

**Базовый проект:** `VHM24-repo` (220+ API endpoints, 22 модуля, 28 database entities)

**Проекты для интеграции:**
- `VHM` — Multi-tenant архитектура, 2FA, Turborepo структура
- `vhm24v2 (1)` — Telegram WebApp, геймификация, лояльность, дизайн "Warm Brew"
- `vendhub-bot2` — Telegram Bot на aiogram 3.4
- `VHM24R_2` — Data Reconciliation алгоритм
- `vendify-menu-maps-main 2` — Google Maps интеграция
- `VH24` — tRPC, Drizzle ORM

**Полный анализ проектов:** см. файл `FULL_PROJECT_ANALYSIS.md`

---

## 🎯 ТРЕБОВАНИЯ К ПЛАТФОРМЕ

### Целевые аудитории и приложения

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VENDHUB UNIFIED PLATFORM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ДЛЯ КЛИЕНТОВ (B2C)                               │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  👤 ПОКУПАТЕЛИ              💰 ИНВЕСТОРЫ           🏪 ФРАНЧАЙЗИ     │   │
│  │  ─────────────              ───────────            ───────────      │   │
│  │  • Каталог товаров          • Dashboard доходов   • Управление      │   │
│  │  • Карта автоматов          • Аналитика ROI         точками        │   │
│  │  • Заказы и оплата          • Отчёты              • Финансы        │   │
│  │  • Программа лояльности     • Документы           • Сотрудники     │   │
│  │  • Достижения и квесты      • Дивиденды           • Инвентарь      │   │
│  │  • История покупок          • Портфель машин      • Отчёты         │   │
│  │  • Жалобы и отзывы          • Уведомления         • KPI            │   │
│  │                                                                      │   │
│  │  Приложения:                Приложения:           Приложения:       │   │
│  │  📱 Mobile App              🌐 Web Portal         🌐 Web Portal     │   │
│  │  📲 Telegram WebApp         📱 Mobile App         📱 Mobile App     │   │
│  │  🌐 PWA                     📲 Telegram Bot       📲 Telegram Bot   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ДЛЯ СОТРУДНИКОВ (B2B)                            │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  👑 ВЛАДЕЛЕЦ/CEO     👔 ADMIN        📊 MANAGER      💼 ACCOUNTANT  │   │
│  │  ─────────────       ─────────       ─────────       ─────────      │   │
│  │  • Всё + стратегия   • Пользователи  • Операции      • Платежи      │   │
│  │  • Multi-tenant      • Роли/права    • Задачи        • Счета        │   │
│  │  • Франчайзинг       • Настройки     • Отчёты        • Сверка       │   │
│  │  • Инвесторы         • Интеграции    • Инциденты     • Документы    │   │
│  │                                                                      │   │
│  │  📦 WAREHOUSE        👷 OPERATOR      🔧 TECHNICIAN   👀 VIEWER     │   │
│  │  ─────────────       ─────────       ─────────       ─────────      │   │
│  │  • Склад             • Маршруты      • Ремонт        • Только       │   │
│  │  • Приёмка           • Пополнение    • Обслуживание    просмотр     │   │
│  │  • Выдача            • Инкассация    • Запчасти      • Отчёты       │   │
│  │  • Инвентаризация    • Фото-отчёты   • Инциденты     • Dashboard    │   │
│  │                                                                      │   │
│  │  Приложения для всех сотрудников:                                   │   │
│  │  🌐 Web Admin Dashboard (full features)                             │   │
│  │  📱 Mobile App (role-based features)                                │   │
│  │  📲 Telegram Bot (quick actions + notifications)                    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📝 ЗАДАНИЕ

### Шаг 1: Создай детальный план разработки

Создай план со следующей структурой:

```
1. АРХИТЕКТУРА СИСТЕМЫ
   1.1. Общая архитектура (диаграмма)
   1.2. Микросервисы vs Монолит — обоснование выбора
   1.3. База данных — схема и связи
   1.4. API Gateway — структура
   1.5. Аутентификация и авторизация

2. BACKEND (на основе VHM24-repo)
   2.1. Существующие модули (22 модуля) — что оставить
   2.2. Новые модули — что добавить
   2.3. API endpoints — полный список
   2.4. Интеграции — внешние сервисы
   2.5. Background jobs — scheduled tasks

3. WEB ПРИЛОЖЕНИЯ
   3.1. Admin Dashboard (для сотрудников)
        - Страницы по ролям
        - UI/UX спецификация
        - Компоненты
   3.2. Client Portal (для клиентов)
        - Покупатели
        - Инвесторы
        - Франчайзи
   3.3. Public Website (маркетинг)

4. MOBILE ПРИЛОЖЕНИЯ (iOS & Android)
   4.1. Архитектура (React Native / Flutter)
   4.2. Приложение для клиентов
        - Функции покупателя
        - Функции инвестора
        - Функции франчайзи
   4.3. Приложение для сотрудников
        - Функции по ролям
        - Offline режим
        - Push уведомления

5. TELEGRAM ИНТЕГРАЦИЯ
   5.1. Telegram WebApp (для покупателей)
        - Геймификация из vhm24v2
        - Программа лояльности
        - Заказы
   5.2. Telegram Bot (для сотрудников)
        - Команды по ролям
        - Уведомления
        - Quick actions
   5.3. Telegram Bot (для инвесторов/франчайзи)
        - Отчёты
        - Уведомления о доходах

6. ПРОГРАММА ЛОЯЛЬНОСТИ И ГЕЙМИФИКАЦИЯ
   6.1. Уровни лояльности (Bronze → Platinum)
   6.2. Система поинтов
   6.3. Ежедневные/недельные квесты
   6.4. Достижения
   6.5. Реферальная программа
   6.6. Streak система

7. СИСТЕМА УВЕДОМЛЕНИЙ
   7.1. Каналы (In-App, Push, Email, Telegram, SMS, Web Push)
   7.2. Триггеры уведомлений
   7.3. Персонализация
   7.4. Очереди и retry

8. ФИНАНСОВЫЙ МОДУЛЬ
   8.1. Платежи (Payme, Click, Uzum, Telegram Stars, карты)
   8.2. Инвесторский портал
   8.3. Франчайзинговые расчёты
   8.4. Data Reconciliation (из VHM24R_2)
   8.5. Отчётность

9. ИНВЕНТАРЬ И ЛОГИСТИКА
   9.1. 3-уровневая система (Склад → Оператор → Машина)
   9.2. Прогнозирование
   9.3. Автозаказы
   9.4. QR-система

10. БЕЗОПАСНОСТЬ
    10.1. 2FA (TOTP)
    10.2. RBAC (8+ ролей)
    10.3. Audit Logs
    10.4. Rate Limiting
    10.5. Data Encryption

11. МОНИТОРИНГ И АНАЛИТИКА
    11.1. Prometheus + Grafana
    11.2. Sentry (errors)
    11.3. Business Analytics
    11.4. ML/AI predictions

12. DEVOPS И DEPLOYMENT
    12.1. CI/CD Pipeline
    12.2. Docker + Kubernetes
    12.3. Environments (dev/staging/prod)
    12.4. Backup strategy

13. ПЛАН РАЗРАБОТКИ (ROADMAP)
    13.1. Фаза 1: MVP (8 недель)
    13.2. Фаза 2: Beta (6 недель)
    13.3. Фаза 3: Production (4 недели)
    13.4. Фаза 4: Масштабирование

14. КОМАНДА И РЕСУРСЫ
    14.1. Состав команды
    14.2. Инструменты
    14.3. Бюджет
```

### Шаг 2: Детализация каждого раздела

После создания общего плана, **детализируй каждый раздел** с:
- Конкретными файлами и папками
- Примерами кода (где уместно)
- Ссылками на существующий код из проектов
- User stories
- Acceptance criteria
- Оценкой времени

### Шаг 3: Создай отдельные документы

Создай следующие файлы:

```
/VHM24/docs/
├── ARCHITECTURE.md           # Детальная архитектура
├── DATABASE_SCHEMA.md        # Схема БД со всеми таблицами
├── API_SPECIFICATION.md      # Все endpoints с примерами
├── UI_UX_GUIDELINES.md       # Дизайн-система
├── MOBILE_SPEC.md           # Спецификация мобильных приложений
├── TELEGRAM_SPEC.md         # Спецификация Telegram интеграции
├── SECURITY_SPEC.md         # Требования безопасности
├── DEPLOYMENT_GUIDE.md      # Инструкции по деплою
└── ROADMAP.md               # Детальный план разработки
```

---

## 🔧 ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ

### Backend Stack (из VHM24-repo + VHM)
```yaml
Framework: NestJS 10
Language: TypeScript 5.9
Database: PostgreSQL 16
ORM: TypeORM / Prisma 5
Cache: Redis 7
Queue: Bull 5
Real-time: Socket.IO 4
API: REST + tRPC + GraphQL (optional)
Auth: JWT + 2FA (Speakeasy)
Docs: Swagger/OpenAPI
```

### Frontend Stack (из vhm24v2 + VHM24-repo)
```yaml
Framework: Next.js 15 (Web) / React Native (Mobile)
UI Library: React 19
Styling: TailwindCSS 4
Components: shadcn/ui + Radix UI
State: Zustand 5 + TanStack Query
Forms: React Hook Form + Zod
Charts: Recharts 2
Animations: Framer Motion 12
Maps: Google Maps API
```

### Mobile Stack
```yaml
Framework: React Native 0.74+ / Expo 52
Navigation: React Navigation 7
State: Zustand + MMKV
Push: Firebase Cloud Messaging
Maps: react-native-maps
Camera: expo-camera
Offline: WatermelonDB
```

### Telegram Stack (из vendhub-bot2 + vhm24v2)
```yaml
Bot Framework: aiogram 3.4 (Python)
WebApp: React 19 + @twa-dev/sdk
Payments: Telegram Stars API
```

---

## 🎨 ДИЗАЙН-СИСТЕМА "WARM BREW"

### Цвета (OKLCH)
```css
/* Light Theme */
--primary-espresso: oklch(0.35 0.06 50);     /* #5D4037 */
--accent-caramel: oklch(0.75 0.12 70);       /* #D4A574 */
--success-mint: oklch(0.7 0.1 160);          /* #7CB69D */
--background-cream: oklch(0.98 0.008 85);    /* #FDF8F3 */
--text-chocolate: oklch(0.2 0.04 50);        /* #2C1810 */

/* Dark Theme */
--background-dark: oklch(0.12 0.01 250);
--card-dark: oklch(0.18 0.01 250);
```

### Типографика
```css
--font-display: 'Playfair Display', serif;
--font-sans: 'DM Sans', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

---

## 📊 РОЛИ И ПРАВА ДОСТУПА

### Матрица ролей

| Роль | Web Admin | Mobile Staff | Mobile Client | TG Bot Staff | TG WebApp |
|------|-----------|--------------|---------------|--------------|-----------|
| **OWNER/CEO** | ✅ Full | ✅ Full | ❌ | ✅ Full | ❌ |
| **ADMIN** | ✅ Full | ✅ Full | ❌ | ✅ Full | ❌ |
| **MANAGER** | ✅ Limited | ✅ Limited | ❌ | ✅ Limited | ❌ |
| **ACCOUNTANT** | ✅ Finance | ✅ Finance | ❌ | ✅ Finance | ❌ |
| **WAREHOUSE** | ✅ Inventory | ✅ Inventory | ❌ | ✅ Inventory | ❌ |
| **OPERATOR** | ✅ Tasks | ✅ Tasks | ❌ | ✅ Tasks | ❌ |
| **TECHNICIAN** | ✅ Repairs | ✅ Repairs | ❌ | ✅ Repairs | ❌ |
| **VIEWER** | ✅ Read-only | ✅ Read-only | ❌ | ✅ Read-only | ❌ |
| **CUSTOMER** | ❌ | ❌ | ✅ Full | ❌ | ✅ Full |
| **INVESTOR** | ✅ Investor Portal | ✅ Investor | ❌ | ✅ Reports | ❌ |
| **FRANCHISEE** | ✅ Franchise Portal | ✅ Franchise | ❌ | ✅ Reports | ❌ |

---

## 📁 СТРУКТУРА ПРОЕКТА

```
vendhub-unified/
├── apps/
│   ├── api/                      # NestJS Backend (из VHM24-repo)
│   │   ├── src/
│   │   │   ├── modules/          # 22+ модулей (расширяемо)
│   │   │   │   ├── auth/         # JWT + 2FA + OAuth
│   │   │   │   ├── users/        # Управление пользователями
│   │   │   │   ├── organizations/# Multi-tenant
│   │   │   │   ├── machines/     # Вендинговые автоматы
│   │   │   │   ├── inventory/    # 3-уровневый инвентарь
│   │   │   │   ├── tasks/        # Задачи + фото-валидация
│   │   │   │   ├── orders/       # Заказы клиентов
│   │   │   │   ├── transactions/ # Финансовые операции
│   │   │   │   ├── loyalty/      # Программа лояльности
│   │   │   │   ├── gamification/ # Квесты и достижения
│   │   │   │   ├── notifications/# Multi-channel
│   │   │   │   ├── reports/      # PDF + Excel
│   │   │   │   ├── incidents/    # Инциденты
│   │   │   │   ├── complaints/   # Жалобы клиентов
│   │   │   │   ├── analytics/    # Аналитика
│   │   │   │   ├── investors/    # Портал инвесторов
│   │   │   │   ├── franchise/    # Франчайзинг
│   │   │   │   ├── reconciliation/# Сверка данных
│   │   │   │   └── telegram/     # Bot + WebApp API
│   │   │   ├── common/           # Shared utilities
│   │   │   └── config/           # Configuration
│   │   └── prisma/               # Database schema
│   │
│   ├── web-admin/                # Next.js Admin Dashboard
│   │   ├── app/
│   │   │   ├── (auth)/           # Login, Register, 2FA
│   │   │   ├── (dashboard)/      # Staff pages
│   │   │   ├── (investor)/       # Investor portal
│   │   │   └── (franchise)/      # Franchise portal
│   │   └── components/
│   │
│   ├── web-client/               # Next.js Client Portal
│   │   ├── app/
│   │   │   ├── catalog/          # Product catalog
│   │   │   ├── map/              # Machine locations
│   │   │   ├── orders/           # Order history
│   │   │   ├── loyalty/          # Loyalty program
│   │   │   └── profile/          # User profile
│   │   └── components/
│   │
│   ├── mobile-client/            # React Native Client App
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   │   ├── customer/     # Buyer screens
│   │   │   │   ├── investor/     # Investor screens
│   │   │   │   └── franchise/    # Franchisee screens
│   │   │   ├── components/
│   │   │   ├── navigation/
│   │   │   └── stores/
│   │   ├── ios/
│   │   └── android/
│   │
│   ├── mobile-staff/             # React Native Staff App
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   │   ├── operator/     # Operator screens
│   │   │   │   ├── technician/   # Technician screens
│   │   │   │   ├── warehouse/    # Warehouse screens
│   │   │   │   ├── manager/      # Manager screens
│   │   │   │   └── admin/        # Admin screens
│   │   │   ├── components/
│   │   │   └── services/
│   │   ├── ios/
│   │   └── android/
│   │
│   ├── twa/                      # Telegram WebApp (из vhm24v2)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── catalog/
│   │   │   │   ├── cart/
│   │   │   │   ├── orders/
│   │   │   │   ├── loyalty/
│   │   │   │   ├── quests/
│   │   │   │   └── achievements/
│   │   │   ├── stores/           # 8 Zustand stores
│   │   │   └── components/
│   │   └── public/
│   │
│   ├── bot-staff/                # Telegram Bot для сотрудников (из vendhub-bot2)
│   │   ├── handlers/
│   │   │   ├── admin/
│   │   │   ├── manager/
│   │   │   ├── operator/
│   │   │   ├── warehouse/
│   │   │   ├── accountant/
│   │   │   └── technician/
│   │   ├── middlewares/
│   │   ├── services/
│   │   └── locales/              # i18n (RU, UZ, EN)
│   │
│   ├── bot-client/               # Telegram Bot для клиентов
│   │   ├── handlers/
│   │   │   ├── customer/
│   │   │   ├── investor/
│   │   │   └── franchise/
│   │   ├── middlewares/
│   │   └── services/
│   │
│   └── marketing/                # Marketing website
│       └── src/
│
├── packages/
│   ├── ui/                       # Shared UI components
│   ├── config/                   # Shared configs
│   ├── types/                    # TypeScript types
│   ├── utils/                    # Utility functions
│   ├── api-client/               # API client library
│   └── db/                       # Database schema
│
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── Dockerfiles/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_SPECIFICATION.md
│   └── ...
│
├── scripts/
│   ├── setup.sh
│   ├── deploy.sh
│   └── seed.ts
│
├── turbo.json                    # Turborepo config
├── package.json
└── README.md
```

---

## ✅ КРИТЕРИИ ПРИЁМКИ

### MVP (Минимальный жизнеспособный продукт)

- [ ] Backend API работает (все 220+ endpoints из VHM24-repo)
- [ ] Multi-tenant изоляция данных
- [ ] 2FA аутентификация
- [ ] Web Admin Dashboard для сотрудников
- [ ] Mobile App для операторов (iOS + Android)
- [ ] Telegram WebApp для покупателей
- [ ] Telegram Bot для сотрудников
- [ ] 3-уровневая система инвентаря
- [ ] Программа лояльности (базовая)
- [ ] Уведомления (Telegram + Email + Push)
- [ ] Оплата (Payme, Click)

### Beta

- [ ] Инвесторский портал (Web + Mobile)
- [ ] Франчайзинговый портал
- [ ] Полная геймификация (квесты, достижения)
- [ ] Data Reconciliation
- [ ] Google Maps интеграция
- [ ] Telegram Stars оплата
- [ ] Offline режим в Mobile
- [ ] SMS уведомления
- [ ] ML прогнозирование

### Production

- [ ] 99.9% uptime
- [ ] <200ms API response time
- [ ] Security audit пройден
- [ ] GDPR compliance
- [ ] App Store + Google Play публикация
- [ ] Полная документация

---

## 🚀 КОМАНДА ДЛЯ ЗАПУСКА

```
Проанализируй все проекты в папке /VHM24 и создай ДЕТАЛЬНЫЙ ПЛАН разработки
VendHub Unified Platform согласно этому мастер-промпту.

Для каждого раздела плана:
1. Опиши текущее состояние (что уже есть в проектах)
2. Опиши целевое состояние (что нужно сделать)
3. Укажи конкретные файлы для переноса/модификации
4. Дай оценку времени
5. Укажи зависимости между задачами

Начни с раздела "1. АРХИТЕКТУРА СИСТЕМЫ" и двигайся последовательно.
Сохраняй результаты в папку /VHM24/docs/

После создания общего плана, спроси какой раздел детализировать первым.
```

---

## 📎 ДОПОЛНИТЕЛЬНЫЕ КОМАНДЫ

### Для детализации конкретного раздела:
```
Детализируй раздел [НОМЕР. НАЗВАНИЕ] из плана разработки VendHub Unified.
Включи:
- User stories
- Acceptance criteria
- Примеры кода
- Диаграммы (если нужны)
- Оценку времени по задачам
```

### Для создания спецификации модуля:
```
Создай полную спецификацию модуля [НАЗВАНИЕ] для VendHub Unified:
- API endpoints (request/response)
- Database schema
- Business logic
- UI/UX wireframes
- Test cases
```

### Для ревью существующего кода:
```
Проанализируй код в [ПУТЬ К ПАПКЕ] и определи:
- Что можно переиспользовать
- Что нужно рефакторить
- Что нужно написать с нуля
- Потенциальные проблемы
```

---

*Мастер-промпт создан на основе анализа 18 проектов VendHub*
*Общий объём кода: ~500,000+ строк*
*Дата: 14 января 2026*
