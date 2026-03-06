# VendHub.uz -- Component Tree

> React component architecture for the VendHub.uz website.
> Next.js 16 / App Router / React 19 / Supabase / Tailwind CSS 4

---

## 1. Landing Page -- Component Tree

The landing page (`app/page.tsx`) is a single-page layout with 6 scrollable sections anchored by hash links (`#home`, `#map`, `#menu`, `#benefits`, `#partner`, `#about`).

```mermaid
graph TD
    ROOT["RootLayout<br/><i>app/layout.tsx</i><br/>Playfair Display + DM Sans<br/>bg-cream text-chocolate"]
    ROOT --> HOME["Home<br/><i>app/page.tsx</i><br/>Server Component"]

    HOME --> HEADER["Header"]
    HOME --> HERO["HeroSection<br/><i>#home</i>"]
    HOME --> STATS["StatsSection"]
    HOME --> QUICK["QuickActions"]
    HOME --> POPULAR["PopularProducts"]
    HOME --> PROMO["PromoBanner"]
    HOME --> WHY["WhyVendHub"]
    HOME --> MAP["MachinesSection<br/><i>#map</i>"]
    HOME --> MENU["MenuSection<br/><i>#menu</i>"]
    HOME --> BENEFITS["BenefitsSection<br/><i>#benefits</i>"]
    HOME --> PARTNER["PartnerSection<br/><i>#partner</i>"]
    HOME --> ABOUT["AboutSection<br/><i>#about</i>"]
    HOME --> FOOTER["Footer"]
    HOME --> MODALS["Modals<br/><i>ModalProvider context</i>"]

    %% Header
    HEADER --> LOGO["Logo<br/>VendHub + Coffee & Snacks"]
    HEADER --> NAV["NavLinks<br/>6 items, smooth scroll"]
    HEADER --> LOGIN["LoginButton<br/>btn-caramel, opens Telegram"]
    HEADER --> MOBILE["MobileMenu<br/>burger, dropdown overlay"]

    %% Hero
    HERO --> GREET["DynamicGreeting<br/>time-based"]
    HERO --> HTITLE["HeroTitle<br/>Playfair Display"]
    HERO --> HSUB["HeroSubtitle<br/>dynamic numbers"]
    HERO --> CTA["CTAButtons<br/>Найти автомат + Смотреть меню"]
    HERO --> HIMG["MachineImage<br/>desktop only"]

    %% Stats
    STATS --> SC1["StatCard<br/>автоматов"]
    STATS --> SC2["StatCard<br/>напитков"]
    STATS --> SC3["StatCard<br/>заказов"]
    STATS --> SC4["StatCard<br/>рейтинг"]

    %% Quick Actions
    QUICK --> QA1["ActionCard<br/>Каталог"]
    QUICK --> QA2["ActionCard<br/>Автоматы"]

    %% Popular Products
    POPULAR --> PC["ProductCard x4<br/>onClick opens ProductModal"]

    %% Why VendHub
    WHY --> RC["ReasonCard x4"]

    %% Modals
    MODALS --> PMOD["ProductModal"]
    MODALS --> MMOD["MachineModal"]

    classDef server fill:#E8F5E9,stroke:#4CAF50,color:#1B5E20
    classDef client fill:#FFF3E0,stroke:#FF9800,color:#E65100
    classDef section fill:#EFEBE9,stroke:#5D4037,color:#3E2723
    classDef modal fill:#FCE4EC,stroke:#E91E63,color:#880E4F

    class ROOT,HOME server
    class HEADER,HERO,STATS,QUICK,POPULAR,PROMO,WHY,MAP,MENU,BENEFITS,PARTNER,ABOUT,FOOTER section
    class GREET,NAV,MOBILE,CTA,PC,MODALS client
    class PMOD,MMOD modal
```

---

## 2. Machines Section -- Detailed Breakdown

The `#map` section uses a tab switcher to toggle between map view and machine types.

```mermaid
graph TD
    MAP["MachinesSection<br/><i>#map</i>"]

    MAP --> TABS["TabSwitcher<br/>Карта | Типы автоматов"]

    MAP --> TAB_MAP["Tab: Карта"]
    MAP --> TAB_TYPES["Tab: Типы автоматов"]

    TAB_MAP --> YMAP["YandexMap<br/>16 markers + clusters"]
    TAB_MAP --> SEARCH["SearchInput"]
    TAB_MAP --> SFILT["StatusFilters<br/>Все | Работают | С акцией"]
    TAB_MAP --> TFILT["TypeFilters<br/>Кофе | Снэк | Холодные"]
    TAB_MAP --> MCARD["MachineCard xN<br/>onClick opens MachineModal"]

    TAB_TYPES --> ACC1["AccordionItem<br/>Кофейные автоматы"]
    TAB_TYPES --> ACC2["AccordionItem<br/>Снэк автоматы<br/><i>скоро</i>"]
    TAB_TYPES --> ACC3["AccordionItem<br/>Холодные напитки<br/><i>скоро</i>"]

    classDef active fill:#E8F5E9,stroke:#4CAF50
    classDef soon fill:#FFF9C4,stroke:#FBC02D
    class ACC1 active
    class ACC2,ACC3 soon
```

---

## 3. Menu Section -- Detailed Breakdown

```mermaid
graph TD
    MENU["MenuSection<br/><i>#menu</i>"]

    MENU --> CATF["CategoryFilter<br/>5 pills: Все, Кофе, Чай, Другое, Снэки"]
    MENU --> TEMPF["TemperatureFilter<br/>3 pills: Все, Горячие, Холодные"]
    MENU --> PGRID["ProductCard xN<br/>onClick opens ProductModal"]
    MENU --> EMPTY["EmptyState<br/>when no results match"]

    PGRID --> PMOD["ProductModal"]
    PMOD --> PIMG["ProductImage"]
    PMOD --> PINFO["ProductInfo<br/>name, desc, price, rating"]
    PMOD --> PSTATS["ProductStats<br/>volume, calories, caffeine"]
    PMOD --> OPTS["OptionsGrid<br/>hot / cold columns"]
    PMOD --> INGR["IngredientPills"]
    PMOD --> PCTA["ProductCTA"]

    classDef modal fill:#FCE4EC,stroke:#E91E63,color:#880E4F
    class PMOD,PIMG,PINFO,PSTATS,OPTS,INGR,PCTA modal
```

---

## 4. Benefits Section -- Detailed Breakdown

```mermaid
graph TD
    BEN["BenefitsSection<br/><i>#benefits</i>"]

    BEN --> BTABS["TabSwitcher<br/>Акции | Бонусы"]

    BEN --> AKCII["Tab: Акции"]
    BEN --> BONUS["Tab: Бонусы"]

    AKCII --> PCARD["PromoCard x4<br/>with promo code copy"]
    AKCII --> PCINFO["PromoCodeInfo<br/>info block"]

    BONUS --> LOVER["LoyaltyOverview<br/>1 балл = 1 UZS"]
    BONUS --> TIER["TierCards x4<br/>Bronze, Silver, Gold, Platinum<br/>+ progress bar"]
    BONUS --> PRIV["PrivilegesTable<br/>8 rows x 4 columns"]
    BONUS --> EARN["EarnPointsGrid x9<br/>ways to earn points"]
    BONUS --> SPEND["SpendPointsInfo"]
    BONUS --> LCTA["LoyaltyCTA<br/>register banner"]

    classDef promo fill:#FFF3E0,stroke:#FF9800,color:#E65100
    classDef loyalty fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
    class AKCII,PCARD,PCINFO promo
    class BONUS,LOVER,TIER,PRIV,EARN,SPEND,LCTA loyalty
```

---

## 5. Partner Section -- Detailed Breakdown

```mermaid
graph TD
    PART["PartnerSection<br/><i>#partner</i>"]

    PART --> MC1["ModelCard<br/>Локации<br/><i>expandable</i>"]
    PART --> MC2["ModelCard<br/>Поставщики<br/><i>expandable</i>"]
    PART --> MC3["ModelCard<br/>Инвесторы<br/><i>expandable</i>"]
    PART --> MC4["ModelCard<br/>Франшиза<br/><i>expandable</i>"]
    PART --> PFORM["PartnerForm<br/>model + name + phone + comment<br/>submits to Supabase"]
    PART --> PLOGOS["PartnerLogos<br/>trust badges"]
```

---

## 6. Admin Panel -- Component Tree (`apps/web/`)

> **Обновлено 2026-03-02.** Admin panel — отдельное приложение `apps/web/` (НЕ часть landing).
> Все страницы в `app/(dashboard)/`, защищены auth guard. Sidebar: 5 секций, 17 пунктов.

```mermaid
graph TD
    LAYOUT["DashboardLayout<br/><i>app/(dashboard)/layout.tsx</i><br/>auth guard, Sidebar + Header"]

    LAYOUT --> SIDE["Sidebar<br/>5 sections, 17 items"]
    LAYOUT --> HEAD["Header<br/>breadcrumbs, user, notifications"]
    LAYOUT --> SLOT["Page Content<br/><i>dynamic slot</i>"]

    %% ОПЕРАЦИИ
    SLOT --> DASH["Dashboard<br/><i>app/(dashboard)/dashboard/page.tsx</i>"]
    SLOT --> MACH["Machines<br/><i>app/(dashboard)/machines/page.tsx</i>"]
    SLOT --> MACHD["Machine Detail<br/><i>app/(dashboard)/machines/[id]/page.tsx</i>"]
    SLOT --> PROD["Products<br/><i>app/(dashboard)/products/page.tsx</i>"]
    SLOT --> PRODD["Product Detail<br/><i>app/(dashboard)/products/[id]/page.tsx</i>"]
    SLOT --> INV["Inventory<br/><i>app/(dashboard)/inventory/page.tsx</i>"]
    SLOT --> TASKS["Tasks<br/><i>app/(dashboard)/tasks/page.tsx</i>"]
    SLOT --> ORD["Orders<br/><i>app/(dashboard)/orders/page.tsx</i>"]
    SLOT --> MAP["Map<br/><i>app/(dashboard)/map/page.tsx</i>"]

    %% ФИНАНСЫ
    SLOT --> FIN["Finance<br/><i>app/(dashboard)/finance/page.tsx</i>"]
    SLOT --> CP["Counterparties<br/><i>app/(dashboard)/counterparties/page.tsx</i>"]
    SLOT --> REP["Reports<br/><i>app/(dashboard)/reports/page.tsx</i>"]

    %% КОМАНДА
    SLOT --> TEAM["Team<br/><i>app/(dashboard)/team/page.tsx</i>"]
    SLOT --> USERS["Users/Clients<br/><i>app/(dashboard)/users/page.tsx</i>"]

    %% МАРКЕТИНГ
    SLOT --> LOY["Loyalty<br/><i>app/(dashboard)/loyalty/page.tsx</i>"]
    SLOT --> BONUS["Bonus Actions<br/><i>app/(dashboard)/bonus-actions/page.tsx</i>"]
    SLOT --> PROMO["Promotions<br/><i>app/(dashboard)/promotions/page.tsx</i>"]

    %% СИСТЕМА
    SLOT --> DIR["Directories<br/><i>app/(dashboard)/directories/page.tsx</i>"]
    SLOT --> DIRS["Directory Entries<br/><i>app/(dashboard)/directories/[slug]/page.tsx</i>"]
    SLOT --> IMP["Import<br/><i>app/(dashboard)/import/page.tsx</i>"]
    SLOT --> WEB_C["Website Content<br/><i>app/(dashboard)/website/content/page.tsx</i>"]
    SLOT --> WEB_P["Website Partnership<br/><i>app/(dashboard)/website/partnership/page.tsx</i>"]
    SLOT --> INVEST["Investor Portal<br/><i>app/(dashboard)/investor/page.tsx</i>"]
    SLOT --> SET["Settings<br/><i>app/(dashboard)/settings/page.tsx</i>"]
    SLOT --> HELP["Help<br/><i>app/(dashboard)/help/page.tsx</i>"]

    %% LOGIN
    LAYOUT --> LOGIN["Login<br/><i>app/(auth)/login/page.tsx</i><br/>standalone, no sidebar"]

    classDef layout fill:#E8EAF6,stroke:#3F51B5,color:#1A237E
    classDef ops fill:#EFEBE9,stroke:#5D4037,color:#3E2723
    classDef fin fill:#E8F5E9,stroke:#388E3C,color:#1B5E20
    classDef team fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
    classDef mkt fill:#FFF3E0,stroke:#FF9800,color:#E65100
    classDef sys fill:#F3E5F5,stroke:#7B1FA2,color:#4A148C
    classDef auth fill:#FFEBEE,stroke:#F44336,color:#B71C1C

    class LAYOUT,SIDE,HEAD layout
    class DASH,MACH,MACHD,PROD,PRODD,INV,TASKS,ORD,MAP ops
    class FIN,CP,REP fin
    class TEAM,USERS team
    class LOY,BONUS,PROMO mkt
    class DIR,DIRS,IMP,WEB_C,WEB_P,INVEST,SET,HELP sys
    class LOGIN auth
```

---

## 7. Data Flow

```mermaid
graph TB
    subgraph Database
        SUPA[("Supabase<br/>PostgreSQL")]
    end

    subgraph Server ["Server Layer (Node.js)"]
        SSR["Server Components<br/><i>app/page.tsx</i><br/><i>app/admin/*</i>"]
        API["Server Actions<br/><i>form submissions</i><br/><i>CRUD operations</i>"]
    end

    subgraph Client ["Client Layer (Browser)"]
        CC["Client Components<br/><i>interactive sections</i>"]
        CTX["ModalProvider<br/><i>React Context</i>"]
        PMOD["ProductModal"]
        MMOD["MachineModal"]
        TOAST["Toast<br/><i>notifications</i>"]
    end

    subgraph External ["External Services"]
        YMAP["Yandex Maps API<br/><i>markers + clusters</i>"]
        TG["Telegram Bot API<br/><i>login + notifications</i>"]
    end

    SUPA -->|"@supabase/ssr<br/>fetch on server"| SSR
    SSR -->|"props"| CC
    CC -->|"context"| CTX
    CTX --> PMOD
    CTX --> MMOD
    CC -->|"server actions"| API
    API -->|"insert / update / delete"| SUPA
    CC --> YMAP
    CC --> TG
    API -->|"trigger toast"| TOAST

    classDef db fill:#E8F5E9,stroke:#388E3C,color:#1B5E20
    classDef server fill:#E3F2FD,stroke:#1976D2,color:#0D47A1
    classDef client fill:#FFF3E0,stroke:#FF9800,color:#E65100
    classDef ext fill:#F3E5F5,stroke:#7B1FA2,color:#4A148C

    class SUPA db
    class SSR,API server
    class CC,CTX,PMOD,MMOD,TOAST client
    class YMAP,TG ext
```

---

## 8. Shared UI Components

All reusable primitives live in `components/ui/`. They follow the coffee-themed design system defined in `tailwind.config.ts`.

| Component         | Purpose                  | Variants / Notes                                          |
| ----------------- | ------------------------ | --------------------------------------------------------- |
| **Button**        | Primary action element   | `espresso`, `caramel`, `outline`, `ghost`                 |
| **Card**          | Content container        | `coffee-card` base class, optional `hover-lift`           |
| **Pill**          | Filter / tag toggle      | active/inactive states, optional count badge              |
| **Modal**         | Overlay dialog           | overlay + slideUp animation, close on ESC / overlay click |
| **Badge**         | Status / label indicator | `promo`, `new`, `unavailable`, `status`                   |
| **PriceTag**      | Currency display         | Formatted UZS, optional strikethrough for discounts       |
| **SectionHeader** | Section title block      | Title: Playfair Display, Subtitle: DM Sans                |
| **Toast**         | Notification popup       | `success`, `error`, `info` -- bounceIn animation          |
| **Input**         | Text input field         | Label, error state, leading icon                          |
| **Select**        | Dropdown selector        | Standard dropdown                                         |
| **Textarea**      | Multi-line input         | Label support                                             |
| **Table**         | Data table (admin)       | Sortable columns, actions column                          |

---

## 9. State Management

The project deliberately keeps state management minimal, relying on React Server Components for data and React Context for UI state.

### Server-side (data)

- **Supabase SSR client** (`@supabase/ssr`) is used inside Server Components to fetch data at request time.
- Admin pages use Server Actions for mutations (create, update, delete).
- No client-side data cache -- each navigation re-fetches from Supabase.

### Client-side (UI state)

| Context / State       | Scope                       | Purpose                                                                                                      |
| --------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **ModalProvider**     | Global (wraps landing page) | Controls which modal is open and passes data to `ProductModal` / `MachineModal`                              |
| **useState (local)**  | Per-component               | Filter selections (category, temperature, status, type), tab state, accordion open/close, mobile menu toggle |
| **useEffect (local)** | HeroSection                 | Time-based greeting (morning / afternoon / evening)                                                          |
| **Form state**        | PartnerForm, Admin forms    | Controlled inputs, validation errors, submission state                                                       |

### No external state library

The architecture does not use Redux, Zustand, or Jotai. React 19's built-in primitives (`use`, `useFormStatus`, `useOptimistic`) plus Server Components cover all requirements.

---

## 10. Design Tokens Reference

The color palette and typography from `tailwind.config.ts`:

```
Colors:
  cream       #FDF8F3   -- page background
  espresso    #5D4037   -- primary brand (buttons, headings)
  espresso-light  #795548
  espresso-dark   #3E2723
  espresso-50     #EFEBE9
  caramel     #D4A574   -- accent (CTA, highlights)
  caramel-light   #E8C9A8
  caramel-dark    #B8834A
  chocolate   #2C1810   -- body text
  mint        #7CB69D   -- success, availability
  mint-light  #E8F5E9
  foam        #F5F0EB   -- subtle background

Fonts:
  display     Playfair Display (serif)  -- headings
  body        DM Sans (sans-serif)      -- everything else

Animations:
  fadeUp      0.6s   -- section entrance
  fadeIn      0.4s   -- general fade
  slideUp     0.3s   -- modal entrance
  expand      0.3s   -- accordion open
  bounceIn    0.4s   -- toast popup
```

---

## 11. File Structure

> Проект разделён на два приложения: `apps/site/` (сайт vendhub.uz) и `apps/web/` (admin panel).
> Ниже — site (секции 1-5 выше). Структуру admin panel см. в `apps/web/README.md`.

```
apps/site/                       # Landing site (vendhub.uz)
├── app/
│   ├── layout.tsx                  # RootLayout (fonts, meta, body)
│   ├── page.tsx                    # Landing page (Server Component)
│   └── globals.css                 # Tailwind directives + custom
├── components/
│   ├── landing/                    # Секции лендинга (Header, Hero, Menu...)
│   ├── modals/                     # ProductModal, MachineModal, ModalProvider
│   └── ui/                         # Button, Card, Pill, Modal, Badge...
├── lib/
│   ├── supabase/                   # SSR + browser clients
│   └── utils.ts                    # Форматирование, хелперы
├── tailwind.config.ts
└── next.config.ts

apps/web/                           # Admin panel (26 страниц)
├── app/
│   ├── (auth)/login/               # Вход
│   └── (dashboard)/                # 26 страниц (см. apps/web/README.md)
├── components/
│   ├── ui/                         # shadcn компоненты
│   ├── layout/                     # Sidebar, Header, SlideOver, PageHeader
│   └── shared/                     # StatusBadge, DataTable...
└── types/index.ts                  # TypeScript интерфейсы
```

---

_Last updated: 2026-03-02_
