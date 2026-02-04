import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  MultiKassaReceiptItem,
  MultiKassaReceiptResponse,
} from '../../integrations/templates/multikassa.template';

export interface MultiKassaCredentials {
  login: string;
  password: string;
  companyTin: string;
  defaultCashier?: string;
}

export interface MultiKassaConfig {
  baseUrl: string;
  sandboxMode: boolean;
  credentials: MultiKassaCredentials;
}

export interface OpenShiftRequest {
  cashierName: string;
}

export interface OpenShiftResponse {
  success: boolean;
  shiftId: string;
  shiftNumber: number;
  openedAt: string;
}

export interface CloseShiftResponse {
  success: boolean;
  zReportNumber: string;
  zReportUrl: string;
  totalSales: number;
  totalRefunds: number;
  totalCash: number;
  totalCard: number;
  receiptsCount: number;
  vatSummary: { rate: number; amount: number }[];
}

export interface ShiftStatusResponse {
  success: boolean;
  shiftId: string;
  shiftNumber: number;
  status: 'open' | 'closed';
  openedAt: string;
  closedAt?: string;
  cashierName: string;
  totalSales: number;
  totalRefunds: number;
  totalCash: number;
  totalCard: number;
  receiptsCount: number;
}

export interface XReportResponse {
  success: boolean;
  totalSales: number;
  totalRefunds: number;
  totalCash: number;
  totalCard: number;
  receiptsCount: number;
  vatSummary: { rate: number; amount: number }[];
}

export interface CreateReceiptRequest {
  type: 'sale' | 'refund';
  items: MultiKassaReceiptItem[];
  payment: {
    cash: number;
    card: number;
  };
  total: number;
  orderId?: string;
  operatorName?: string;
}

@Injectable()
export class MultiKassaService {
  private readonly logger = new Logger(MultiKassaService.name);
  private configs: Map<string, MultiKassaConfig> = new Map();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register device configuration
   */
  registerDevice(deviceId: string, config: MultiKassaConfig): void {
    this.configs.set(deviceId, config);
    this.logger.log(`MultiKassa device registered: ${deviceId}`);
  }

  /**
   * Get device configuration
   */
  getConfig(deviceId: string): MultiKassaConfig {
    const config = this.configs.get(deviceId);
    if (!config) {
      throw new HttpException(
        `MultiKassa device not configured: ${deviceId}`,
        HttpStatus.NOT_FOUND,
      );
    }
    return config;
  }

  /**
   * Make authenticated request to MultiKassa API
   */
  private async request<T>(
    deviceId: string,
    method: 'GET' | 'POST',
    path: string,
    data?: any,
  ): Promise<T> {
    const config = this.getConfig(deviceId);
    const url = `${config.baseUrl}${path}`;

    const auth = Buffer.from(
      `${config.credentials.login}:${config.credentials.password}`,
    ).toString('base64');

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url,
          data,
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 30000,
        }),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `MultiKassa API error: ${error.message}`,
        error.response?.data,
      );
      throw new HttpException(
        error.response?.data?.message || 'MultiKassa API error',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // Shift Operations
  // ============================================

  /**
   * Open fiscal shift
   */
  async openShift(
    deviceId: string,
    request: OpenShiftRequest,
  ): Promise<OpenShiftResponse> {
    this.logger.log(`Opening shift for device ${deviceId}`);

    const config = this.getConfig(deviceId);
    const cashierName = request.cashierName || config.credentials.defaultCashier || 'VendHub';

    const response = await this.request<any>(deviceId, 'POST', '/shift/open', {
      cashier_name: cashierName,
    });

    return {
      success: true,
      shiftId: response.shift_id,
      shiftNumber: response.shift_number,
      openedAt: response.opened_at,
    };
  }

  /**
   * Close fiscal shift (Z-report)
   */
  async closeShift(deviceId: string): Promise<CloseShiftResponse> {
    this.logger.log(`Closing shift for device ${deviceId}`);

    const response = await this.request<any>(deviceId, 'POST', '/shift/close', {});

    return {
      success: true,
      zReportNumber: response.z_report_number,
      zReportUrl: response.z_report_url,
      totalSales: response.total_sales,
      totalRefunds: response.total_refunds,
      totalCash: response.total_cash || 0,
      totalCard: response.total_card || 0,
      receiptsCount: response.receipts_count,
      vatSummary: response.vat_summary || [],
    };
  }

  /**
   * Get shift status
   */
  async getShiftStatus(deviceId: string): Promise<ShiftStatusResponse> {
    const response = await this.request<any>(deviceId, 'GET', '/shift/status');

    return {
      success: true,
      shiftId: response.shift_id,
      shiftNumber: response.shift_number,
      status: response.status,
      openedAt: response.opened_at,
      closedAt: response.closed_at,
      cashierName: response.cashier_name,
      totalSales: response.total_sales,
      totalRefunds: response.total_refunds,
      totalCash: response.total_cash || 0,
      totalCard: response.total_card || 0,
      receiptsCount: response.receipts_count,
    };
  }

  /**
   * Get X-report (intermediate report)
   */
  async getXReport(deviceId: string): Promise<XReportResponse> {
    const response = await this.request<any>(deviceId, 'GET', '/shift/x-report');

    return {
      success: true,
      totalSales: response.total_sales,
      totalRefunds: response.total_refunds,
      totalCash: response.total_cash || 0,
      totalCard: response.total_card || 0,
      receiptsCount: response.receipts_count,
      vatSummary: response.vat_summary || [],
    };
  }

  // ============================================
  // Receipt Operations
  // ============================================

  /**
   * Create sale receipt
   */
  async createSaleReceipt(
    deviceId: string,
    request: CreateReceiptRequest,
  ): Promise<MultiKassaReceiptResponse> {
    this.logger.log(`Creating sale receipt for device ${deviceId}`);

    const payload = this.buildReceiptPayload(request);

    const response = await this.request<any>(deviceId, 'POST', '/receipt/sale', payload);

    return {
      success: true,
      receipt_id: response.receipt_id,
      fiscal_number: response.fiscal_number,
      fiscal_sign: response.fiscal_sign,
      qr_code_url: response.qr_code_url,
      receipt_url: response.receipt_url,
      timestamp: response.timestamp,
    };
  }

  /**
   * Create refund receipt
   */
  async createRefundReceipt(
    deviceId: string,
    request: CreateReceiptRequest,
  ): Promise<MultiKassaReceiptResponse> {
    this.logger.log(`Creating refund receipt for device ${deviceId}`);

    const payload = this.buildReceiptPayload({ ...request, type: 'refund' });

    const response = await this.request<any>(deviceId, 'POST', '/receipt/refund', payload);

    return {
      success: true,
      receipt_id: response.receipt_id,
      fiscal_number: response.fiscal_number,
      fiscal_sign: response.fiscal_sign,
      qr_code_url: response.qr_code_url,
      receipt_url: response.receipt_url,
      timestamp: response.timestamp,
    };
  }

  /**
   * Build receipt payload for API
   */
  private buildReceiptPayload(request: CreateReceiptRequest): any {
    return {
      type: request.type,
      items: request.items.map(item => ({
        name: item.name,
        ikpu_code: item.ikpu_code,
        package_code: item.package_code,
        quantity: item.quantity,
        price: item.price,
        vat_rate: item.vat_rate,
        unit: item.unit,
      })),
      payment: {
        cash: request.payment.cash,
        card: request.payment.card,
      },
      total: request.total,
      external_id: request.orderId,
      operator_name: request.operatorName,
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Calculate VAT amount for an item
   */
  calculateVat(price: number, quantity: number, vatRate: number): number {
    const total = price * quantity;
    return Math.round((total * vatRate) / (100 + vatRate));
  }

  /**
   * Convert sum to tiyin
   */
  toTiyin(sum: number): number {
    return Math.round(sum * 100);
  }

  /**
   * Convert tiyin to sum
   */
  fromTiyin(tiyin: number): number {
    return tiyin / 100;
  }

  /**
   * Validate IKPU code format
   */
  validateIkpuCode(code: string): boolean {
    // IKPU codes are typically 17-20 digits
    return /^\d{17,20}$/.test(code);
  }

  /**
   * Check if shift is open
   */
  async isShiftOpen(deviceId: string): Promise<boolean> {
    try {
      const status = await this.getShiftStatus(deviceId);
      return status.status === 'open';
    } catch {
      return false;
    }
  }

  /**
   * Ensure shift is open, open if not
   */
  async ensureShiftOpen(
    deviceId: string,
    cashierName?: string,
  ): Promise<OpenShiftResponse | ShiftStatusResponse> {
    const isOpen = await this.isShiftOpen(deviceId);

    if (isOpen) {
      return this.getShiftStatus(deviceId);
    }

    const config = this.getConfig(deviceId);
    return this.openShift(deviceId, {
      cashierName: cashierName || config.credentials.defaultCashier || 'VendHub Auto',
    });
  }
}
