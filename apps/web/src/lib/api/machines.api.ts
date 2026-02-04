/**
 * Machines API Client
 * API calls for vending machine management
 */

import { apiClient, buildQueryString } from './client';

const BASE_PATH = '/v1/machines';

interface MachineFilters {
  search?: string | null;
  status?: string | null;
  page?: number;
  limit?: number;
}

export const machinesApi = {
  /**
   * Get all machines with optional filters
   */
  getAll(filters?: MachineFilters) {
    const params: Record<string, unknown> = {};
    if (filters?.search) params.search = filters.search;
    if (filters?.status) params.status = filters.status;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    return apiClient.get(`${BASE_PATH}${buildQueryString(params)}`);
  },

  /**
   * Get machine by ID
   */
  getById(id: string) {
    return apiClient.get(`${BASE_PATH}/${id}`);
  },

  /**
   * Create a new machine
   */
  create(data: Record<string, unknown>) {
    return apiClient.post(BASE_PATH, data);
  },

  /**
   * Update a machine
   */
  update(id: string, data: Record<string, unknown>) {
    return apiClient.patch(`${BASE_PATH}/${id}`, data);
  },

  /**
   * Soft-delete a machine
   */
  delete(id: string) {
    return apiClient.delete(`${BASE_PATH}/${id}`);
  },

  /**
   * Get machine statistics (total, active, errors, needs attention)
   */
  getStats() {
    return apiClient.get(`${BASE_PATH}/stats`);
  },

  /**
   * Get machines map data (lightweight payload with coordinates and status)
   */
  getMap() {
    return apiClient.get(`${BASE_PATH}/map`);
  },
};

export default machinesApi;
