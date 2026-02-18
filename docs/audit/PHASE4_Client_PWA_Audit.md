# Phase 4: Client PWA Audit — Report

**Date:** 2025-02-17

## Summary

- **22 pages** in `apps/client/src/pages/`: HomePage, MapPage, MachineDetailPage, MenuPage, ComplaintPage, QRScanPage, TransactionHistoryPage, TransactionDetailPage, ProfilePage, NotFoundPage, LoyaltyPage, FavoritesPage, CartPage, CheckoutPage, QuestsPage, ReferralsPage, AchievementsPage, PromoCodePage, OrderSuccessPage, DrinkDetailPage, HelpPage, NotificationSettingsPage.
- **Build:** OK (Vite, PWA plugin; chunk size warning >500 kB).
- **Routing:** All pages wired in `App.tsx` under `<Layout>`; public routes (/, map, machine/:id, menu/:machineId, complaint/\*); protected routes (transactions, transaction/:id, profile, loyalty, favorites, cart, checkout, quests, referrals, achievements, promo, order-success, drink/:id, help, notifications) wrapped in `<ProtectedRoute>`.
- **Auth:** `ProtectedRoute` uses `useUserStore().isAuthenticated`; redirects to `/` with state when not authenticated.
- **PWA:** manifest and Service Worker generated (Workbox); precache 5 entries.

## Gaps / Improvements

1. **Lazy loading:** All pages imported directly; consider React.lazy for route-level code splitting to reduce initial bundle.
2. **i18n:** Verify all user-facing strings use i18n (uz, ru, en).
3. **Offline:** PWA has SW; confirm offline fallback and error handling for API failures.

## Next

- Phase 5 (Mobile).
