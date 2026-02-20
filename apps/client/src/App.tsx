import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { MapPage } from './pages/MapPage';
import { MachineDetailPage } from './pages/MachineDetailPage';
import { MenuPage } from './pages/MenuPage';
import { ComplaintPage } from './pages/ComplaintPage';
import { QRScanPage } from './pages/QRScanPage';
import { TransactionHistoryPage } from './pages/TransactionHistoryPage';
import { TransactionDetailPage } from './pages/TransactionDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { LoyaltyPage } from './pages/LoyaltyPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { QuestsPage } from './pages/QuestsPage';
import { ReferralsPage } from './pages/ReferralsPage';
import { useUserStore } from './lib/store';

/**
 * Protected route wrapper - redirects to home if not authenticated
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useUserStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <>
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
          <Route path="transactions" element={<ProtectedRoute><TransactionHistoryPage /></ProtectedRoute>} />
          <Route path="transaction/:id" element={<ProtectedRoute><TransactionDetailPage /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="loyalty" element={<ProtectedRoute><LoyaltyPage /></ProtectedRoute>} />
          <Route path="favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
          <Route path="cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
          <Route path="checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="quests" element={<ProtectedRoute><QuestsPage /></ProtectedRoute>} />
          <Route path="referrals" element={<ProtectedRoute><ReferralsPage /></ProtectedRoute>} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
        {/* Full screen routes */}
        <Route path="scan" element={<QRScanPage />} />
      </Routes>
      <Toaster richColors position="top-center" />
    </>
  );
}

export default App;
