import { Context, NarrowedContext } from 'telegraf';
import { Update } from 'telegraf/types';

// ============================================
// Session Data
// ============================================

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface SessionData {
  step?: SessionStep;
  data?: Record<string, any>;
  machineId?: string;
  cart?: CartItem[];
  selectedProductId?: string;
  language?: 'ru' | 'uz' | 'en';
  lastActivity?: number;
}

export type SessionStep =
  | 'awaiting_location'
  | 'awaiting_phone'
  | 'awaiting_feedback'
  | 'awaiting_complaint'
  | 'awaiting_product_quantity'
  | 'confirming_order'
  | 'trip_active'
  | 'trip_selecting_vehicle'
  | 'trip_selecting_route'
  | undefined;

// ============================================
// Bot Context
// ============================================

export interface BotContext extends Context {
  session: SessionData;
  match?: RegExpExecArray;
}

// Narrowed contexts for specific handlers
export type BotCallbackContext = NarrowedContext<BotContext, Update.CallbackQueryUpdate>;
export type BotMessageContext = NarrowedContext<BotContext, Update.MessageUpdate>;

// ============================================
// API Response Types
// ============================================

export interface User {
  id: string;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  referralCode?: string;
  referralsCount?: number;
  createdAt: string;
}

export interface Machine {
  id: string;
  name: string;
  serialNumber: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  status: 'online' | 'offline' | 'maintenance';
  distance?: number;
  productsCount?: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  category: string;
  inStock: boolean;
  stockQuantity: number;
}

export interface LoyaltyInfo {
  points: number;
  lifetimePoints: number;
  tier: 'basic' | 'silver' | 'gold' | 'platinum';
  tierName: string;
  cashbackPercent: number;
  pointsToNextTier: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  reward: number;
  progress: number;
  target: number;
  completed: boolean;
  expiresAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  pointsEarned: number;
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

// ============================================
// Trip Types
// ============================================

export interface Trip {
  id: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  driverName?: string;
  vehiclePlate?: string;
  routeName?: string;
  routeId?: string;
  startedAt?: string;
  completedAt?: string;
  stopsTotal: number;
  stopsCompleted: number;
  distance?: number;
  anomaliesCount: number;
  points: TripPoint[];
}

export interface TripPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  accuracy?: number;
}

export interface TripStop {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  sequence: number;
  status: 'pending' | 'arrived' | 'completed' | 'skipped';
  arrivedAt?: string;
  completedAt?: string;
  taskType?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  status: 'available' | 'in_use' | 'maintenance';
}

export interface RouteInfo {
  id: string;
  name: string;
  stopsCount: number;
  estimatedDistance?: number;
  status: string;
}

// ============================================
// Config
// ============================================

export interface BotConfig {
  botToken: string;
  apiUrl: string;
  redisUrl: string;
  miniAppUrl: string;
  webhookDomain: string;
  webhookPath: string;
  port: number;
  supportUsername: string;
  supportEmail: string;
  supportPhone: string;
}
