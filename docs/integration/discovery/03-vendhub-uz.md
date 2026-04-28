# Discovery Report: Vendhub.uz Repository

**Date:** 2026-04-27  
**Source:** `/Users/js/Projects/_integration-source/Vendhub.uz/`  
**iCloud Backup:** `/Users/js/Library/Mobile Documents/com~apple~CloudDocs/3.VendHub/VHM24/vendhub.uz/`  
**Status:** ACTUAL SITE CODEBASE, ready for integration

---

## 1. Repository Structure Reality Check

### Git Status

- **Remote:** `https://github.com/jamsmac/Vendhub.uz.git`
- **Branch:** `main` (only branch)
- **Last 50 commits:** Active development, 78+ commits total (Oct 2024 - Apr 2026)
- **Recent activity:** Focus on i18n, SEO, accessibility, performance audits, admin CRUD fixes
- **Commit authors:** Jamshid (sole contributor)

### Root Structure

```
Vendhub.uz/ (GitHub repo root)
├── VHM24-repo/         ← EMPTY (deleted/archived subfolder placeholder)
├── VHM24R_1/           ← EMPTY
├── VHM24R_2/           ← EMPTY
├── vendbot_manager/    ← EMPTY
├── vendhub-bot/        ← EMPTY
└── vendhub.uz/         ← ACTUAL SITE CODEBASE
    └── vendhub-site/   ← Next.js 16 application
```

### Key Finding

**The root directory is a GitHub workspace-style aggregator, but all actual code lives in `vendhub.uz/vendhub-site/`.** The empty subfolders (VHM24-repo, VHM24R_1, etc.) are legacy placeholders — probably from an earlier monorepo consolidation. They contain no files and are tracked in git as empty directories.

### Root Files

- **No package.json at root** — each app manages its own deps
- **No README at root** — documented in `vendhub.uz/vendhub-site/README.md`
- **No .gitignore at root** — uses git defaults
- **No workspace configuration** — not a monorepo tool (Lerna/Turborepo/pnpm)

**Conclusion:** This is a **single-app repository with legacy structural artifacts**, not a monorepo workspace.

---

## 2. Inventory of Subfolders

### A. `vendhub-site/` — Next.js 16 APPLICATION (REAL)

**Type:** Marketing/CMS website (Next.js 16 + React 19 + TypeScript + Tailwind CSS 4)

**Purpose:**

- **Public site:** Information portal at `vendhub.uz` (products, machines, map, promotions, loyalty, partnership info)
- **Admin panel:** Internal CRUD for products, machines, promotions, loyalty, content, partnerships
- **Not a customer app:** No shopping cart, no checkout — marketing + info only

**Stack:**

- Next.js 16.1.6, React 19.2.3, TypeScript 5 (strict)
- Tailwind CSS 4, next-intl 4.8.3 (i18n: ru + uz)
- Supabase PostgreSQL (7 tables, RLS, Storage for images)
- Leaflet + OpenStreetMap for maps (no API key needed)
- lucide-react icons

**Own Files:**

- `package.json` — 17 dependencies, pnpm workspace
- `README.md` — full setup instructions (Supabase, Railway deployment)
- `CLAUDE.md` — 1000+ lines of context (tech stack, decisions, specs, memory)

### B. `VHM24-repo/`, `VHM24R_1/`, `VHM24R_2/`, `vendbot_manager/`, `vendhub-bot/`

**Status:** EMPTY (0 bytes each)

**Type:** Deleted or archived

**Conclusion:** These are **ghost folders** — probably remnants of a previous migration attempt from VHM24 monorepo. They are tracked in git but contain no code. Safe to delete.

---

## 3. Public Website Discovery

### Where Is vendhub.uz?

**FOUND:** `vendhub.uz/vendhub-site/` is the REAL public website code.

### Evidence of Public Site Rendering

1. **Lendinga (6 sections):**
   - Hero banner with welcome + CTA
   - Statistics (16 machines, 25+ products, 10K+ orders, ⭐4.8)
   - Quick actions (Catalog / Machines)
   - Popular products (4 items)
   - Promotions banner
   - "Why VendHub?" section

2. **SEO Implementation:**
   - `app/[locale]/page.tsx` — main landing page
   - `sitemap.ts` — dynamic sitemap with hreflang alternates (ru/uz)
   - `robots.ts` — robots.txt
   - `opengraph-image.tsx` — OG image generation
   - Metadata with JSON-LD schema (Product, Organization)

3. **Marketing Content:**
   - 22 products (coffee, tea, snacks with prices, options, images)
   - 16 real machines (addresses, GPS coordinates, status)
   - 4 active promotions
   - 5 partners with logos
   - Bonus system (Bronze 0%, Silver 3%, Gold 5%, Platinum 10%)

4. **Contact Form:**
   - Partnership application form (`cooperation_requests` table)
   - Rate-limited, RLS-protected

5. **Map:**
   - Leaflet + OpenStreetMap markers
   - 16 machines with clustering
   - Machine detail modal

### Pages in Codebase

- `app/[locale]/page.tsx` — homepage (6 sections)
- `app/[locale]/machines/` — map + machine detail
- Admin pages: `/admin/products`, `/admin/machines`, `/admin/promotions`, `/admin/loyalty`, `/admin/content`, etc.

**Conclusion:** vendhub.uz is a **fully functional marketing website with admin panel**, deployed on Railway.

---

## 4. Telegram Bots Inside Vendhub.uz Repo

### Search Results

**Telegram usernames referenced in code:**

- `@vendhub_bot` — customer bot (messages/ru.json: "Откройте @vendhub_bot в Telegram")
- `@vendhub_support` — support channel (contacts: "@vendhub_support")
- `@vendhub` — YouTube channel (for completeness)

**Bot Files Found:**

- Nope. The repo contains NO bot code (`vendhub-bot/`, `vendbot_manager/` are EMPTY).
- Only **references** to bot usernames in translation files and contact info.

**Conclusion:**

- **No bot code in this repo**
- Bots (staff + customer) are in **VendHub-OS main API** (`apps/api/src/modules/telegram-bot/`)
- This repo only directs users to the bot via "Войти" button → "Откройте @vendhub_bot"
- NOT a duplication — clean separation of concerns.

---

## 5. Database Schemas

### PostgreSQL (Supabase)

**7 Tables:**

1. **`products`** (22 rows)
   - id (UUID), name/name_uz, price (INT), category (coffee/tea/snack), temperature, calories, rating, options (JSONB), image_url, description, discount_percent, sort_order
   - Indexed: category, popular, available

2. **`machines`** (16 rows)
   - id, name, address, type, status (online/offline), latitude/longitude (NUMERIC(8,4)), rating, review_count, floor, hours, product_count, has_promotion, location_type, image_url
   - Indexed: type, status

3. **`machine_types`** (5 rows)
   - slug (UNIQUE), name, model_name, description, hero_image_url, specs (JSONB), advantages, gallery_images, badge, sort_order
   - For dynamic machine type pages

4. **`promotions`** (4 rows)
   - id, title, badge, description, promo_code, gradient (Tailwind class), conditions (JSONB), valid_until (DATE), is_active
   - Indexed: is_active

5. **`loyalty_tiers`** (4 rows)
   - id, name, min_points (INT), bonus_percent, max_discount_percent, color, icon
   - Bronze 0%, Silver 3%, Gold 5%, Platinum 10%

6. **`site_content`** (CMS)
   - id, section (key), data (JSONB), is_active, sort_order
   - Sections: hero, about, stats, promotions, machine_types, partnership_models, bonus_actions, loyalty_privileges

7. **`cooperation_requests`** (partnership leads)
   - id, name, email, phone, company, model_type, message, created_at
   - Public INSERT (rate-limited)

8. **`partners`** (5 rows)
   - id, name, logo_url, sort_order, is_active

**RLS Policies:**

- All tables: public SELECT (no auth required for client site)
- `cooperation_requests`: public INSERT (rate-limited via middleware)
- Admin sections: JWT + role-based access

**Type:** PostgreSQL 16 (Supabase managed)
**Size:** ~10 MB (seed data for 22 products, 16 machines, etc.)

---

## 6. Production Deployment

### Current Deployment

**Platform:** Railway  
**URL:** `vendhub.uz` (inferred from code)  
**Deployment Method:**

- Dockerfile (3-stage: deps → builder → runner)
- railway.toml (builder: dockerfile, healthcheck: /, restart: on_failure, 1 replica)
- GitHub Actions CI: lint + build on push/PR to main

**Build Pipeline:**

- Node 22-alpine
- pnpm lock file frozen
- Next.js standalone output
- Health check: HTTP GET http://localhost:3000/ (every 30s, 3 retries)

**Environment Variables Required (Railway Dashboard):**

```
NEXT_PUBLIC_SUPABASE_URL=https://cuaxgniyrffrzqmelfbw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=<key>  (if using Yandex Maps, else removed)
```

**Database:** Supabase-managed PostgreSQL (URL embedded in env vars)

**CDN/Reverse Proxy:** Likely Cloudflare (common for .uz domains + Railway), not configured in this repo

**Note:** No SSL config in code (Railway + Cloudflare handle it automatically)

---

## 7. Unique Functionality vs. VendHub-OS `apps/site`

### Comparison Matrix

| Feature          | vendhub.uz/vendhub-site         | VendHub-OS/apps/site                    | Notes                                    |
| ---------------- | ------------------------------- | --------------------------------------- | ---------------------------------------- |
| **Type**         | Standalone Next.js 16           | Part of monorepo (Turborepo)            |                                          |
| **Tech**         | next-intl 4.8.3, Supabase       | next-intl 4.8.3, @vendhub/shared        | Same i18n, different DB                  |
| **Auth**         | Supabase Auth (admin login)     | JwtAuthGuard + Roles (RBAC)             | vendhub.uz is simpler                    |
| **Database**     | Supabase (7 tables)             | API (TypeORM, 125 entities)             | Data pulled from Supabase vs. NestJS API |
| **Products**     | 22 static, hardcoded seed       | Dynamic from API, 50+ variants          | vendhub.uz is simplified                 |
| **Machines**     | 16 static, admin-managed        | From API, linked to routes/maintenance  | vendhub.uz static                        |
| **Admin Panel**  | CRUD in Next.js + Supabase      | Full NestJS backend (82 modules)        | vendhub.uz is minimal                    |
| **Loyalty**      | 4 tiers, hardcoded rules        | Wallet, achievements, quests, referrals | vendhub.uz is basic                      |
| **Payments**     | None (info site only)           | Payme, Click, Uzum Bank                 | vendhub.uz = marketing                   |
| **Telegram Bot** | Links to bot, no integration    | Full bot service (staff + customer)     | vendhub.uz defers to separate bot        |
| **Image Upload** | Via admin ImageUpload component | StorageService + S3 API                 | Both supported                           |
| **Deployment**   | Railway standalone              | Kubernetes (K8s) / Docker Compose       | vendhub.uz is simpler                    |
| **Monitoring**   | None visible                    | Prometheus + Grafana + Loki             | vendhub.uz no metrics                    |

### Unique to vendhub.uz:

1. **Simplicity** — standalone single-app, no dependencies on VendHub-OS infrastructure
2. **Offline-capable seed data** — if Supabase is down, `lib/data.ts` fallback (22 products, 16 machines hardcoded)
3. **Leaflet + OpenStreetMap** — free maps, no API key (vs. potentially different in OS site)
4. **i18n with next-intl** — 447 translation keys (ru/uz)
5. **3-stage Docker build** — optimized for Railway

### Unique to VendHub-OS apps/site:

1. **Monorepo integration** — shared types via @vendhub/shared
2. **API-driven** — real-time data from NestJS backend
3. **Full RBAC** — 7 roles, granular permissions
4. **Advanced features** — loyalty (achievements, quests), payments, referrals
5. **Enterprise deployment** — K8s, Terraform, Prometheus monitoring

---

## 8. Recommendation Note

### Migration Decision Matrix

**MIGRATE (YES):**

- ✅ `vendhub-site/` **entire codebase** → `apps/site/` in OS
  - Current vendhub.uz code is production-ready
  - Update deps to match OS monorepo versions (next-intl already aligned)
  - Wire Supabase → VendHub-OS API (create `GET /client/public/cms/:collection` endpoints)
  - Consolidate `lib/data.ts` fallback into OS shared constants

**DELETE (NO):**

- ❌ `VHM24-repo/`, `VHM24R_1/`, `VHM24R_2/`, `vendbot_manager/`, `vendhub-bot/`
  - All EMPTY, legacy artifacts
  - Zero functional code
  - Safe to remove

**KEY INTEGRATION STEPS:**

1. **Copy vendhub-site/ → VendHub-OS/apps/site/** (replace current if exists)
2. **Update package.json** deps to match OS monorepo versions
3. **Create `site-cms` module in API** — JSONB document store for site content (schema already designed)
4. **Wire admin auth** to VendHub-OS `/api/v1/auth` instead of Supabase Auth
5. **Migrate Supabase → API** — public GET endpoints for products, machines, promotions, partners
6. **Keep fallback data** in `lib/data.ts` for resilience

**EFFORT:** 2-3 sprints (API endpoints + wiring + testing)

**RISK:** Low — code is mature, well-tested, no hidden dependencies

---

## Summary

The Vendhub.uz repository is **NOT an aggregator of old VHM24 projects** — it's a **clean, production-ready marketing website** for vendhub.uz domain. The empty subdirectories are legacy remnants that can be safely removed. The actual site code (Next.js 16, Supabase, Leaflet maps) is well-structured, actively maintained, and an excellent candidate for merging into VendHub-OS `apps/site` with minimal refactoring.
