# VendHub OS — Design Handoff

> **Для:** команда разработки `jamsmac/VendHub-OS`
> **От:** Design team
> **Стек-таргет:** `apps/web/` — Next.js 16 + Tailwind + shadcn/ui + Radix
> **Обновлено:** 21 апреля 2026

---

## 1. Что это

Пакет дизайн-ассетов для **VendHub OS** (платформа управления вендинговой сетью) — результат фаз 1–6 дизайн-процесса:

| Артефакт                                          | Назначение                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| `VendHub_BrandBook.html`                          | Визуальная идентичность: логотип, палитра, типографика, tone of voice |
| `VendHub_DesignSystem.html` + `DesignSystem.html` | Все UI-примитивы и компоненты со всеми состояниями                    |
| `admin/*.html` (10 шт.)                           | Хай-фай моки всех экранов Admin Panel                                 |
| `mobile/Staff.html`, `mobile/Client.html`         | Мобильные приложения оператора и клиента                              |
| `Site.html`                                       | Публичный сайт vendhub.uz                                             |
| `Prototype.html`                                  | Интерактивный кликабельный прототип                                   |
| `SiteAudit.html`                                  | Аудит текущего публичного сайта + рекомендации                        |

Все HTML — **самодостаточные референсы**. Открываются в браузере, не требуют сборки.

---

## 2. Приоритет переноса

Дизайн-пакет **дополняет** существующий `apps/web/src/app/globals.css` ("Warm Glass"), не заменяет его. Конфликтов нет — у нас та же HSL-палитра (warm copper/amber).

**Порядок работ для команды:**

1. ✅ **Фаза Handoff** — изучить эту папку, выровнять терминологию
2. 🔄 **Фаза Tokens** — добавить недостающие токены из `design-tokens.ts` в `apps/web/tailwind.config.js` и `globals.css`
3. 🔄 **Фаза Components** — по спекам из `specs/` собрать экраны на существующих shadcn/ui + наших токенах
4. 🔄 **Фаза QA** — сверить реализацию с HTML-моками

---

## 3. Файлы пакета

```
handoff/
├── HANDOFF.md                  ← вы здесь
├── design-tokens.ts            ← TypeScript-константы для Tailwind/Next.js
├── globals-additions.css       ← дополнения к apps/web/src/app/globals.css
├── component-mapping.md        ← наш CSS-класс → shadcn компонент
└── specs/
    ├── dashboard.md            ← спека экрана /dashboard
    ├── machines.md             ← /machines + /machines/[id]
    ├── tasks.md                ← /tasks
    ├── locations.md            ← /locations
    ├── inventory.md            ← /inventory
    ├── products.md             ← /products (каталог)
    ├── users.md                ← /users (команда)
    ├── reports.md              ← /reports (финансы)
    └── settings.md             ← /settings
```

---

## 4. Как использовать спеки

Каждый файл в `specs/` устроен одинаково:

```markdown
# /dashboard

## Маршрут и роли

- URL: /dashboard
- Роли: admin, finance, ops_manager
- Хлебные крошки: VendHub › Admin › Дашборд

## Данные

- `GET /api/stats/overview` — KPI-карточки
- `GET /api/machines?status=alert` — требующие внимания

## Состояния

- loading: 4 skeleton-карточки KPI + skeleton-таблица
- empty: "Пока нет данных" + CTA "Создать первый автомат"
- error: Alert "Не удалось загрузить. Повторить?"

## Ключевые компоненты

- KPI Cards (x4) → shadcn Card + наш `.kpi` модификатор
- Tashkent Map → react-leaflet + MapDot маркеры
- Alerts panel → shadcn Alert с actions
- ...

## Референс

- HTML-мок: admin/Dashboard.html
- Figma/скрины: screenshots/Dashboard.png
```

Разработчик читает спеку → открывает HTML-мок рядом → пишет код.

---

## 5. Контракт с дизайном

**Если что-то в спеке не сходится с HTML-моком — приоритет у HTML-мока.**
Если в HTML-моке нет какого-то состояния (error, loading, empty), смотри `VendHub_DesignSystem.html` — там универсальные заготовки.

**Если компонента нет в shadcn/ui:**

- сначала ищи в `component-mapping.md` — может быть аналог на composition базовых
- если нет — пиши в `apps/web/src/components/ui/` по нашему стилю (dark mode + glass utilities)

**Если нашёл баг в спеке:** коммить в `handoff/specs/` напрямую, отметь в PR — обновим.

---

## 6. Бренд-константы (заморожены)

- **Логотип:** `assets/logo-round.svg` (964×964, SVG) — использовать везде из `packages/shared/assets/`
- **Первичный цвет:** `#D3A066` (Hub Sand) = HSL `28 48% 62%` ≈ `primary` в `globals.css`
- **Тёмный фон:** `#1A1919` (Hub Black) = HSL `25 20% 5%` = `background` в dark mode
- **Шрифты:** Montserrat 300–800 (UI), IBM Plex Mono 400/500/600 (цифры, ID, код)

**Запрещено:**

- менять пропорции/искажать логотип
- использовать цвета вне 3 официальных (Hub Sand / Black / White) + system tokens (`--success`, `--warning`, `--info`, `--destructive`)
- вставлять эмодзи в UI (не соответствует tone of voice)

---

## 7. Доставка

1. Скачайте `VendHub_Design_Handoff.zip` (весь пакет целиком).
2. Распакуйте в `VendHub-OS/design/` (или добавьте в `.gitignore` если не хотите коммитить HTML-моки).
3. Токены из `design-tokens.ts` и правила из `globals-additions.css` — **коммитить в код**.
4. HTML-моки — смотреть локально, не в production.

---

## 8. Контакты

- Владелец дизайна: Jamshid (jamshidsmac@gmail.com)
- Вопросы по компонентам: через issues в `jamsmac/VendHub-OS` с label `design`
- Срочные правки: комментарий в превью прямо в этом проекте

---

**Следующие шаги:**

- [ ] Team Lead читает HANDOFF.md + component-mapping.md
- [ ] Назначает спринт "Design System v1 → код"
- [ ] Параллельно бэкенд доводит API-контракты из спек
