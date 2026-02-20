/**
 * Global State Management with Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// Cart Store
// ============================================

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  category?: string;
  stock?: number;
}

export interface CartMachine {
  id: string;
  name: string;
  address: string;
}

interface CartState {
  items: CartItem[];
  machine: CartMachine | null;

  // Actions
  setMachine: (machine: CartMachine) => void;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;

  // Computed
  getTotalItems: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      machine: null,

      setMachine: (machine) => {
        const currentMachine = get().machine;
        // If switching machines, clear cart
        if (currentMachine && currentMachine.id !== machine.id) {
          set({ items: [], machine });
        } else {
          set({ machine });
        }
      },

      addItem: (item) => {
        const items = get().items;
        const existingItem = items.find((i) => i.productId === item.productId);

        if (existingItem) {
          set({
            items: items.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          });
        } else {
          set({
            items: [...items, { ...item, id: crypto.randomUUID(), quantity: 1 }],
          });
        }
      },

      removeItem: (itemId) => {
        set({ items: get().items.filter((i) => i.id !== itemId) });
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.id === itemId ? { ...i, quantity: Math.min(quantity, 10) } : i
          ),
        });
      },

      clearCart: () => {
        set({ items: [], machine: null });
      },

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      },
    }),
    {
      name: 'vendhub-cart',
      partialize: (state) => ({
        items: state.items,
        machine: state.machine,
      }),
    }
  )
);

// ============================================
// User Store
// ============================================

export interface User {
  id: string;
  telegramId?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  phone?: string;
  loyaltyPoints?: number;
  loyaltyTier?: string;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => {
        set({ user, isAuthenticated: !!user, isLoading: false });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'vendhub-user',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================
// UI Store
// ============================================

interface UIState {
  theme: 'light' | 'dark' | 'system';
  language: 'ru' | 'uz' | 'en';
  notificationsEnabled: boolean;

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'ru' | 'uz' | 'en') => void;
  setNotifications: (enabled: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'ru',
      notificationsEnabled: true,

      setTheme: (theme) => {
        set({ theme });
        // Apply theme
        if (theme === 'system') {
          const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.toggle('dark', systemDark);
        } else {
          document.documentElement.classList.toggle('dark', theme === 'dark');
        }
      },

      setLanguage: (language) => {
        set({ language });
        // Sync with i18next
        import('../i18n').then((mod) => mod.default.changeLanguage(language));
      },

      setNotifications: (notificationsEnabled) => {
        set({ notificationsEnabled });
      },
    }),
    {
      name: 'vendhub-ui',
    }
  )
);

// ============================================
// Geolocation Store
// ============================================

interface GeolocationState {
  position: {
    latitude: number;
    longitude: number;
  } | null;
  error: string | null;
  isLoading: boolean;

  // Actions
  setPosition: (position: { latitude: number; longitude: number } | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  requestLocation: () => void;
}

export const useGeolocationStore = create<GeolocationState>((set) => ({
  position: null,
  error: null,
  isLoading: false,

  setPosition: (position) => {
    set({ position, error: null, isLoading: false });
  },

  setError: (error) => {
    set({ error, isLoading: false });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  requestLocation: () => {
    set({ isLoading: true, error: null });

    if (!navigator.geolocation) {
      set({ error: 'Геолокация не поддерживается', isLoading: false });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set({
          position: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          },
          isLoading: false,
        });
      },
      (err) => {
        let errorMessage = 'Ошибка геолокации';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Доступ к геолокации запрещён';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Местоположение недоступно';
            break;
          case err.TIMEOUT:
            errorMessage = 'Время ожидания истекло';
            break;
        }
        set({ error: errorMessage, isLoading: false });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  },
}));
