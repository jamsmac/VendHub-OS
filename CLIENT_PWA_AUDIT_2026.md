# Client PWA — Полный аудит

> Vite 5.4 + React 19 + Zustand 5 + TanStack Query 5
> Дата: 9 марта 2026 | Оценка: **7.5/10**

---

## Сводка

| Область            | Оценка | Статус                        |
| ------------------ | ------ | ----------------------------- |
| Безопасность       | 5/10   | Требует немедленного внимания |
| Качество кода      | 7/10   | Приемлемо с замечаниями       |
| Архитектура        | 8/10   | Хорошо                        |
| Производительность | 7/10   | Есть оптимизации              |
| PWA Features       | 8/10   | Хорошо                        |
| UX/Accessibility   | 6/10   | Требует доработки             |
| Тестирование       | 4/10   | Критически мало               |

---

## 1. Структура проекта

```
apps/client/                          54 файла | ~10,355 строк кода
├── src/
│   ├── App.tsx                       Routing (23 lazy-loaded страницы)
│   ├── main.tsx                      Entry + SW registration
│   ├── i18n.ts                       i18next config (ru/uz/en)
│   ├── components/
│   │   ├── ErrorBoundary.tsx         Class-based error boundary
│   │   ├── layout/                   Layout, Header, BottomNav
│   │   ├── machine/MachineCard.tsx   Карточка автомата
│   │   ├── map/GoogleMap.tsx         Leaflet + OpenStreetMap
│   │   └── ui/                       11 shadcn/ui компонентов
│   ├── hooks/useGeolocation.ts       Единственный кастомный хук
│   ├── lib/
│   │   ├── api.ts                    Axios client (16 API групп, 407 строк)
│   │   ├── store.ts                  4 Zustand stores
│   │   └── utils.ts                  Утилиты
│   ├── pages/                        23 страницы (public + protected)
│   ├── locales/                      en.ts, ru.ts, uz.ts
│   └── __tests__/                    5 тестовых файлов
├── vite.config.ts                    PWA + Workbox конфиг
├── vitest.config.ts                  Coverage thresholds: 60%
├── tailwind.config.js                Dark mode class-based
└── eslint.config.mjs                 TS-ESLint + React Hooks
```

### Зависимости (ключевые)

| Категория | Пакеты                                   |
| --------- | ---------------------------------------- |
| Core      | React 19.2, React Router 6.30, Vite 5.4  |
| State     | Zustand 5, TanStack Query 5.83           |
| HTTP      | Axios 1.13                               |
| Forms     | React Hook Form 7.61, Zod 3.25           |
| Maps      | Leaflet 1.9, React Leaflet 5             |
| i18n      | i18next 25.5                             |
| PWA       | workbox-window 7.4, vite-plugin-pwa 0.21 |
| UI        | shadcn/ui, Radix, Lucide, Tailwind 3.4   |
| QR        | html5-qrcode 2.3                         |
| Testing   | Vitest 1.6, Testing Library 16           |

---

## 2. Безопасность (5/10)

### CRIT-1: JWT токены в localStorage

**Файл:** `src/lib/api.ts`, строки 18-28

Текущая реализация хранит access и refresh токены в localStorage. Это делает их доступными любому JS-скрипту на странице, что создает уязвимость при XSS атаке.

**Положительные моменты:**

- Token refresh с queue mechanism реализован корректно (строки 46-120)
- Автоматический retry на 401 с предотвращением бесконечных циклов
- Очистка токенов при logout

### CRIT-2: CSP header слишком разрешительный

**Файл:** `index.html`, строка 29

CSP содержит `'unsafe-inline'` и `'unsafe-eval'` в script-src — это фактически отключает защиту от XSS. Рекомендуется убрать оба и перейти на nonce-based подход.

### CRIT-3: VAPID ключ отсутствует в .env.example

**Файл:** `.env.example` — `VITE_VAPID_PUBLIC_KEY=` пустой, push уведомления не будут работать в production.

### Что сделано хорошо:

- Нет небезопасного рендеринга HTML — нигде в коде
- Формы используют controlled inputs с Zod валидацией
- `frame-ancestors: 'none'` — защита от clickjacking
- Geolocation с feature detection и error handling

---

## 3. Качество кода (7/10)

### 3.1 eslint-disable директивы (20 шт)

| Файл                                 | Кол-во | Подавляемое правило |
| ------------------------------------ | ------ | ------------------- |
| `pages/LoyaltyPage.tsx`              | 5      | `no-explicit-any`   |
| `components/map/GoogleMap.tsx`       | 3      | `no-explicit-any`   |
| `pages/MapPage.tsx`                  | 3      | `no-explicit-any`   |
| `pages/HomePage.tsx`                 | 2      | `no-explicit-any`   |
| `lib/api.ts`                         | 2      | `no-explicit-any`   |
| `pages/MenuPage.tsx`                 | 1      | `no-explicit-any`   |
| `pages/CheckoutPage.tsx`             | 1      | `no-explicit-any`   |
| `pages/DrinkDetailPage.tsx`          | 1      | `no-explicit-any`   |
| `pages/ComplaintPage.tsx`            | 1      | `no-explicit-any`   |
| `components/machine/MachineCard.tsx` | 1      | `no-explicit-any`   |

**Корневая причина:** Отсутствуют TypeScript интерфейсы для API response — все 20 из-за `any` типов.

### 3.2 TypeScript `any` — 16 мест

Все в page компонентах и API слое. Решение — импортировать типы из `@vendhub/shared`.

### 3.3 console.log в production

- `main.tsx:37` — нужно убрать или спрятать за `import.meta.env.DEV`

### 3.4 Крупные файлы (нужен рефакторинг)

| Файл                              | Строк | Проблема                |
| --------------------------------- | ----- | ----------------------- |
| `pages/LoyaltyPage.tsx`           | 761   | 3 таба в одном файле    |
| `pages/ReferralsPage.tsx`         | 435   | Inline логика           |
| `pages/ComplaintPage.tsx`         | 397   | Форма + логика вместе   |
| `pages/TransactionDetailPage.tsx` | 345   | Можно разбить на секции |
| `pages/ProfilePage.tsx`           | 334   | Настройки + профиль     |
| `pages/CheckoutPage.tsx`          | 327   | Форма + платёж          |

### 3.5 Дублирование кода

**Geolocation:** Логика дублируется между `hooks/useGeolocation.ts` и `lib/store.ts` (useGeolocationStore). Нужно оставить только hook.

### 3.6 tsconfig.json — ослабленные проверки

`noUnusedLocals: false` и `noUnusedParameters: false` разрешают мёртвый код.

---

## 4. Архитектура (8/10)

### 4.1 Routing

- React Router 6.30 с `lazy()` + `Suspense` — 23 route
- **8 public** (/, /map, /machine/:id, /menu/:machineId, /drink/:mid/:pid, /complaint, /scan, /help)
- **14 protected** (cart, checkout, profile, loyalty, transactions и др.)
- ProtectedRoute корректно сохраняет return URL

### 4.2 Zustand Stores (4 шт)

| Store                 | Persist      | Назначение                                |
| --------------------- | ------------ | ----------------------------------------- |
| `useCartStore`        | localStorage | Корзина (items, machine, quantity cap=10) |
| `useUserStore`        | localStorage | Пользователь (user, isAuthenticated)      |
| `useUIStore`          | localStorage | Тема, язык, уведомления                   |
| `useGeolocationStore` | нет          | Координаты (дублирует hook)               |

**Проблема в useUIStore:** DOM-манипуляция (`classList.toggle`) внутри action — нарушает принцип pure state.

### 4.3 API Client

- Axios с baseURL `/api/v1`, timeout 30s
- Request interceptor: Bearer token
- Response interceptor: token refresh с queue
- **16 API групп**: machines, products, orders, loyalty, favorites, transactions, quests, referrals, complaints, auth, achievements, promoCodes, leaderboard, recipes, notifications, locations

### 4.4 Error Boundary

- Class-based (единственный способ в React)
- Отображает UI с кнопками "Retry" и "Refresh"
- **Не отправляет ошибки на сервер** (нет Sentry)
- Ловит только render ошибки, не async

---

## 5. Производительность (7/10)

### 5.1 Code Splitting — Отлично

23 lazy-loaded страницы, каждая в отдельном chunk. Самый большой — LoyaltyPage (25.9KB).

### 5.2 Мемоизация — Недостаточно

| Инструмент    | Использований | Нужно          |
| ------------- | ------------- | -------------- |
| `useMemo`     | 0             | 3-5 мест       |
| `useCallback` | 3             | Достаточно     |
| `React.memo`  | 0             | 2-3 компонента |

**Критичное место — HomePage, строки 23-39:**
sortedMachines пересчитывается на каждый рендер (map + sort + slice). Нужен `useMemo` с deps `[machines, position]`.

### 5.3 Крупные зависимости

| Пакет        | Размер | Альтернатива            |
| ------------ | ------ | ----------------------- |
| leaflet      | ~140KB | — (необходим для карты) |
| html5-qrcode | ~80KB  | qr-scanner (меньше)     |
| date-fns     | ~27KB  | dayjs (13KB)            |

---

## 6. PWA Features (8/10)

### 6.1 Service Worker

- `vite-plugin-pwa` с `registerType: "autoUpdate"`
- Hourly update check через `registration.update()`
- Navigation fallback на `index.html` (кроме `/api/`)

### 6.2 Workbox Caching

| URL Pattern       | Стратегия    | TTL     | Назначение  |
| ----------------- | ------------ | ------- | ----------- |
| Google Fonts      | CacheFirst   | 1 год   | Шрифты      |
| `/api/` endpoints | NetworkFirst | 1 час   | API данные  |
| images            | CacheFirst   | 30 дней | Изображения |

### 6.3 Manifest

- `display: "standalone"` — полноэкранный режим
- 4 иконки (64, 192, 512, 512-maskable)
- iOS и Android PWA мета-теги в index.html

### 6.4 Отсутствует Install Prompt

Нет обработки `beforeinstallprompt` — пользователи не видят кнопку "Установить на экран".

### 6.5 Push Notifications

- VAPID подписка реализована (`NotificationSettingsPage`)
- Permission request + PushManager subscribe
- Backend endpoint для хранения подписок

---

## 7. UX/Accessibility (6/10)

### Семантика HTML

- `<nav>`, `<main>`, `<section>` используются корректно
- `<button>` для интерактивных элементов
- Нет `<article>` тегов

### ARIA

- Icon-only кнопки без `aria-label`
- Custom toggle в ProfilePage без `aria-pressed`
- Нет visible focus indicators

### i18n

- 3 языка: ru (default), uz, en
- Авто-определение языка браузера
- Все UI строки через `t()` ключи

### Responsive

- Mobile-first с Tailwind
- Fixed bottom navigation
- Safe area support (`viewport-fit=cover`)
- Landscape mode не тестировался

### Loading States

- Skeleton loaders на большинстве страниц
- DrinkDetailPage, CartPage, ProfilePage — нет loading state
- Toast уведомления для ошибок

---

## 8. Тестирование (4/10)

### Текущее покрытие

| Что тестируется | Файлов | Покрытие                |
| --------------- | ------ | ----------------------- |
| Zustand stores  | 3      | Полное (cart, user, ui) |
| UI компоненты   | 1      | Только Button           |
| Hooks           | 0      | Нет                     |
| Pages           | 0      | Нет (23 страницы!)      |
| API client      | 0      | Нет                     |
| i18n            | 0      | Нет                     |

### Vitest конфигурация

Coverage thresholds: 60% для lines, functions, branches, statements.

### Что НЕ тестируется (критичное)

1. Checkout flow (создание заказа, оплата)
2. Auth flow (Telegram login, token storage)
3. Cart operations (add, edit, promo, checkout)
4. Map interactions (geolocation, nearest machine)
5. Push notification subscription

---

## 9. Хуки

### Кастомные хуки (1)

**useGeolocation** (`src/hooks/useGeolocation.ts`)

- Feature detection, Error handling, Timeout: 10s, Cache: 60s

### Использование по страницам

| Страница             | useQuery | useMutation | useState | useEffect |
| -------------------- | -------- | ----------- | -------- | --------- |
| HomePage             | 1        | 0           | 0        | 0         |
| MapPage              | 1        | 0           | 2        | 0         |
| CartPage             | 0        | 1           | 3        | 0         |
| CheckoutPage         | 0        | 1           | 2        | 0         |
| LoyaltyPage          | 3        | 0           | 1        | 0         |
| NotificationSettings | 1        | 2           | 1        | 1         |

**Dependency arrays:** Все корректны. Утечек памяти не обнаружено.

---

## 10. Страницы (23 route)

| #   | Страница                 | Строк | Loading  | Error | Protected |
| --- | ------------------------ | ----- | -------- | ----- | --------- |
| 1   | HomePage                 | 132   | Skeleton | Toast | Нет       |
| 2   | MapPage                  | 138   | Skeleton | Toast | Нет       |
| 3   | MachineDetailPage        | 160   | Да       | Toast | Нет       |
| 4   | MenuPage                 | 201   | Skeleton | Toast | Нет       |
| 5   | DrinkDetailPage          | 293   | Нет      | Toast | Нет       |
| 6   | CartPage                 | 293   | Нет      | Toast | Да        |
| 7   | CheckoutPage             | 327   | Loader   | Toast | Да        |
| 8   | OrderSuccessPage         | 151   | Нет      | Toast | Да        |
| 9   | ProfilePage              | 334   | Нет      | Нет   | Да        |
| 10  | TransactionHistoryPage   | 293   | Skeleton | Toast | Да        |
| 11  | TransactionDetailPage    | 345   | Skeleton | Toast | Да        |
| 12  | LoyaltyPage              | 761   | Skeleton | Toast | Да        |
| 13  | FavoritesPage            | 307   | Skeleton | Toast | Да        |
| 14  | QuestsPage               | 327   | Skeleton | Toast | Да        |
| 15  | ReferralsPage            | 435   | Skeleton | Toast | Да        |
| 16  | AchievementsPage         | 230   | Skeleton | Toast | Да        |
| 17  | PromoCodePage            | 209   | Skeleton | Toast | Да        |
| 18  | ComplaintPage            | 397   | Skeleton | Toast | Нет       |
| 19  | QRScanPage               | 180   | Spinner  | Toast | Нет       |
| 20  | NotificationSettingsPage | 314   | Да       | Toast | Да        |
| 21  | HelpPage                 | 192   | Нет      | Нет   | Нет       |
| 22  | NotFoundPage             | 24    | Да       | Да    | Нет       |

**Проблемные:** DrinkDetailPage, CartPage, ProfilePage, HelpPage — нет loading state.

---

## 11. План исправлений

### Немедленно (1-2 дня)

| #   | Задача                                 | Файл                   | Часы |
| --- | -------------------------------------- | ---------------------- | ---- |
| 1   | JWT из localStorage в httpOnly cookies | `lib/api.ts` + backend | 8-12 |
| 2   | Ужесточить CSP                         | `index.html:29`        | 1    |
| 3   | Добавить VAPID key в .env.example      | `.env.example`         | 0.5  |

### Высокий приоритет (3-5 дней)

| #   | Задача                                             | Файл                        | Часы |
| --- | -------------------------------------------------- | --------------------------- | ---- |
| 4   | Создать API types из @vendhub/shared               | `lib/api.ts`, pages         | 6    |
| 5   | Убрать 20 eslint-disable                           | 10 файлов                   | 4    |
| 6   | Рефакторинг LoyaltyPage (761 строк в 3 компонента) | `pages/LoyaltyPage.tsx`     | 4    |
| 7   | Добавить useMemo на sortedMachines                 | `pages/HomePage.tsx:23`     | 0.5  |
| 8   | Убрать дублирование geolocation store              | `lib/store.ts`              | 2    |
| 9   | Добавить Install Prompt UI                         | `App.tsx` + новый компонент | 3    |

### Средний приоритет (1-2 недели)

| #   | Задача                                           | Часы |
| --- | ------------------------------------------------ | ---- |
| 10  | E2E тесты: auth, cart, checkout, payment         | 16   |
| 11  | Добавить aria-labels на icon кнопки              | 3    |
| 12  | Loading states: DrinkDetail, Cart, Profile, Help | 3    |
| 13  | Включить `noUnusedLocals: true` в tsconfig       | 2    |
| 14  | Убрать console.log из main.tsx                   | 0.5  |
| 15  | Sentry integration для error reporting           | 4    |
| 16  | Разбить ComplaintPage и ReferralsPage            | 4    |

### Доработки (2-4 недели)

| #   | Задача                             | Часы    |
| --- | ---------------------------------- | ------- |
| 17  | Offline transactions (IndexedDB)   | 8       |
| 18  | Storybook для UI компонентов       | 6       |
| 19  | Lighthouse CI в pipeline           | 3       |
| 20  | Landscape mode testing             | 2       |
| 21  | Заменить date-fns на dayjs (-14KB) | 2       |
| 22  | Поднять coverage threshold до 80%  | ongoing |

---

## Итого

**Текущая оценка: 7.5/10**
**Целевая после исправлений: 9.0/10**

**Сильные стороны:** Современный стек, хороший PWA support, lazy loading, i18n на 3 языка, чистая архитектура Zustand + React Query.

**Главные риски:** Небезопасное хранение токенов + ослабленный CSP = XSS угроза. Отсутствие тестов на страницы = регрессии при изменениях.

---

_Аудит: 9 марта 2026 | Охват: 54 файла, 10,355 строк кода_
