import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import {
  MultiKassaService,
  MultiKassaConfig,
  CreateReceiptRequest,
} from './multikassa.service';

describe('MultiKassaService', () => {
  let service: MultiKassaService;
  let httpService: { request: jest.Mock };

  const deviceId = 'device-uuid-1';

  const deviceConfig: MultiKassaConfig = {
    baseUrl: 'http://localhost:8080/api/v1',
    sandboxMode: true,
    credentials: {
      login: 'testuser',
      password: 'testpass',
      companyTin: '123456789',
      defaultCashier: 'VendHub',
    },
  };

  const makeAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {
      headers: new AxiosHeaders(),
    } as InternalAxiosRequestConfig,
  });

  beforeEach(async () => {
    httpService = { request: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiKassaService,
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test') },
        },
      ],
    }).compile();

    service = module.get<MultiKassaService>(MultiKassaService);
    service.registerDevice(deviceId, deviceConfig);
  });

  // ================================================================
  // Device Registration
  // ================================================================

  describe('registerDevice', () => {
    it('should store device configuration', () => {
      const newId = 'dev-new';
      service.registerDevice(newId, deviceConfig);
      const config = service.getConfig(newId);
      expect(config).toEqual(deviceConfig);
    });
  });

  describe('getConfig', () => {
    it('should return config for registered device', () => {
      const config = service.getConfig(deviceId);
      expect(config.baseUrl).toBe('http://localhost:8080/api/v1');
    });

    it('should throw NOT_FOUND for unregistered device', () => {
      expect(() => service.getConfig('unknown')).toThrow(HttpException);
    });
  });

  // ================================================================
  // Shift Operations
  // ================================================================

  describe('openShift', () => {
    it('should open shift and return parsed response', async () => {
      httpService.request.mockReturnValue(
        of(makeAxiosResponse({
          shift_id: 'mk-shift-1',
          shift_number: 42,
          opened_at: '2025-01-15T10:00:00Z',
        })),
      );

      const result = await service.openShift(deviceId, { cashierName: 'Alice' });

      expect(result.success).toBe(true);
      expect(result.shiftId).toBe('mk-shift-1');
      expect(result.shiftNumber).toBe(42);
      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'http://localhost:8080/api/v1/shift/open',
        }),
      );
    });

    it('should use default cashier when not provided', async () => {
      httpService.request.mockReturnValue(
        of(makeAxiosResponse({ shift_id: 's1', shift_number: 1, opened_at: '' })),
      );

      await service.openShift(deviceId, { cashierName: '' });

      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { cashier_name: 'VendHub' },
        }),
      );
    });

    it('should throw HttpException on API error', async () => {
      httpService.request.mockReturnValue(
        throwError(() => ({
          message: 'Connection refused',
          response: { status: 500, data: { message: 'Server error' } },
        })),
      );

      await expect(service.openShift(deviceId, { cashierName: 'X' })).rejects.toThrow(HttpException);
    });
  });

  describe('closeShift', () => {
    it('should close shift and return Z-report data', async () => {
      httpService.request.mockReturnValue(
        of(makeAxiosResponse({
          z_report_number: 'Z-100',
          z_report_url: 'http://z/100',
          total_sales: 500000,
          total_refunds: 20000,
          total_cash: 300000,
          total_card: 200000,
          receipts_count: 25,
          vat_summary: [{ rate: 12, amount: 50000 }],
        })),
      );

      const result = await service.closeShift(deviceId);

      expect(result.success).toBe(true);
      expect(result.zReportNumber).toBe('Z-100');
      expect(result.totalSales).toBe(500000);
      expect(result.receiptsCount).toBe(25);
      expect(result.vatSummary).toHaveLength(1);
    });

    it('should default totalCash and totalCard to 0 when absent', async () => {
      httpService.request.mockReturnValue(
        of(makeAxiosResponse({
          z_report_number: 'Z-1',
          z_report_url: '',
          total_sales: 100,
          total_refunds: 0,
          receipts_count: 1,
        })),
      );

      const result = await service.closeShift(deviceId);

      expect(result.totalCash).toBe(0);
      expect(result.totalCard).toBe(0);
      expect(result.vatSummary).toEqual([]);
    });
  });

  describe('getShiftStatus', () => {
    it('should return formatted shift status', async () => {
      httpService.request.mockReturnValue(
        of(makeAxiosResponse({
          shift_id: 's1',
          shift_number: 3,
          status: 'open',
          opened_at: '2025-01-15T09:00:00Z',
          cashier_name: 'Bob',
          total_sales: 10000,
          total_refunds: 0,
          total_cash: 5000,
          total_card: 5000,
          receipts_count: 5,
        })),
      );

      const result = await service.getShiftStatus(deviceId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('open');
      expect(result.cashierName).toBe('Bob');
    });
  });

  describe('getXReport', () => {
    it('should return X-report data', async () => {
      httpService.request.mockReturnValue(
        of(makeAxiosResponse({
          total_sales: 80000,
          total_refunds: 1000,
          total_cash: 40000,
          total_card: 40000,
          receipts_count: 8,
          vat_summary: [],
        })),
      );

      const result = await service.getXReport(deviceId);

      expect(result.success).toBe(true);
      expect(result.totalSales).toBe(80000);
      expect(result.receiptsCount).toBe(8);
    });
  });

  // ================================================================
  // Receipt Operations
  // ================================================================

  describe('createSaleReceipt', () => {
    const request: CreateReceiptRequest = {
      type: 'sale',
      items: [
        {
          name: 'Coffee',
          ikpu_code: '10000000001000000',
          package_code: 'PKG',
          quantity: 1,
          price: 15000,
          vat_rate: 12,
          unit: 'pcs',
        },
      ],
      payment: { cash: 15000, card: 0 },
      total: 15000,
      orderId: 'order-1',
    };

    it('should create a sale receipt and return fiscal data', async () => {
      httpService.request.mockReturnValue(
        of(makeAxiosResponse({
          receipt_id: 'rcpt-1',
          fiscal_number: 'FN-001',
          fiscal_sign: 'FS-001',
          qr_code_url: 'http://qr/1',
          receipt_url: 'http://rcpt/1',
          timestamp: '2025-01-15T12:00:00Z',
        })),
      );

      const result = await service.createSaleReceipt(deviceId, request);

      expect(result.success).toBe(true);
      expect(result.receipt_id).toBe('rcpt-1');
      expect(result.fiscal_number).toBe('FN-001');
      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'http://localhost:8080/api/v1/receipt/sale',
        }),
      );
    });
  });

  describe('createRefundReceipt', () => {
    const request: CreateReceiptRequest = {
      type: 'refund',
      items: [
        {
          name: 'Coffee',
          ikpu_code: '10000000001000000',
          quantity: 1,
          price: 15000,
          vat_rate: 12,
          unit: 'pcs',
        },
      ],
      payment: { cash: 15000, card: 0 },
      total: 15000,
    };

    it('should create a refund receipt', async () => {
      httpService.request.mockReturnValue(
        of(makeAxiosResponse({
          receipt_id: 'ref-1',
          fiscal_number: 'FN-R1',
          fiscal_sign: 'FS-R1',
          qr_code_url: 'http://qr/r1',
          receipt_url: 'http://rcpt/r1',
          timestamp: '2025-01-15T12:30:00Z',
        })),
      );

      const result = await service.createRefundReceipt(deviceId, request);

      expect(result.success).toBe(true);
      expect(result.receipt_id).toBe('ref-1');
    });
  });

  // ================================================================
  // Utility Methods
  // ================================================================

  describe('calculateVat', () => {
    it('should calculate VAT correctly for 12%', () => {
      const vat = service.calculateVat(15000, 1, 12);
      expect(vat).toBe(Math.round((15000 * 12) / (100 + 12)));
    });

    it('should calculate VAT for multiple quantity', () => {
      const vat = service.calculateVat(10000, 3, 12);
      const expected = Math.round((30000 * 12) / 112);
      expect(vat).toBe(expected);
    });

    it('should return 0 for 0% VAT rate', () => {
      const vat = service.calculateVat(10000, 1, 0);
      expect(vat).toBe(0);
    });
  });

  describe('toTiyin', () => {
    it('should convert sum to tiyin', () => {
      expect(service.toTiyin(15000)).toBe(1500000);
    });

    it('should handle decimal values', () => {
      expect(service.toTiyin(100.5)).toBe(10050);
    });
  });

  describe('fromTiyin', () => {
    it('should convert tiyin to sum', () => {
      expect(service.fromTiyin(1500000)).toBe(15000);
    });
  });

  describe('validateIkpuCode', () => {
    it('should accept valid 17-digit IKPU code', () => {
      expect(service.validateIkpuCode('10000000001000000')).toBe(true);
    });

    it('should accept valid 20-digit IKPU code', () => {
      expect(service.validateIkpuCode('10000000001000000000')).toBe(true);
    });

    it('should reject code shorter than 17 digits', () => {
      expect(service.validateIkpuCode('123456789012345')).toBe(false);
    });

    it('should reject code with non-numeric characters', () => {
      expect(service.validateIkpuCode('1000000000100000A')).toBe(false);
    });

    it('should reject code longer than 20 digits', () => {
      expect(service.validateIkpuCode('100000000010000000001')).toBe(false);
    });
  });

  describe('isShiftOpen', () => {
    it('should return true when shift status is open', async () => {
      httpService.request.mockReturnValue(
        of(makeAxiosResponse({ status: 'open', shift_id: 's1', shift_number: 1, opened_at: '', cashier_name: '', total_sales: 0, total_refunds: 0, receipts_count: 0 })),
      );

      const result = await service.isShiftOpen(deviceId);
      expect(result).toBe(true);
    });

    it('should return false when shift status is closed', async () => {
      httpService.request.mockReturnValue(
        of(makeAxiosResponse({ status: 'closed', shift_id: 's1', shift_number: 1, opened_at: '', cashier_name: '', total_sales: 0, total_refunds: 0, receipts_count: 0 })),
      );

      const result = await service.isShiftOpen(deviceId);
      expect(result).toBe(false);
    });

    it('should return false when API call fails', async () => {
      httpService.request.mockReturnValue(throwError(() => new Error('Network error')));

      const result = await service.isShiftOpen(deviceId);
      expect(result).toBe(false);
    });
  });

  describe('ensureShiftOpen', () => {
    it('should return current status when shift is already open', async () => {
      httpService.request
        .mockReturnValueOnce(of(makeAxiosResponse({ status: 'open', shift_id: 's1', shift_number: 1, opened_at: '', cashier_name: 'C', total_sales: 0, total_refunds: 0, receipts_count: 0 })))
        .mockReturnValueOnce(of(makeAxiosResponse({ status: 'open', shift_id: 's1', shift_number: 1, opened_at: '', cashier_name: 'C', total_sales: 0, total_refunds: 0, receipts_count: 0 })));

      const result = await service.ensureShiftOpen(deviceId, 'Cashier');
      expect(result.success).toBe(true);
    });
  });
});
