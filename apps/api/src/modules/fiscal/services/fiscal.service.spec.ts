import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { getQueueToken } from "@nestjs/bullmq";
import { Repository, ObjectLiteral } from "typeorm";
import { HttpException, HttpStatus } from "@nestjs/common";
import { FiscalService } from "./fiscal.service";
import { CreateFiscalDeviceDto as CreateDeviceDto } from "../dto/create-fiscal-device.dto";
import { CreateFiscalReceiptDto as CreateReceiptDto } from "../dto/create-fiscal-receipt.dto";
import { MultiKassaService } from "./multikassa.service";
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
} from "../entities/fiscal.entity";

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;
const createMockRepository = <
  T extends ObjectLiteral,
>(): MockRepository<T> => ({
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

describe("FiscalService", () => {
  let service: FiscalService;
  let receiptRepo: MockRepository<FiscalReceipt>;
  let shiftRepo: MockRepository<FiscalShift>;
  let deviceRepo: MockRepository<FiscalDevice>;
  let queueRepo: MockRepository<FiscalQueue>;
  let mockFiscalQueue: { add: jest.Mock };
  let mockMultikassa: Partial<Record<keyof MultiKassaService, jest.Mock>>;

  const orgId = "org-uuid-1";
  const deviceId = "device-uuid-1";

  const mockDevice: Partial<FiscalDevice> = {
    id: deviceId,
    organizationId: orgId,
    name: "Test Device",
    provider: "multikassa",
    status: FiscalDeviceStatus.ACTIVE,
    sandboxMode: true,
    credentials: { login: "u", password: "p", companyTin: "123" },
    config: {
      baseUrl: "http://localhost:8080/api/v1",
      defaultCashier: "Auto",
      autoOpenShift: false,
    },
    createdAt: new Date(),
  };

  const mockShift: Partial<FiscalShift> = {
    id: "shift-uuid-1",
    organizationId: orgId,
    deviceId,
    shiftNumber: 1,
    status: FiscalShiftStatus.OPEN,
    cashierName: "Test Cashier",
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
        { provide: getQueueToken("fiscal"), useValue: mockFiscalQueue },
        { provide: MultiKassaService, useValue: mockMultikassa },
      ],
    }).compile();

    service = module.get<FiscalService>(FiscalService);
  });

  // ================================================================
  // Device Management
  // ================================================================

  describe("createDevice", () => {
    const dto: CreateDeviceDto = {
      name: "New Device",
      provider: "multikassa",
      serial_number: "SN-001",
      credentials: { login: "user", password: "pass", company_tin: "999" },
      sandbox_mode: true,
      config: { base_url: "http://test/api/v1", default_cashier: "Auto" },
    };

    it("should create a device and register with multikassa", async () => {
      const created = { id: "new-dev", ...dto, organizationId: orgId };
      deviceRepo.create!.mockReturnValue(created);
      deviceRepo.save!.mockResolvedValue(created);

      const result = await service.createDevice(orgId, dto);

      expect(deviceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          name: dto.name,
          provider: "multikassa",
          status: FiscalDeviceStatus.INACTIVE,
        }),
      );
      expect(deviceRepo.save).toHaveBeenCalledWith(created);
      expect(mockMultikassa.registerDevice).toHaveBeenCalledWith(
        "new-dev",
        expect.any(Object),
      );
      expect(result).toEqual(created);
    });

    it("should not register with multikassa when provider is different", async () => {
      const otherDto = { ...dto, provider: "ofd" };
      const created = { id: "new-dev-2", ...otherDto, organizationId: orgId };
      deviceRepo.create!.mockReturnValue(created);
      deviceRepo.save!.mockResolvedValue(created);

      await service.createDevice(orgId, otherDto);

      expect(mockMultikassa.registerDevice).not.toHaveBeenCalled();
    });

    it("should default sandboxMode to true when not provided", async () => {
      const dtoNoSandbox: CreateDeviceDto = {
        name: "Dev",
        provider: "multikassa",
        credentials: {},
      };
      deviceRepo.create!.mockReturnValue({ id: "d", ...dtoNoSandbox });
      deviceRepo.save!.mockResolvedValue({ id: "d", ...dtoNoSandbox });

      await service.createDevice(orgId, dtoNoSandbox);

      expect(deviceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sandboxMode: true }),
      );
    });
  });

  describe("getDevice", () => {
    it("should return the device when found", async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      const result = await service.getDevice(deviceId, orgId);
      expect(result).toEqual(mockDevice);
    });

    it("should throw NOT_FOUND when device does not exist", async () => {
      deviceRepo.findOne!.mockResolvedValue(null);
      await expect(service.getDevice("missing", orgId)).rejects.toThrow(
        HttpException,
      );
      await expect(service.getDevice("missing", orgId)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });
  });

  describe("getDevices", () => {
    it("should return all devices for the organization", async () => {
      const devices = [mockDevice];
      deviceRepo.find!.mockResolvedValue(devices);

      const result = await service.getDevices(orgId);

      expect(deviceRepo.find).toHaveBeenCalledWith({
        where: { organizationId: orgId },
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual(devices);
    });
  });

  describe("updateDevice", () => {
    it("should update device name and serial number", async () => {
      const existing = { ...mockDevice };
      deviceRepo.findOne!.mockResolvedValue(existing);
      deviceRepo.save!.mockImplementation(async (d) => d);

      const result = await service.updateDevice(deviceId, orgId, {
        name: "Updated Device",
        serial_number: "SN-NEW",
      });

      expect(result.name).toBe("Updated Device");
      expect(result.serialNumber).toBe("SN-NEW");
    });

    it("should merge credentials without overwriting unset fields", async () => {
      const existing = {
        ...mockDevice,
        credentials: { login: "old", password: "old", companyTin: "111" },
      };
      deviceRepo.findOne!.mockResolvedValue(existing);
      deviceRepo.save!.mockImplementation(async (d) => d);

      const result = await service.updateDevice(deviceId, orgId, {
        credentials: { login: "new_user" },
      });

      expect(result.credentials.login).toBe("new_user");
      expect(result.credentials.password).toBe("old");
      expect(result.credentials.companyTin).toBe("111");
    });

    it("should merge config without overwriting unset fields", async () => {
      const existing = {
        ...mockDevice,
        config: {
          baseUrl: "http://old",
          defaultCashier: "OldCashier",
          autoOpenShift: false,
        },
      };
      deviceRepo.findOne!.mockResolvedValue(existing);
      deviceRepo.save!.mockImplementation(async (d) => d);

      const result = await service.updateDevice(deviceId, orgId, {
        config: { base_url: "http://new", auto_open_shift: true },
      });

      expect(result.config.baseUrl).toBe("http://new");
      expect(result.config.defaultCashier).toBe("OldCashier");
      expect(result.config.autoOpenShift).toBe(true);
    });

    it("should update sandboxMode", async () => {
      const existing = { ...mockDevice, sandboxMode: true };
      deviceRepo.findOne!.mockResolvedValue(existing);
      deviceRepo.save!.mockImplementation(async (d) => d);

      const result = await service.updateDevice(deviceId, orgId, {
        sandbox_mode: false,
      });

      expect(result.sandboxMode).toBe(false);
    });

    it("should re-register multikassa device after update", async () => {
      const existing = { ...mockDevice, provider: "multikassa" };
      deviceRepo.findOne!.mockResolvedValue(existing);
      deviceRepo.save!.mockImplementation(async (d) => d);

      await service.updateDevice(deviceId, orgId, { name: "Updated" });

      expect(mockMultikassa.registerDevice).toHaveBeenCalled();
    });

    it("should not re-register when provider is not multikassa", async () => {
      const existing = { ...mockDevice, provider: "ofd" };
      deviceRepo.findOne!.mockResolvedValue(existing);
      deviceRepo.save!.mockImplementation(async (d) => d);

      await service.updateDevice(deviceId, orgId, { name: "Updated" });

      expect(mockMultikassa.registerDevice).not.toHaveBeenCalled();
    });

    it("should update terminal_id", async () => {
      const existing = { ...mockDevice };
      deviceRepo.findOne!.mockResolvedValue(existing);
      deviceRepo.save!.mockImplementation(async (d) => d);

      const result = await service.updateDevice(deviceId, orgId, {
        terminal_id: "TERM-NEW",
      });

      expect(result.terminalId).toBe("TERM-NEW");
    });

    it("should merge credentials with api_key and company_tin", async () => {
      const existing = {
        ...mockDevice,
        credentials: { login: "u", password: "p" },
      };
      deviceRepo.findOne!.mockResolvedValue(existing);
      deviceRepo.save!.mockImplementation(async (d) => d);

      const result = await service.updateDevice(deviceId, orgId, {
        credentials: { api_key: "key123", company_tin: "999" },
      });

      expect(result.credentials.apiKey).toBe("key123");
      expect(result.credentials.companyTin).toBe("999");
    });

    it("should merge config with close_shift_at and vat_rates", async () => {
      const existing = { ...mockDevice, config: {} };
      deviceRepo.findOne!.mockResolvedValue(existing);
      deviceRepo.save!.mockImplementation(async (d) => d);

      const result = await service.updateDevice(deviceId, orgId, {
        config: {
          close_shift_at: "23:59",
          vat_rates: [12, 0],
          auto_close_shift: true,
          default_cashier: "Auto",
        },
      });

      expect(result.config.closeShiftAt).toBe("23:59");
      expect(result.config.vatRates).toEqual([12, 0]);
      expect(result.config.autoCloseShift).toBe(true);
      expect(result.config.defaultCashier).toBe("Auto");
    });

    it("should throw NOT_FOUND when device does not exist", async () => {
      deviceRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.updateDevice("missing", orgId, { name: "X" }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe("activateDevice", () => {
    it("should set device status to ACTIVE", async () => {
      deviceRepo.findOne!.mockResolvedValue({ ...mockDevice });
      deviceRepo.save!.mockImplementation(async (d) => d);

      const result = await service.activateDevice(deviceId, orgId);

      expect(result.status).toBe(FiscalDeviceStatus.ACTIVE);
    });
  });

  describe("deactivateDevice", () => {
    it("should set device status to INACTIVE", async () => {
      deviceRepo.findOne!.mockResolvedValue({ ...mockDevice });
      deviceRepo.save!.mockImplementation(async (d) => d);

      const result = await service.deactivateDevice(deviceId, orgId);

      expect(result.status).toBe(FiscalDeviceStatus.INACTIVE);
    });
  });

  // ================================================================
  // Shift Management
  // ================================================================

  describe("openShift", () => {
    it("should open a new shift when none is open", async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo
        .findOne!.mockResolvedValueOnce(null) // getCurrentShift
        .mockResolvedValueOnce({ shiftNumber: 5 }); // lastShift lookup
      mockMultikassa.openShift!.mockResolvedValue({ shiftId: "ext-1" });
      shiftRepo.create!.mockImplementation((d) => d);
      shiftRepo.save!.mockImplementation(async (d) => ({
        id: "shift-new",
        ...d,
      }));

      const result = await service.openShift(deviceId, orgId, "Cashier A");

      expect(result.shiftNumber).toBe(6);
      expect(result.status).toBe(FiscalShiftStatus.OPEN);
      expect(result.cashierName).toBe("Cashier A");
    });

    it("should throw BAD_REQUEST when a shift is already open", async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValueOnce(mockShift); // getCurrentShift returns open shift

      await expect(
        service.openShift(deviceId, orgId, "Cashier"),
      ).rejects.toThrow(HttpException);
    });

    it("should add to queue when multikassa openShift fails", async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo
        .findOne!.mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockMultikassa.openShift!.mockRejectedValue(new Error("Timeout"));
      queueRepo.create!.mockImplementation((d) => d);
      queueRepo.save!.mockImplementation(async (d) => ({ id: "q1", ...d }));
      mockFiscalQueue.add.mockResolvedValue({});
      shiftRepo.create!.mockImplementation((d) => d);
      shiftRepo.save!.mockImplementation(async (d) => ({ id: "s1", ...d }));

      const result = await service.openShift(deviceId, orgId, "Cashier");

      expect(queueRepo.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("closeShift", () => {
    it("should close the current open shift", async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValue({ ...mockShift });
      mockMultikassa.closeShift!.mockResolvedValue({
        zReportNumber: "Z-001",
        zReportUrl: "http://z",
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
      expect(result.zReportNumber).toBe("Z-001");
    });

    it("should throw BAD_REQUEST when no open shift exists", async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValue(null);

      await expect(service.closeShift(deviceId, orgId)).rejects.toThrow(
        HttpException,
      );
    });

    it("should add to queue when multikassa closeShift fails", async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValue({ ...mockShift });
      mockMultikassa.closeShift!.mockRejectedValue(new Error("Timeout"));
      shiftRepo.save!.mockImplementation(async (d) => d);
      queueRepo.create!.mockImplementation((d) => d);
      queueRepo.save!.mockImplementation(async (d) => ({
        id: "q-close",
        ...d,
      }));
      mockFiscalQueue.add.mockResolvedValue({});

      const result = await service.closeShift(deviceId, orgId);

      expect(result.status).toBe(FiscalShiftStatus.CLOSED);
      expect(queueRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ operation: "shift_close" }),
      );
    });

    it("should close shift without external data when closeShift fails", async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      const openShift = {
        ...mockShift,
        zReportNumber: undefined,
        totalSales: 0,
      };
      shiftRepo.findOne!.mockResolvedValue(openShift);
      mockMultikassa.closeShift!.mockRejectedValue(new Error("Offline"));
      shiftRepo.save!.mockImplementation(async (d) => d);
      queueRepo.create!.mockImplementation((d) => d);
      queueRepo.save!.mockImplementation(async (d) => ({ id: "q", ...d }));
      mockFiscalQueue.add.mockResolvedValue({});

      const result = await service.closeShift(deviceId, orgId);

      expect(result.status).toBe(FiscalShiftStatus.CLOSED);
      expect(result.zReportNumber).toBeUndefined();
    });
  });

  describe("getCurrentShift", () => {
    it("should return the open shift for the device", async () => {
      shiftRepo.findOne!.mockResolvedValue(mockShift);
      const result = await service.getCurrentShift(deviceId);
      expect(result).toEqual(mockShift);
      expect(shiftRepo.findOne).toHaveBeenCalledWith({
        where: { deviceId, status: FiscalShiftStatus.OPEN },
        order: { openedAt: "DESC" },
      });
    });

    it("should return null when no open shift exists", async () => {
      shiftRepo.findOne!.mockResolvedValue(null);
      const result = await service.getCurrentShift(deviceId);
      expect(result).toBeNull();
    });
  });

  describe("getShiftHistory", () => {
    it("should return shift history with default limit", async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.find!.mockResolvedValue([mockShift]);

      const result = await service.getShiftHistory(deviceId, orgId);

      expect(shiftRepo.find).toHaveBeenCalledWith({
        where: { deviceId },
        order: { openedAt: "DESC" },
        take: 30,
      });
      expect(result).toHaveLength(1);
    });

    it("should throw NOT_FOUND when device does not exist", async () => {
      deviceRepo.findOne!.mockResolvedValue(null);
      await expect(service.getShiftHistory(deviceId, orgId)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe("getXReport", () => {
    it("should return X-report from multikassa provider", async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValue(mockShift);
      mockMultikassa.getXReport!.mockResolvedValue({
        success: true,
        totalSales: 50000,
        totalRefunds: 2000,
        totalCash: 30000,
        totalCard: 20000,
        receiptsCount: 5,
      });

      const result = await service.getXReport(deviceId, orgId);

      expect(result.success).toBe(true);
      expect(result.totalSales).toBe(50000);
      expect(result.shiftId).toBe(mockShift.id);
      expect(result.shiftNumber).toBe(mockShift.shiftNumber);
    });

    it("should calculate X-report from local data when provider is not multikassa", async () => {
      const ofdDevice = { ...mockDevice, provider: "ofd" };
      deviceRepo.findOne!.mockResolvedValue(ofdDevice);
      shiftRepo.findOne!.mockResolvedValue(mockShift);
      receiptRepo.find!.mockResolvedValue([
        {
          type: FiscalReceiptType.SALE,
          total: 25000,
          payment: { cash: 15000, card: 10000 },
        },
        {
          type: FiscalReceiptType.SALE,
          total: 10000,
          payment: { cash: 5000, card: 5000 },
        },
        {
          type: FiscalReceiptType.REFUND,
          total: 3000,
          payment: { cash: 3000, card: 0 },
        },
      ]);

      const result = await service.getXReport(deviceId, orgId);

      expect(result.success).toBe(true);
      expect(result.totalSales).toBe(35000);
      expect(result.totalRefunds).toBe(3000);
      expect(result.totalCash).toBe(20000);
      expect(result.totalCard).toBe(15000);
      expect(result.receiptsCount).toBe(3);
      expect(result.shiftId).toBe(mockShift.id);
    });

    it("should throw BAD_REQUEST when no open shift exists", async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValue(null);

      await expect(service.getXReport(deviceId, orgId)).rejects.toThrow(
        HttpException,
      );
    });

    it("should throw NOT_FOUND when device does not exist", async () => {
      deviceRepo.findOne!.mockResolvedValue(null);

      await expect(service.getXReport(deviceId, orgId)).rejects.toThrow(
        HttpException,
      );
    });
  });

  // ================================================================
  // Receipt Operations
  // ================================================================

  describe("createReceipt", () => {
    const receiptDto: CreateReceiptDto = {
      device_id: deviceId,
      order_id: "order-1",
      type: FiscalReceiptType.SALE,
      items: [
        {
          name: "Coffee",
          ikpu_code: "10000000001000000",
          quantity: 1,
          price: 15000,
          vat_rate: 12,
          unit: "pcs",
        },
      ],
      payment: { cash: 15000, card: 0 },
    };

    it("should create a receipt when shift is open", async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValue(mockShift);
      receiptRepo.create!.mockImplementation((d) => d);
      receiptRepo.save!.mockImplementation(async (d) => ({
        id: "r1",
        ...d,
        retryCount: 0,
      }));
      mockMultikassa.createSaleReceipt!.mockResolvedValue({
        receipt_id: "ext-r1",
        fiscal_number: "FN-001",
        fiscal_sign: "FS-001",
        qr_code_url: "http://qr",
        receipt_url: "http://receipt",
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

    it("should throw BAD_REQUEST when no shift and autoOpenShift is false", async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValue(null);

      await expect(service.createReceipt(orgId, receiptDto)).rejects.toThrow(
        HttpException,
      );
    });

    it("should auto-open shift when configured", async () => {
      const autoDevice = {
        ...mockDevice,
        config: {
          ...mockDevice.config,
          autoOpenShift: true,
          defaultCashier: "Auto",
        },
      };
      deviceRepo.findOne!.mockResolvedValue(autoDevice);
      shiftRepo
        .findOne!.mockResolvedValueOnce(null) // getCurrentShift in createReceipt
        .mockResolvedValueOnce(null) // getCurrentShift in openShift
        .mockResolvedValueOnce(null); // lastShift in openShift
      mockMultikassa.openShift!.mockResolvedValue({ shiftId: "ext-s" });
      shiftRepo.create!.mockImplementation((d) => d);
      shiftRepo.save!.mockImplementation(async (d) => ({
        id: "new-shift",
        ...d,
      }));
      receiptRepo.create!.mockImplementation((d) => d);
      receiptRepo.save!.mockImplementation(async (d) => ({
        id: "r2",
        ...d,
        retryCount: 0,
      }));
      mockMultikassa.createSaleReceipt!.mockResolvedValue({
        receipt_id: "ext-r2",
        fiscal_number: "FN-002",
        fiscal_sign: "FS-002",
      });

      const result = await service.createReceipt(orgId, receiptDto);

      expect(result).toBeDefined();
    });
  });

  describe("createReceipt — fiscalization failure queuing", () => {
    const receiptDto: CreateReceiptDto = {
      device_id: deviceId,
      order_id: "order-fail",
      type: FiscalReceiptType.SALE,
      items: [
        {
          name: "Tea",
          ikpu_code: "10000000001000001",
          quantity: 2,
          price: 8000,
          vat_rate: 12,
          unit: "pcs",
        },
      ],
      payment: { cash: 16000, card: 0 },
    };

    it("should add to queue when fiscalization fails", async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValue(mockShift);
      receiptRepo.create!.mockImplementation((d) => d);
      receiptRepo.save!.mockImplementation(async (d) => ({
        id: "r-fail",
        ...d,
        retryCount: 0,
        metadata: {},
      }));
      mockMultikassa.createSaleReceipt!.mockRejectedValue(
        new Error("Provider timeout"),
      );
      queueRepo.create!.mockImplementation((d) => d);
      queueRepo.save!.mockImplementation(async (d) => ({ id: "q-fail", ...d }));
      mockFiscalQueue.add.mockResolvedValue({});

      const result = await service.createReceipt(orgId, receiptDto);

      expect(result).toBeDefined();
      expect(queueRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: "receipt_sale",
          organizationId: orgId,
        }),
      );
    });

    it("should queue refund operation when refund fiscalization fails", async () => {
      const refundDto: CreateReceiptDto = {
        ...receiptDto,
        type: FiscalReceiptType.REFUND,
      };
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValue(mockShift);
      receiptRepo.create!.mockImplementation((d) => d);
      receiptRepo.save!.mockImplementation(async (d) => ({
        id: "r-refund-fail",
        ...d,
        retryCount: 0,
        metadata: {},
      }));
      mockMultikassa.createRefundReceipt!.mockRejectedValue(
        new Error("Provider down"),
      );
      queueRepo.create!.mockImplementation((d) => d);
      queueRepo.save!.mockImplementation(async (d) => ({ id: "q-r", ...d }));
      mockFiscalQueue.add.mockResolvedValue({});

      const result = await service.createReceipt(orgId, refundDto);

      expect(result).toBeDefined();
      expect(queueRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ operation: "receipt_refund" }),
      );
    });
  });

  describe("fiscalizeReceipt", () => {
    const mockReceiptEntity = {
      id: "r-1",
      organizationId: orgId,
      deviceId,
      type: FiscalReceiptType.SALE,
      status: FiscalReceiptStatus.PENDING,
      items: [
        {
          name: "Coffee",
          ikpuCode: "10000000001000000",
          packageCode: "PKG",
          quantity: 1,
          price: 15000,
          vatRate: 12,
          unit: "pcs",
          vatAmount: 1607,
          total: 15000,
        },
      ],
      payment: { cash: 15000, card: 0 },
      total: 15000,
      retryCount: 0,
      metadata: {},
    } as unknown as FiscalReceipt;

    it("should set status to SUCCESS on successful fiscalization", async () => {
      receiptRepo.save!.mockImplementation(async (d) => d);
      mockMultikassa.createSaleReceipt!.mockResolvedValue({
        receipt_id: "ext-r1",
        fiscal_number: "FN-001",
        fiscal_sign: "FS-001",
        qr_code_url: "http://qr",
        receipt_url: "http://receipt",
      });

      const result = await service.fiscalizeReceipt(
        { ...mockReceiptEntity },
        mockDevice as FiscalDevice,
      );

      expect(result.status).toBe(FiscalReceiptStatus.SUCCESS);
      expect(result.externalReceiptId).toBe("ext-r1");
      expect(result.fiscalNumber).toBe("FN-001");
      expect(result.fiscalSign).toBe("FS-001");
      expect(result.qrCodeUrl).toBe("http://qr");
      expect(result.receiptUrl).toBe("http://receipt");
      expect(result.fiscalizedAt).toBeInstanceOf(Date);
    });

    it("should call createRefundReceipt for refund type", async () => {
      const refundReceipt = {
        ...mockReceiptEntity,
        type: FiscalReceiptType.REFUND,
      } as unknown as FiscalReceipt;
      receiptRepo.save!.mockImplementation(async (d) => d);
      mockMultikassa.createRefundReceipt!.mockResolvedValue({
        receipt_id: "ext-ref",
        fiscal_number: "FN-R1",
        fiscal_sign: "FS-R1",
        qr_code_url: "http://qr/r",
        receipt_url: "http://receipt/r",
      });

      const result = await service.fiscalizeReceipt(
        refundReceipt,
        mockDevice as FiscalDevice,
      );

      expect(mockMultikassa.createRefundReceipt).toHaveBeenCalled();
      expect(result.status).toBe(FiscalReceiptStatus.SUCCESS);
    });

    it("should set status to FAILED and rethrow on error", async () => {
      receiptRepo.save!.mockImplementation(async (d) => d);
      mockMultikassa.createSaleReceipt!.mockRejectedValue(
        new Error("API error"),
      );

      const receipt = { ...mockReceiptEntity };
      await expect(
        service.fiscalizeReceipt(receipt, mockDevice as FiscalDevice),
      ).rejects.toThrow("API error");

      expect(receipt.status).toBe(FiscalReceiptStatus.FAILED);
      expect(receipt.lastError).toBe("API error");
      expect(receipt.retryCount).toBe(1);
    });

    it("should handle unknown error type in catch block", async () => {
      receiptRepo.save!.mockImplementation(async (d) => d);
      mockMultikassa.createSaleReceipt!.mockRejectedValue("string error");

      const receipt = { ...mockReceiptEntity };
      await expect(
        service.fiscalizeReceipt(receipt, mockDevice as FiscalDevice),
      ).rejects.toBe("string error");

      expect(receipt.lastError).toBe("Unknown error");
    });
  });

  describe("getReceipt", () => {
    it("should return receipt when found", async () => {
      const receipt = { id: "r-1", organizationId: orgId };
      receiptRepo.findOne!.mockResolvedValue(receipt);

      const result = await service.getReceipt("r-1", orgId);

      expect(result).toEqual(receipt);
    });

    it("should throw NOT_FOUND when receipt does not exist", async () => {
      receiptRepo.findOne!.mockResolvedValue(null);
      await expect(service.getReceipt("missing", orgId)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe("getReceipts", () => {
    it("should build query with all filters", async () => {
      receiptRepo.createQueryBuilder!.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[{ id: "r1" }], 1]);

      const result = await service.getReceipts(orgId, {
        deviceId: "dev-1",
        shiftId: "shift-1",
        type: FiscalReceiptType.SALE,
        status: FiscalReceiptStatus.SUCCESS,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        limit: 10,
        offset: 0,
      });

      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(5);
      expect(result.receipts).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should use default limit and offset when not provided", async () => {
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

  describe("addToQueue", () => {
    it("should create a queue item and add to Bull queue", async () => {
      const item = { id: "qi-1", organizationId: orgId };
      queueRepo.create!.mockReturnValue(item);
      queueRepo.save!.mockResolvedValue(item);
      mockFiscalQueue.add.mockResolvedValue({});

      const result = await service.addToQueue(orgId, deviceId, "receipt_sale", {
        receiptId: "r1",
      });

      expect(queueRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          deviceId,
          operation: "receipt_sale",
          status: FiscalQueueStatus.PENDING,
          maxRetries: 5,
        }),
      );
      expect(mockFiscalQueue.add).toHaveBeenCalledWith(
        "process",
        { queueItemId: "qi-1" },
        expect.objectContaining({ attempts: 5 }),
      );
      expect(result).toEqual(item);
    });
  });

  describe("getQueueItems", () => {
    it("should return queue items filtered by status", async () => {
      queueRepo.find!.mockResolvedValue([]);

      await service.getQueueItems(orgId, FiscalQueueStatus.PENDING);

      expect(queueRepo.find).toHaveBeenCalledWith({
        where: { organizationId: orgId, status: FiscalQueueStatus.PENDING },
        order: { priority: "DESC", createdAt: "ASC" },
      });
    });

    it("should return all queue items when status is not provided", async () => {
      queueRepo.find!.mockResolvedValue([]);

      await service.getQueueItems(orgId);

      expect(queueRepo.find).toHaveBeenCalledWith({
        where: { organizationId: orgId },
        order: { priority: "DESC", createdAt: "ASC" },
      });
    });
  });

  describe("processQueueItem", () => {
    it("should skip when item is not found", async () => {
      queueRepo.findOne!.mockResolvedValue(null);

      await service.processQueueItem("missing-id");

      expect(queueRepo.save).not.toHaveBeenCalled();
    });

    it("should skip when item is already successful", async () => {
      queueRepo.findOne!.mockResolvedValue({
        id: "qi",
        status: FiscalQueueStatus.SUCCESS,
      });

      await service.processQueueItem("qi");

      expect(queueRepo.save).not.toHaveBeenCalled();
    });

    it("should mark item as FAILED when device not found", async () => {
      const item = {
        id: "qi",
        deviceId: "bad-dev",
        operation: "receipt_sale",
        payload: { receiptId: "r1" },
        status: FiscalQueueStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
      };
      queueRepo.findOne!.mockResolvedValue(item);
      queueRepo.save!.mockImplementation(async (d) => d);
      deviceRepo.findOne!.mockResolvedValue(null);

      await service.processQueueItem("qi");

      expect(item.retryCount).toBe(1);
    });

    it("should set status to RETRY when retryCount < maxRetries", async () => {
      const item: Record<string, unknown> = {
        id: "qi",
        deviceId: "dev",
        operation: "receipt_sale",
        payload: { receiptId: "r1" },
        status: FiscalQueueStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
      };
      queueRepo.findOne!.mockResolvedValue(item);
      queueRepo.save!.mockImplementation(async (d) => d);
      deviceRepo.findOne!.mockResolvedValue(null);

      await service.processQueueItem("qi");

      expect(item.status).toBe(FiscalQueueStatus.RETRY);
      expect(item.nextRetryAt).toBeDefined();
    });

    it("should set status to FAILED when retryCount >= maxRetries", async () => {
      const item: Record<string, unknown> = {
        id: "qi",
        deviceId: "dev",
        operation: "receipt_sale",
        payload: { receiptId: "r1" },
        status: FiscalQueueStatus.PENDING,
        retryCount: 4,
        maxRetries: 5,
      };
      queueRepo.findOne!.mockResolvedValue(item);
      queueRepo.save!.mockImplementation(async (d) => d);
      deviceRepo.findOne!.mockResolvedValue(null);

      await service.processQueueItem("qi");

      expect(item.status).toBe(FiscalQueueStatus.FAILED);
    });

    it("should process receipt_sale operation successfully", async () => {
      const receipt = {
        id: "r1",
        type: FiscalReceiptType.SALE,
        status: FiscalReceiptStatus.PENDING,
        items: [
          {
            name: "Coffee",
            ikpuCode: "10000000001000000",
            quantity: 1,
            price: 15000,
            vatRate: 12,
            unit: "pcs",
          },
        ],
        payment: { cash: 15000, card: 0 },
        total: 15000,
        retryCount: 0,
        metadata: {},
      };
      const item: Record<string, unknown> = {
        id: "qi",
        deviceId,
        operation: "receipt_sale",
        payload: { receiptId: "r1" },
        status: FiscalQueueStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
      };
      queueRepo.findOne!.mockResolvedValue(item);
      queueRepo.save!.mockImplementation(async (d) => d);
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      receiptRepo.findOne!.mockResolvedValue(receipt);
      receiptRepo.save!.mockImplementation(async (d) => d);
      mockMultikassa.createSaleReceipt!.mockResolvedValue({
        receipt_id: "ext-r1",
        fiscal_number: "FN-001",
        fiscal_sign: "FS-001",
        qr_code_url: "http://qr",
        receipt_url: "http://receipt",
      });

      await service.processQueueItem("qi");

      expect(item.status).toBe(FiscalQueueStatus.SUCCESS);
      expect(item.processedAt).toBeInstanceOf(Date);
    });

    it("should process shift_open operation for multikassa", async () => {
      const item = {
        id: "qi-shift",
        deviceId,
        operation: "shift_open",
        payload: { cashierName: "Cashier A" },
        status: FiscalQueueStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
      };
      queueRepo.findOne!.mockResolvedValue(item);
      queueRepo.save!.mockImplementation(async (d) => d);
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      mockMultikassa.openShift!.mockResolvedValue({ shiftId: "ext-s1" });

      await service.processQueueItem("qi-shift");

      expect(mockMultikassa.openShift).toHaveBeenCalledWith(
        deviceId,
        item.payload,
      );
      expect(item.status).toBe(FiscalQueueStatus.SUCCESS);
    });

    it("should process shift_close operation for multikassa", async () => {
      const item = {
        id: "qi-close",
        deviceId,
        operation: "shift_close",
        payload: { shiftId: "shift-1" },
        status: FiscalQueueStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
      };
      queueRepo.findOne!.mockResolvedValue(item);
      queueRepo.save!.mockImplementation(async (d) => d);
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      mockMultikassa.closeShift!.mockResolvedValue({
        zReportNumber: "Z-001",
        totalSales: 100000,
      });

      await service.processQueueItem("qi-close");

      expect(mockMultikassa.closeShift).toHaveBeenCalledWith(deviceId);
      expect(item.status).toBe(FiscalQueueStatus.SUCCESS);
    });

    it("should process x_report operation and store result", async () => {
      const item: Record<string, unknown> = {
        id: "qi-xr",
        deviceId,
        operation: "x_report",
        payload: {},
        status: FiscalQueueStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
      };
      queueRepo.findOne!.mockResolvedValue(item);
      queueRepo.save!.mockImplementation(async (d) => d);
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      const xReportData = {
        success: true,
        totalSales: 80000,
        totalRefunds: 1000,
        totalCash: 40000,
        totalCard: 40000,
        receiptsCount: 8,
      };
      mockMultikassa.getXReport!.mockResolvedValue(xReportData);

      await service.processQueueItem("qi-xr");

      expect(item.result).toEqual(xReportData);
      expect(item.status).toBe(FiscalQueueStatus.SUCCESS);
    });

    it("should skip receipt processing when receipt not found", async () => {
      const item = {
        id: "qi-no-receipt",
        deviceId,
        operation: "receipt_sale",
        payload: { receiptId: "missing" },
        status: FiscalQueueStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
      };
      queueRepo.findOne!.mockResolvedValue(item);
      queueRepo.save!.mockImplementation(async (d) => d);
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      receiptRepo.findOne!.mockResolvedValue(null);

      await service.processQueueItem("qi-no-receipt");

      expect(item.status).toBe(FiscalQueueStatus.SUCCESS);
    });

    it("should not call multikassa for shift_open when provider is not multikassa", async () => {
      const ofdDevice = { ...mockDevice, provider: "ofd" };
      const item = {
        id: "qi-ofd",
        deviceId,
        operation: "shift_open",
        payload: { cashierName: "A" },
        status: FiscalQueueStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
      };
      queueRepo.findOne!.mockResolvedValue(item);
      queueRepo.save!.mockImplementation(async (d) => d);
      deviceRepo.findOne!.mockResolvedValue(ofdDevice);

      await service.processQueueItem("qi-ofd");

      expect(mockMultikassa.openShift).not.toHaveBeenCalled();
      expect(item.status).toBe(FiscalQueueStatus.SUCCESS);
    });
  });

  // ================================================================
  // Statistics
  // ================================================================

  describe("getDeviceStatistics", () => {
    it("should return complete device statistics", async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValue(mockShift);
      receiptRepo.find!.mockResolvedValue([
        { type: FiscalReceiptType.SALE, total: 10000 },
        { type: FiscalReceiptType.REFUND, total: 2000 },
      ]);
      queueRepo
        .count!.mockResolvedValueOnce(3) // pending
        .mockResolvedValueOnce(1); // failed

      const result = await service.getDeviceStatistics(deviceId, orgId);

      expect(result.deviceId).toBe(deviceId);
      expect(result.deviceName).toBe("Test Device");
      expect(result.currentShift).toBeDefined();
      expect(result.todayStats.receiptsCount).toBe(2);
      expect(result.todayStats.totalSales).toBe(10000);
      expect(result.todayStats.totalRefunds).toBe(2000);
      expect(result.queueStats.pending).toBe(3);
      expect(result.queueStats.failed).toBe(1);
    });

    it("should return statistics without current shift when none is open", async () => {
      deviceRepo.findOne!.mockResolvedValue(mockDevice);
      shiftRepo.findOne!.mockResolvedValue(null);
      receiptRepo.find!.mockResolvedValue([]);
      queueRepo.count!.mockResolvedValue(0);

      const result = await service.getDeviceStatistics(deviceId, orgId);

      expect(result.currentShift).toBeUndefined();
    });
  });
});
