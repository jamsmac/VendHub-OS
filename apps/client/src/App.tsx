import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { Layout } from "./components/layout/Layout";
import { useUserStore } from "./lib/store";
import { useTelegramAuth } from "./hooks/useTelegramAuth";

// Eager: landing + core shell (always needed)
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";

// Lazy: all other pages (code-split per route)
const MapPage = lazy(() =>
  import("./pages/MapPage").then((m) => ({ default: m.MapPage })),
);
const MachineDetailPage = lazy(() =>
  import("./pages/MachineDetailPage").then((m) => ({
    default: m.MachineDetailPage,
  })),
);
const MenuPage = lazy(() =>
  import("./pages/MenuPage").then((m) => ({ default: m.MenuPage })),
);
const ComplaintPage = lazy(() =>
  import("./pages/ComplaintPage").then((m) => ({ default: m.ComplaintPage })),
);
const QRScanPage = lazy(() =>
  import("./pages/QRScanPage").then((m) => ({ default: m.QRScanPage })),
);
const TransactionHistoryPage = lazy(() =>
  import("./pages/TransactionHistoryPage").then((m) => ({
    default: m.TransactionHistoryPage,
  })),
);
const TransactionDetailPage = lazy(() =>
  import("./pages/TransactionDetailPage").then((m) => ({
    default: m.TransactionDetailPage,
  })),
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const LoyaltyPage = lazy(() =>
  import("./pages/LoyaltyPage").then((m) => ({ default: m.LoyaltyPage })),
);
const FavoritesPage = lazy(() =>
  import("./pages/FavoritesPage").then((m) => ({ default: m.FavoritesPage })),
);
const CartPage = lazy(() =>
  import("./pages/CartPage").then((m) => ({ default: m.CartPage })),
);
const CheckoutPage = lazy(() =>
  import("./pages/CheckoutPage").then((m) => ({ default: m.CheckoutPage })),
);
const QuestsPage = lazy(() =>
  import("./pages/QuestsPage").then((m) => ({ default: m.QuestsPage })),
);
const ReferralsPage = lazy(() =>
  import("./pages/ReferralsPage").then((m) => ({ default: m.ReferralsPage })),
);
const AchievementsPage = lazy(() =>
  import("./pages/AchievementsPage").then((m) => ({
    default: m.AchievementsPage,
  })),
);
const PromoCodePage = lazy(() =>
  import("./pages/PromoCodePage").then((m) => ({ default: m.PromoCodePage })),
);
const OrderSuccessPage = lazy(() =>
  import("./pages/OrderSuccessPage").then((m) => ({
    default: m.OrderSuccessPage,
  })),
);
const DrinkDetailPage = lazy(() =>
  import("./pages/DrinkDetailPage").then((m) => ({
    default: m.DrinkDetailPage,
  })),
);
const HelpPage = lazy(() =>
  import("./pages/HelpPage").then((m) => ({ default: m.HelpPage })),
);
const NotificationSettingsPage = lazy(() =>
  import("./pages/NotificationSettingsPage").then((m) => ({
    default: m.NotificationSettingsPage,
  })),
);

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

/**
 * Protected route wrapper - redirects to home with auth message if not authenticated
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useUserStore();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("Для доступа необходимо войти в аккаунт", {
        duration: 4000,
      });
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

function App() {
  // Auto-authenticate when running inside Telegram WebApp
  useTelegramAuth();

  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Public routes */}
            <Route index element={<HomePage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="machine/:id" element={<MachineDetailPage />} />
            <Route path="menu/:machineId" element={<MenuPage />} />
            <Route path="complaint/:machineId" element={<ComplaintPage />} />
            <Route path="complaint/code/:code" element={<ComplaintPage />} />

            {/* Protected routes */}
            <Route
              path="transactions"
              element={
                <ProtectedRoute>
                  <TransactionHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="transaction/:id"
              element={
                <ProtectedRoute>
                  <TransactionDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="loyalty"
              element={
                <ProtectedRoute>
                  <LoyaltyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="favorites"
              element={
                <ProtectedRoute>
                  <FavoritesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="cart"
              element={
                <ProtectedRoute>
                  <CartPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="checkout"
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="quests"
              element={
                <ProtectedRoute>
                  <QuestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="referrals"
              element={
                <ProtectedRoute>
                  <ReferralsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="achievements"
              element={
                <ProtectedRoute>
                  <AchievementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="promo-code"
              element={
                <ProtectedRoute>
                  <PromoCodePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="order-success/:orderId"
              element={
                <ProtectedRoute>
                  <OrderSuccessPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="drink/:machineId/:productId"
              element={<DrinkDetailPage />}
            />
            <Route path="help" element={<HelpPage />} />
            <Route
              path="notification-settings"
              element={
                <ProtectedRoute>
                  <NotificationSettingsPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
          {/* Full screen routes */}
          <Route path="scan" element={<QRScanPage />} />
        </Routes>
      </Suspense>
      <Toaster richColors position="top-center" />
    </>
  );
}

export default App;
