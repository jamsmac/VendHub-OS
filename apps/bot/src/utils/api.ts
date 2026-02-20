import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { User, Machine, LoyaltyInfo, Quest, Order, Product, Trip, TripPoint, TripStop, Vehicle, RouteInfo } from '../types';

// ============================================
// API Client
// ============================================

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add any auth headers if needed
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // ============================================
  // User Methods
  // ============================================

  async getUserByTelegramId(telegramId: number): Promise<User | null> {
    try {
      const response = await this.client.get<User>(`/users/telegram/${telegramId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  async registerUser(
    telegramId: number,
    username?: string,
    firstName?: string,
    lastName?: string
  ): Promise<User | null> {
    try {
      const response = await this.client.post<User>('/auth/telegram/register', {
        telegramId,
        username,
        firstName,
        lastName,
      });
      return response.data;
    } catch (error) {
      console.error('Error registering user:', error);
      return null;
    }
  }

  async updateUserPhone(userId: string, phone: string): Promise<User | null> {
    try {
      const response = await this.client.patch<User>(`/users/${userId}`, { phone });
      return response.data;
    } catch (error) {
      console.error('Error updating user phone:', error);
      return null;
    }
  }

  async updateNotificationSettings(userId: string, enabled: boolean): Promise<boolean> {
    try {
      await this.client.patch(`/users/${userId}/notifications`, { enabled });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // Machine Methods
  // ============================================

  async getNearbyMachines(lat: number, lng: number, radius: number = 5000): Promise<Machine[]> {
    try {
      const response = await this.client.get<Machine[]>('/machines/nearby', {
        params: { lat, lng, radius },
      });
      return response.data;
    } catch {
      return [];
    }
  }

  async getMachine(machineId: string): Promise<Machine | null> {
    try {
      const response = await this.client.get<Machine>(`/machines/${machineId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  async getMachineProducts(machineId: string): Promise<Product[]> {
    try {
      const response = await this.client.get<Product[]>(`/machines/${machineId}/products`);
      return response.data;
    } catch {
      return [];
    }
  }

  // ============================================
  // Loyalty Methods
  // ============================================

  async getUserLoyalty(userId: string): Promise<LoyaltyInfo | null> {
    try {
      const response = await this.client.get<LoyaltyInfo>(`/loyalty/users/${userId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  async redeemPoints(userId: string, points: number): Promise<boolean> {
    try {
      await this.client.post(`/loyalty/users/${userId}/redeem`, { points });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // Quest Methods
  // ============================================

  async getUserQuests(userId: string): Promise<Quest[]> {
    try {
      const response = await this.client.get<Quest[]>(`/quests/users/${userId}`);
      return response.data;
    } catch {
      return [];
    }
  }

  async getActiveQuests(): Promise<Quest[]> {
    try {
      const response = await this.client.get<Quest[]>('/quests/active');
      return response.data;
    } catch {
      return [];
    }
  }

  // ============================================
  // Order Methods
  // ============================================

  async getUserOrders(userId: string, limit: number = 10): Promise<Order[]> {
    try {
      const response = await this.client.get<Order[]>(`/orders/users/${userId}`, {
        params: { limit },
      });
      return response.data;
    } catch {
      return [];
    }
  }

  async createOrder(
    userId: string,
    machineId: string,
    items: { productId: string; quantity: number }[]
  ): Promise<Order | null> {
    try {
      const response = await this.client.post<Order>('/orders', {
        userId,
        machineId,
        items,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      return null;
    }
  }

  // ============================================
  // Referral Methods
  // ============================================

  async applyReferralCode(userId: string, referralCode: string): Promise<boolean> {
    try {
      await this.client.post(`/referrals/apply`, {
        userId,
        referralCode,
      });
      return true;
    } catch {
      return false;
    }
  }

  async getReferralStats(userId: string): Promise<{ count: number; earned: number } | null> {
    try {
      const response = await this.client.get(`/referrals/users/${userId}/stats`);
      return response.data;
    } catch {
      return null;
    }
  }

  // ============================================
  // Complaint Methods
  // ============================================

  async createComplaint(
    userId: string,
    machineId: string | null,
    type: string,
    message: string
  ): Promise<boolean> {
    try {
      await this.client.post('/complaints', {
        userId,
        machineId,
        type,
        message,
      });
      return true;
    } catch (error) {
      console.error('Error creating complaint:', error);
      return false;
    }
  }

  // ============================================
  // Trip Methods
  // ============================================

  async getActiveTrip(userId: string): Promise<Trip | null> {
    try {
      const response = await this.client.get<Trip>(`/trips/active`, {
        params: { userId },
      });
      return response.data;
    } catch {
      return null;
    }
  }

  async getUserTrips(userId: string, limit: number = 10): Promise<Trip[]> {
    try {
      const response = await this.client.get<Trip[]>(`/trips`, {
        params: { userId, limit },
      });
      return response.data;
    } catch {
      return [];
    }
  }

  async startTrip(
    userId: string,
    vehicleId: string,
    routeId?: string
  ): Promise<Trip | null> {
    try {
      const response = await this.client.post<Trip>('/trips', {
        userId,
        vehicleId,
        routeId,
      });
      return response.data;
    } catch (error) {
      console.error('Error starting trip:', error);
      return null;
    }
  }

  async endTrip(tripId: string): Promise<Trip | null> {
    try {
      const response = await this.client.post<Trip>(`/trips/${tripId}/end`);
      return response.data;
    } catch (error) {
      console.error('Error ending trip:', error);
      return null;
    }
  }

  async addTripPoint(
    tripId: string,
    latitude: number,
    longitude: number,
    speed?: number,
    accuracy?: number
  ): Promise<boolean> {
    try {
      await this.client.post(`/trips/${tripId}/points`, {
        latitude,
        longitude,
        speed,
        accuracy,
        timestamp: new Date().toISOString(),
      });
      return true;
    } catch {
      return false;
    }
  }

  async getTripStops(tripId: string): Promise<TripStop[]> {
    try {
      const response = await this.client.get<TripStop[]>(`/trips/${tripId}/stops`);
      return response.data;
    } catch {
      return [];
    }
  }

  async completeStop(tripId: string, stopId: string): Promise<boolean> {
    try {
      await this.client.post(`/trips/${tripId}/stops/${stopId}/complete`);
      return true;
    } catch {
      return false;
    }
  }

  async getAvailableVehicles(organizationId?: string): Promise<Vehicle[]> {
    try {
      const response = await this.client.get<Vehicle[]>('/vehicles', {
        params: { status: 'available', organizationId },
      });
      return response.data;
    } catch {
      return [];
    }
  }

  async getAvailableRoutes(organizationId?: string): Promise<RouteInfo[]> {
    try {
      const response = await this.client.get<RouteInfo[]>('/routes', {
        params: { status: 'planned', organizationId },
      });
      return response.data;
    } catch {
      return [];
    }
  }

  // ============================================
  // Feedback Methods
  // ============================================

  async submitFeedback(
    userId: string,
    orderId: string | null,
    rating: number,
    comment: string
  ): Promise<boolean> {
    try {
      await this.client.post('/feedback', {
        userId,
        orderId,
        rating,
        comment,
      });
      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return false;
    }
  }
}

// Export singleton instance
export const api = new ApiClient();
export default api;
