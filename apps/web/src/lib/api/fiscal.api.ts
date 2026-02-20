/**
 * Fiscal API Client
 * API calls for fiscal device management, receipts, and shifts
 */

import { apiClient } from './client';
import {
  FiscalDevice,
  FiscalShift,
  FiscalReceipt,
  FiscalQueueItem,
  CreateFiscalDeviceRequest,
  UpdateFiscalDeviceRequest,
  OpenShiftRequest,
  OpenShiftResponse,
  CloseShiftResponse,
  XReportResponse,
  CreateReceiptRequest,
  DeviceStatistics,
  FiscalReceiptFilters,
  FiscalReceiptsResponse,
  FiscalQueueStatus,
} from '@/types/fiscal.types';

const BASE_PATH = '/fiscal';

// ============================================
// Device Management
// ============================================

export const fiscalApi = {
  /**
   * Get all fiscal devices
   */
  async getDevices(): Promise<FiscalDevice[]> {
    const response = await apiClient.get(`${BASE_PATH}/devices`);
    return response.data;
  },

  /**
   * Get fiscal device by ID
   */
  async getDevice(deviceId: string): Promise<FiscalDevice> {
    const response = await apiClient.get(`${BASE_PATH}/devices/${deviceId}`);
    return response.data;
  },

  /**
   * Create new fiscal device
   */
  async createDevice(data: CreateFiscalDeviceRequest): Promise<FiscalDevice> {
    const response = await apiClient.post(`${BASE_PATH}/devices`, data);
    return response.data;
  },

  /**
   * Update fiscal device
   */
  async updateDevice(deviceId: string, data: UpdateFiscalDeviceRequest): Promise<FiscalDevice> {
    const response = await apiClient.put(`${BASE_PATH}/devices/${deviceId}`, data);
    return response.data;
  },

  /**
   * Activate fiscal device
   */
  async activateDevice(deviceId: string): Promise<FiscalDevice> {
    const response = await apiClient.post(`${BASE_PATH}/devices/${deviceId}/activate`);
    return response.data;
  },

  /**
   * Deactivate fiscal device
   */
  async deactivateDevice(deviceId: string): Promise<FiscalDevice> {
    const response = await apiClient.post(`${BASE_PATH}/devices/${deviceId}/deactivate`);
    return response.data;
  },

  /**
   * Get device statistics
   */
  async getDeviceStatistics(deviceId: string): Promise<DeviceStatistics> {
    const response = await apiClient.get(`${BASE_PATH}/devices/${deviceId}/stats`);
    return response.data;
  },

  // ============================================
  // Shift Management
  // ============================================

  /**
   * Open fiscal shift
   */
  async openShift(deviceId: string, data: OpenShiftRequest): Promise<OpenShiftResponse> {
    const response = await apiClient.post(`${BASE_PATH}/devices/${deviceId}/shift/open`, data);
    return response.data;
  },

  /**
   * Close fiscal shift (Z-report)
   */
  async closeShift(deviceId: string): Promise<CloseShiftResponse> {
    const response = await apiClient.post(`${BASE_PATH}/devices/${deviceId}/shift/close`);
    return response.data;
  },

  /**
   * Get current open shift
   */
  async getCurrentShift(deviceId: string): Promise<FiscalShift | null> {
    const response = await apiClient.get(`${BASE_PATH}/devices/${deviceId}/shift/current`);
    return response.data;
  },

  /**
   * Get shift history
   */
  async getShiftHistory(deviceId: string, limit = 30): Promise<FiscalShift[]> {
    const response = await apiClient.get(`${BASE_PATH}/devices/${deviceId}/shift/history`, {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get X-report (intermediate report)
   */
  async getXReport(deviceId: string): Promise<XReportResponse> {
    const response = await apiClient.get(`${BASE_PATH}/devices/${deviceId}/shift/x-report`);
    return response.data;
  },

  // ============================================
  // Receipt Operations
  // ============================================

  /**
   * Create fiscal receipt
   */
  async createReceipt(data: CreateReceiptRequest): Promise<FiscalReceipt> {
    const response = await apiClient.post(`${BASE_PATH}/receipts`, data);
    return response.data;
  },

  /**
   * Get receipt by ID
   */
  async getReceipt(receiptId: string): Promise<FiscalReceipt> {
    const response = await apiClient.get(`${BASE_PATH}/receipts/${receiptId}`);
    return response.data;
  },

  /**
   * Get receipts with filters
   */
  async getReceipts(filters: FiscalReceiptFilters): Promise<FiscalReceiptsResponse> {
    const response = await apiClient.get(`${BASE_PATH}/receipts`, { params: filters });
    return response.data;
  },

  // ============================================
  // Queue Management
  // ============================================

  /**
   * Get queue items
   */
  async getQueueItems(status?: FiscalQueueStatus): Promise<FiscalQueueItem[]> {
    const response = await apiClient.get(`${BASE_PATH}/queue`, {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  /**
   * Retry queue item
   */
  async retryQueueItem(queueItemId: string): Promise<void> {
    await apiClient.post(`${BASE_PATH}/queue/${queueItemId}/retry`);
  },
};

export default fiscalApi;
