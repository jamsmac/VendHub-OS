# VendHub — Design Package

**VendHub** — сеть умных кофейных автоматов и облачная платформа для управления ими в Узбекистане. Этот репозиторий содержит полный дизайн-пакет: бренд-гайд, дизайн-систему, экраны админки, мобильные приложения, публичный сайт и интерактивный прототип.

---

## 📁 Структура

```
VendHub/
├── VendHub_BrandBook.html      ← Бренд-гайд (логотип, цвет, тип, voice)
├── VendHub_DesignSystem.html   ← Дизайн-система (обзор)
├── DesignSystem.html           ← Компоненты (buttons, inputs, tables, cards…)
├── Site.html                   ← Публичный сайт vendhub.uz
├── Prototype.html              ← Интерактивный прототип · 3 флоу
├── admin/                      ← Десктоп-админка · 11 экранов
│   ├── Dashboard.html
│   ├── Machines.html / MachineDetail.html
│   ├── Catalog.html
│   ├── Tasks.html / Routes.html / Incidents.html
│   ├── Finance.html / Payouts.html
│   ├── Users.html / Settings.html
│   └── *.jsx                   ← Исходники React
├── mobile/                     ← iOS-приложения
│   ├── Staff.html              ← Оператор (3 экрана)
│   └── Client.html             ← Клиент (3 экрана)
├── shared/                     ← Токены, UI-ядро, иконки
│   ├── tokens.css              ← Все design tokens
│   ├── ui.css / admin.css / mobile.css / site.css / proto.css
│   ├── UI.jsx                  ← Button, Input, Badge, Table…
│   ├── Icons.jsx
│   └── AdminShell.jsx
└── assets/
    └── logo-round.svg
```

---

## 🎨 Бренд в одной строке

> **3 цвета. 1 шрифт. Ноль лишнего.**

- **Hub Sand** `#D3A066` — акцент, светлые состояния
- **Hub Black** `#1A1919` — фон, контраст
- **Hub White** `#FFFFFF` — текст, поверхности
- **Montserrat** — единственная гарнитура. `300` для italic-акцентов, `800` для display.
- **IBM Plex Mono** — технические числа, метки, SKU, ETA.

Основная тема — **тёмная**. Светлая есть, но вторична.

---

## 🧩 Что внутри

### 1. BrandBook (`VendHub_BrandBook.html`)

Лого и конструкция, сетка, safe area, палитра, типографика, voice&tone, иконография, примеры do/don't.

### 2. Design System (`DesignSystem.html`, `shared/`)

CSS-переменные (цвет, тип, spacing, radius, shadow, ease, duration), 30+ компонентов: кнопки, инпуты, select/pick, badges, chips, tags, carts, tables, modal, drawer, toast, progress, skeleton, empty states, tabs, dropdown.

### 3. Desktop Admin · 11 экранов

- **Dashboard** — KPI, realtime feed, карта сети
- **Machines / MachineDetail** — список, телеметрия, история
- **Catalog** — ассортимент и рецепты
- **Tasks / Routes / Incidents** — операции и SLA
- **Finance / Payouts** — выручка, сверка, выплаты
- **Users / Settings** — роли, интеграции

### 4. Mobile · 6 экранов

- **Staff** — маршрут дня, заправка, инцидент-чек-лист
- **Client** — меню, QR-оплата, лояльность

### 5. Site · `vendhub.uz`

Single-page: hero · маркетинг-сетей · «как работает» · платформа · калькулятор франшизы · сервис&SLA · FAQ · покрытие&карта · форма · футер.

### 6. Prototype · 3 флоу

- **Flow 1** · Оператор заправляет автомат (5 шагов, mobile)
- **Flow 2** · Админ закрывает инцидент (5 шагов, desktop)
- **Flow 3** · Сайт → CRM: заявка на франшизу (5 шагов, site+admin)

Навигация: ← / → стрелками или сайдбаром.

---

## 🔧 Tech notes

- Pure HTML + React 18 + Babel standalone (inline JSX, no build step)
- Все design tokens в `shared/tokens.css` через CSS-переменные
- Dark/light/compact/cozy/comfortable переключаются через `data-theme` и `data-density` на `<html>`
- Шрифты — Google Fonts (Montserrat + IBM Plex Mono)
- Нет внешних ассетов кроме логотипа и шрифтов

---

## 📋 Open items

- [ ] Реальные фотографии автоматов (сейчас — иллюстрации)
- [ ] Финальные иконки от иллюстратора (сейчас — стандартный stroke-1.8 линейный набор)
- [ ] Локализация UZ/EN (сейчас RU только в UI)
- [ ] Print-версии документов (договор франшизы и т.д.)

---

© 2025 VendHub · Design package · v1.0
