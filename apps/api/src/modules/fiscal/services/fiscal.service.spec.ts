import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { Repository, ObjectLiteral } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { FiscalService, CreateDeviceDto, CreateReceiptDto } from './fiscal.service';
import { MultiKassaService } from './multikassa.service';
import {
  FiscalReceipt,
  FiscalShift,
  FiscalDevice,
  FiscalQueue,
  FiscalReceiptStatus,
  FiscalReceiptType,
  FiscalShiftStatus,
  FiscalDeviceStatus,
  FiscalQueueStatus,
} from '../entities/fiscal.entity';

type MockRepository<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends ObjectLiteral>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getMany: jest.fn(),
  getOne: jest.fn(),
};

describe('FiscalService', () => {
  let service: FiscalService;
  let receiptRepo: MockRepository<FiscalReceipt>;
  let shiftRepo: MockRepository<FiscalShift>;
  let deviceRepo: MockRepository<FiscalDevice>;
  let queueRepo: MockRepository<FiscalQueue>;
  let mockFiscalQueue: { add: jest.Mock };
  let mockMultikassa: Partial<Record<keyof MultiKassaService, jest.Mock>>;

  const orgId = 'org-uuid-1';
  const deviceId = 'device-uuid-1';

  const mockDevice: Partial<FiscalDevice> = {
    id: deviceId,
    organizationId: orgId,
    name: 'Test Device',
    provider: 'multikassa',
    status: FiscalDeviceStatus.ACTIVE,
    sandboxMode: true,
    credentials: { login: 'u', password: 'p', companyTin: '123' },
    config: {
      baseUrl: 'http://localhost:8080/api/v1',
      defaultCashier: 'Auto',
      autoOpenShift: false,
    },
    created_at: new Date(),
  };

  const mockShift: Partial<FiscalShift> = {
    id: 'shift-uuid-1',
    organizationId: orgId,
    deviceId,
    shiftNumber: 1,
    status: FiscalShiftStatus.OPEN,
    cashierName: 'Test Cashier',
    openedAt: new Date(),
    totalSales: 0,
    totalRefunds: 0,
    totalCash: 0,
    totalCard: 0,
    receiptsCount: 0,
  };

  beforeEach(async () => {
    receiptRepo = createMockRepository<FiscalReceipt>();
    shiftRepo = createMockRepository<FiscalShift>();
    deviceRepo = createMockRepository<FiscalDevice>();
    queueRepo = createMockRepository<FiscalQueue>();
    mockFiscalQueue = { add: jest.fn() };
    mockMultikassa = {
      registerDevice: jest.fn(),
      openShift: jest.fn(),
      closeShift: jest.fn(),
      getXReport: jest.fn(),
      createSaleReceipt: jest.fn(),
      createRefundReceipt: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FiscalService,
        { provide: getRepositoryToken(FiscalReceipt), useValue: receiptRepo },
        { provide: getRepositoryToken(FiscalShift), useValue: shiftRepo },
        { provide: getRepositoryToken(FiscalDevice), useValue: deviceRepo },
        { provide: getRepositoryToken(FiscalQueue), useValue: queueRepo },
        { provide: getQueueToken('fiscal'), useValue: mockFiscalQueue },
        { provide: MultiKassaService, useValue: mockMultikassa },
      ],
    }).compile();

    service = module.get<FiscalService>(FiscalService);
  });

  // ================================================================
  // Device Management
  // ================================================================

  describe('createDevice', () => {
    const dto: CreateDeviceDto = {
      name: 'New Device',
      provider: 'multikassa',
      serialNumber: 'SN-001',
      credentials: { login: 'user', password: 'pass', companyTin: '999' },
      sandboxMode: true,
      config: { baseUrl: 'http://test/api/v1', defaultCashier: 'Auto' },
    };

    it('should create a device and register with multikassa', async () => {
      const created = { id: 'new-dev', ...dto, organizationId: orgId };
      deviceRepo.create!.mockReturnValue(created);
      deviceRepo.save!.mockResolvedValue(created);

      const result = await service.createDevice(orgId, dto);

      expect(deviceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          name: dto.name,
          provider: 'multikassa',
          status: FiscalDeviceStatus.INACTIVE,
        }),
      );
      expect(deviceRepo.save).toHaveBeenCalledWith(created);
      expect(mockMultikassa.registerDevice).toHaveBeenCalledWith('new-dev', expect.any(Object));
      expect(result).toEqual(created);
    });

    it('should not register with multikassa when provider is different', async () => {
      const otherDto = { ...dto, provider: 'ofd' };
      const created = { id: 'new-dev-2', ...otherDto, organizationId: orgId };
      deviceRepo.create!.mockReturnValue(created);
      deviceRepo.save!.mockResolvedValue(created);

      await service.createDevice(orgId, otherDto);

      expect(mockMultikassa.registerDevice).not.toHaveBeenCalled();
    });

    it('should default sandboxMode to true when not provided', async () => {
      const dtoNoSandbox: CreateDeviceDto = {
        name: 'Dev',
        provider: 'multikassa',
        credentials: {},
      };
      deviceRepo.create!.mockReturnValue({ id: 'd', ...dtoNoSandbox });
      deviceRepo.save!.mockResolvedValue({ id: 'd', ...dtoNoSandbox });

      await service.createDevice(orgId, dtoNoSandbox);

      expect(deviceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sandboxMode: true }),
      );
    });
  });

  describe('getDevice', () => {
    it('should return the device when found', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      const result = await service.getDevice(deviceId, orgId);
      expect(result).toEqual(mockDevice);
    });

    it('should throw NOT_FOUND when device does not exist', async () => {
      deviceRepo.findOne!.mockResolvedValue(null);
      await expect(service.getDevice('missing', orgId)).rejects.toThrow(HttpException);
      await expect(service.getDevice('missing', orgId)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });
  });

  describe('getDevices', () => {
    it('should return all devices for the organization', async () => {
      const devices = [mockDevice];
      deviceRepo.find!.mockResolvedValue(devices);

      const result = await service.getDevices(orgId);

      expect(deviceRepo.find).toHaveBeenCalledWith({
        where: { organizationId: orgId },
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual(devices);
    });
  });

  describe('activateDevice', () => {
    it('should set device status to ACTIVE', async () => {
      deviceRepo.findOne!.mockResolvedValue({ ...mockDevice });
      deviceRepo.save!.mockImplementation(async (d) => d);

      const result = await service.activateDevice(deviceId, orgId);

      expect(result.status).toBe(FiscalDeviceStatus.ACTIVE);
    });
  });

  describe('deactivateDevice', () => {
    it('should set device status to INACTIVE', async () => {
      deviceRepo.findOne!.mockResolvedValue({ ...mockDevice });
      deviceRepo.save!.mockImplementation(async (d) => d);

      const result = await service.deactivateDevice(deviceId, orgId);

      expect(result.status).toBe(FiscalDeviceStatus.INACTIVE);
    });
  });

  // ================================================================
  // Shift Management
  // ================================================================

  describe('openShift', () => {
    it('should open a new shift when none is open', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!
        .mockResolvedValueOnce(null) // getCurrentShift
        .mockResolvedValueOnce({ shiftNumber: 5 }); // lastShift lookup
      mockMultikassa.openShift!.mockResolvedValue({ shiftId: 'ext-1' });
      shiftRepo.create!.mockImplementation((d) => d);
      shiftRepo.save!.mockImplementation(async (d) => ({ id: 'shift-new', ...d }));

      const result = await service.openShift(deviceId, orgId, 'Cashier A');

      expect(result.shiftNumber).toBe(6);
      expect(result.status).toBe(FiscalShiftStatus.OPEN);
      expect(result.cashierName).toBe('Cashier A');
    });

    it('should throw BAD_REQUEST when a shift is already open', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValueOnce(mockShift); // getCurrentShift returns open shift

      await expect(service.openShift(deviceId, orgId, 'Cashier')).rejects.toThrow(HttpException);
    });

    it('should add to queue when multikassa openShift fails', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockMultikassa.openShift!.mockRejectedValue(new Error('Timeout'));
      queueRepo.create!.mockImplementation((d) => d);
      queueRepo.save!.mockImplementation(async (d) => ({ id: 'q1', ...d }));
      mockFiscalQueue.add.mockResolvedValue({});
      shiftRepo.create!.mockImplementation((d) => d);
      shiftRepo.save!.mockImplementation(async (d) => ({ id: 's1', ...d }));

      const result = await service.openShift(deviceId, orgId, 'Cashier');

      expect(queueRepo.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('closeShift', () => {
    it('should close the current open shift', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValue({ ...mockShift });
      mockMultikassa.closeShift!.mockResolvedValue({
        zReportNumber: 'Z-001',
        zReportUrl: 'http://z',
        totalSales: 100000,
        totalRefunds: 5000,
        totalCash: 60000,
        totalCard: 40000,
        receiptsCount: 10,
        vatSummary: [{ rate: 12, amount: 10000 }],
      });
      shiftRepo.save!.mockImplementation(async (d) => d);

      const result = await service.closeShift(deviceId, orgId);

      expect(result.status).toBe(FiscalShiftStatus.CLOSED);
      expect(result.closedAt).toBeInstanceOf(Date);
      expect(result.zReportNumber).toBe('Z-001');
    });

    it('should throw BAD_REQUEST when no open shift exists', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValue(null);

      await expect(service.closeShift(deviceId, orgId)).rejects.toThrow(HttpException);
    });
  });

  describe('getCurrentShift', () => {
    it('should return the open shift for the device', async () => {
      shiftRepo.findOne!.mockResolvedValue(mockShift);
      const result = await service.getCurrentShift(deviceId);
      expect(result).toEqual(mockShift);
      expect(shiftRepo.findOne).toHaveBeenCalledWith({
        where: { deviceId, status: FiscalShiftStatus.OPEN },
        order: { openedAt: 'DESC' },
      });
    });

    it('should return null when no open shift exists', async () => {
      shiftRepo.findOne!.mockResolvedValue(null);
      const result = await service.getCurrentShift(deviceId);
      expect(result).toBeNull();
    });
  });

  describe('getShiftHistory', () => {
    it('should return shift history with default limit', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.find!.mockResolvedValue([mockShift]);

      const result = await service.getShiftHistory(deviceId, orgId);

      expect(shiftRepo.find).toHaveBeenCalledWith({
        where: { deviceId },
        order: { openedAt: 'DESC' },
        take: 30,
      });
      expect(result).toHaveLength(1);
    });

    it('should throw NOT_FOUND when device does not exist', async () => {
      deviceRepo.findOne!.mockResolvedValue(null);
      await expect(service.getShiftHistory(deviceId, orgId)).rejects.toThrow(HttpException);
    });
  });

  // ================================================================
  // Receipt Operations
  // ================================================================

  describe('createReceipt', () => {
    const receiptDto: CreateReceiptDto = {
      deviceId,
      orderId: 'order-1',
      type: FiscalReceiptType.SALE,
      items: [
        {
          name: 'Coffee',
          ikpuCode: '10000000001000000',
          quantity: 1,
          price: 15000,
          vatRate: 12,
          unit: 'pcs',
        },
      ],
      payment: { cash: 15000, card: 0 },
    };

    it('should create a receipt when shift is open', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValue(mockShift);
      receiptRepo.create!.mockImplementation((d) => d);
      receiptRepo.save!.mockImplementation(async (d) => ({ id: 'r1', ...d, retryCount: 0 }));
      mockMultikassa.createSaleReceipt!.mockResolvedValue({
        receipt_id: 'ext-r1',
        fiscal_number: 'FN-001',
        fiscal_sign: 'FS-001',
        qr_code_url: 'http://qr',
        receipt_url: 'http://receipt',
      });

      const result = await service.createReceipt(orgId, receiptDto);

      expect(receiptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          deviceId,
          type: FiscalReceiptType.SALE,
          status: FiscalReceiptStatus.PENDING,
        }),
      );
      expect(result).toBeDefined();
    });

    it('should throw BAD_REQUEST when no shift and autoOpenShift is false', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValue(null);

      await expect(service.createReceipt(orgId, receiptDto)).rejects.toThrow(HttpException);
    });

    it('should auto-open shift when configured', async () => {
      const autoDevice = {
        ...mockDevice,
        config: { ...mockDevice.config, autoOpenShift: true, defaultCashier: 'Auto' },
      };
      deviceRepo.findOne!.mockResolvedValue(autoDevice);
      shiftRepo.findOne!
        .mockResolvedValueOnce(null) // getCurrentShift in createReceipt
        .mockResolvedValueOnce(null) // getCurrentShift in openShift
        .mockResolvedValueOnce(null); // lastShift in openShift
      mockMultikassa.openShift!.mockResolvedValue({ shiftId: 'ext-s' });
      shiftRepo.create!.mockImplementation((d) => d);
      shiftRepo.save!.mockImplementation(async (d) => ({ id: 'new-shift', ...d }));
      receiptRepo.create!.mockImplementation((d) => d);
      receiptRepo.save!.mockImplementation(async (d) => ({ id: 'r2', ...d, retryCount: 0 }));
      mockMultikassa.createSaleReceipt!.mockResolvedValue({
        receipt_id: 'ext-r2',
        fiscal_number: 'FN-002',
        fiscal_sign: 'FS-002',
      });

      const result = await service.createReceipt(orgId, receiptDto);

      expect(result).toBeDefined();
    });
  });

  describe('getReceipt', () => {
    it('should return receipt when found', async () => {
      const receipt = { id: 'r-1', organizationId: orgId };
      receiptRepo.findOne!.mockResolvedValue(receipt);

      const result = await service.getReceipt('r-1', orgId);

      expect(result).toEqual(receipt);
    });

    it('should throw NOT_FOUND when receipt does not exist', async () => {
      receiptRepo.findOne!.mockResolvedValue(null);
      await expect(service.getReceipt('missing', orgId)).rejects.toThrow(HttpException);
    });
  });

  describe('getReceipts', () => {
    it('should build query with all filters', async () => {
      receiptRepo.createQueryBuilder!.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[{ id: 'r1' }], 1]);

      const result = await service.getReceipts(orgId, {
        deviceId: 'dev-1',
        shiftId: 'shift-1',
        type: FiscalReceiptType.SALE,
        status: FiscalReceiptStatus.SUCCESS,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        limit: 10,
        offset: 0,
      });

      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4);
      expect(result.receipts).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should use default limit and offset when not provided', async () => {
      receiptRepo.createQueryBuilder!.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getReceipts(orgId, {});

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
    });
  });

  // ================================================================
  // Queue Management
  // ================================================================

  describe('addToQueue', () => {
    it('should create a queue item and add to Bull queue', async () => {
      const item = { id: 'qi-1', organizationId: orgId };
      queueRepo.create!.mockReturnValue(item);
      queueRepo.save!.mockResolvedValue(item);
      mockFiscalQueue.add.mockResolvedValue({});

      const result = await service.addToQueue(orgId, deviceId, 'receipt_sale', { receiptId: 'r1' });

      expect(queueRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          deviceId,
          operation: 'receipt_sale',
          status: FiscalQueueStatus.PENDING,
          maxRetries: 5,
        }),
      );
      expect(mockFiscalQueue.add).toHaveBeenCalledWith(
        'process',
        { queueItemId: 'qi-1' },
        expect.objectContaining({ attempts: 5 }),
      );
      expect(result).toEqual(item);
    });
  });

  describe('getQueueItems', () => {
    it('should return queue items filtered by status', async () => {
      queueRepo.find!.mockResolvedValue([]);

      await service.getQueueItems(orgId, FiscalQueueStatus.PENDING);

      expect(queueRepo.find).toHaveBeenCalledWith({
        where: { organizationId: orgId, status: FiscalQueueStatus.PENDING },
        order: { priority: 'DESC', created_at: 'ASC' },
      });
    });

    it('should return all queue items when status is not provided', async () => {
      queueRepo.find!.mockResolvedValue([]);

      await service.getQueueItems(orgId);

      expect(queueRepo.find).toHaveBeenCalledWith({
        where: { organizationId: orgId },
        order: { priority: 'DESC', created_at: 'ASC' },
      });
    });
  });

  describe('processQueueItem', () => {
    it('should skip when item is not found', async () => {
      queueRepo.findOne!.mockResolvedValue(null);

      await service.processQueueItem('missing-id');

      expect(queueRepo.save).not.toHaveBeenCalled();
    });

    it('should skip when item is already successful', async () => {
      queueRepo.findOne!.mockResolvedValue({ id: 'qi', status: FiscalQueueStatus.SUCCESS });

      await service.processQueueItem('qi');

      expect(queueRepo.save).not.toHaveBeenCalled();
    });

    it('should mark item as FAILED when device not found', async () => {
      const item = {
        id: 'qi',
        deviceId: 'bad-dev',
        operation: 'receipt_sale',
        payload: { receiptId: 'r1' },
        status: FiscalQueueStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
      };
      queueRepo.findOne!.mockResolvedValue(item);
      queueRepo.save!.mockImplementation(async (d) => d);
      deviceRepo.findOne!.mockResolvedValue(null);

      await service.processQueueItem('qi');

      expect(item.retryCount).toBe(1);
    });

    it('should set status to RETRY when retryCount < maxRetries', async () => {
      const item: Record<string, any> = {
        id: 'qi',
        deviceId: 'dev',
        operation: 'receipt_sale',
        payload: { receiptId: 'r1' },
        status: FiscalQueueStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
      };
      queueRepo.findOne!.mockResolvedValue(item);
      queueRepo.save!.mockImplementation(async (d) => d);
      deviceRepo.findOne!.mockResolvedValue(null);

      await service.processQueueItem('qi');

      expect(item.status).toBe(FiscalQueueStatus.RETRY);
      expect(item.nextRetryAt).toBeDefined();
    });
  });

  // ================================================================
  // Statistics
  // ================================================================

  describe('getDeviceStatistics', () => {
    it('should return complete device statistics', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValue(mockShift);
      receiptRepo.find!.mockResolvedValue([
        { type: FiscalReceiptType.SALE, total: 10000 },
        { type: FiscalReceiptType.REFUND, total: 2000 },
      ]);
      queueRepo.count!
        .mockResolvedValueOnce(3) // pending
        .mockResolvedValueOnce(1); // failed

      const result = await service.getDeviceStatistics(deviceId, orgId);

      expect(result.deviceId).toBe(deviceId);
      expect(result.deviceName).toBe('Test Device');
      expect(result.currentShift).toBeDefined();
      expect(result.todayStats.receiptsCount).toBe(2);
      expect(result.todayStats.totalSales).toBe(10000);
      expect(result.todayStats.totalRefunds).toBe(2000);
      expect(result.queueStats.pending).toBe(3);
      expect(result.queueStats.failed).toBe(1);
    });

    it('should return statistics without current shift when none is open', async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValue(null);
      receiptRepo.find!.mockResolvedValue([]);
      queueRepo.count!.mockResolvedValue(0);

      const result = await service.getDeviceStatistics(deviceId, orgId);

      expect(result.currentShift).toBeUndefined();
    });
  });
});
