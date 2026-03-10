import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, In } from "typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
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
import { MultiKassaService, CreateReceiptRequest } from "./multikassa.service";
import { CreateFiscalDeviceDto } from "../dto/create-fiscal-device.dto";
import { UpdateFiscalDeviceDto } from "../dto/update-fiscal-device.dto";
import { CreateFiscalReceiptDto } from "../dto/create-fiscal-receipt.dto";

interface ShiftOpenResult {
  shiftId?: string;
}

interface ShiftCloseResult {
  zReportNumber?: string;
  zReportUrl?: string;
  totalSales?: number;
  totalRefunds?: number;
  totalCash?: number;
  totalCard?: number;
  receiptsCount?: number;
  vatSummary?: { rate: number; amount: number; taxAmount: number }[];
}

export interface XReportResult {
  success: boolean;
  totalSales: number;
  totalRefunds: number;
  totalCash: number;
  totalCard: number;
  receiptsCount: number;
  shiftId: string;
  shiftNumber: number;
}

interface QueueWhereClause {
  organizationId: string;
  status?: FiscalQueueStatus;
}

export interface ShiftStatistics {
  shiftId: string;
  shiftNumber: number;
  status: FiscalShiftStatus;
  openedAt: Date;
  closedAt?: Date;
  cashierName: string;
  totalSales: number;
  totalRefunds: number;
  totalCash: number;
  totalCard: number;
  receiptsCount: number;
  netTotal: number;
}

export interface DeviceStatistics {
  deviceId: string;
  deviceName: string;
  status: FiscalDeviceStatus;
  currentShift?: ShiftStatistics;
  todayStats: {
    receiptsCount: number;
    totalSales: number;
    totalRefunds: number;
  };
  queueStats: {
    pending: number;
    failed: number;
  };
}

@Injectable()
export class FiscalService {
  private readonly logger = new Logger(FiscalService.name);

  constructor(
    @InjectRepository(FiscalReceipt)
    private receiptRepo: Repository<FiscalReceipt>,
    @InjectRepository(FiscalShift)
    private shiftRepo: Repository<FiscalShift>,
    @InjectRepository(FiscalDevice)
    private deviceRepo: Repository<FiscalDevice>,
    @InjectRepository(FiscalQueue)
    private queueRepo: Repository<FiscalQueue>,
    @InjectQueue("fiscal")
    private fiscalQueue: Queue,
    private multikassaService: MultiKassaService,
  ) {}

  // ============================================
  // Device Management
  // ============================================

  async createDevice(
    organizationId: string,
    dto: CreateFiscalDeviceDto,
  ): Promise<FiscalDevice> {
    const credentials = {
      login: dto.credentials.login,
      password: dto.credentials.password,
      companyTin: dto.credentials.company_tin,
      apiKey: dto.credentials.api_key,
    };

    const config = dto.config
      ? {
          baseUrl: dto.config.base_url,
          defaultCashier: dto.config.default_cashier,
          vatRates: dto.config.vat_rates,
          autoOpenShift: dto.config.auto_open_shift,
          autoCloseShift: dto.config.auto_close_shift,
          closeShiftAt: dto.config.close_shift_at,
        }
      : {};

    const device = this.deviceRepo.create({
      organizationId,
      name: dto.name,
      provider: dto.provider,
      serialNumber: dto.serial_number,
      terminalId: dto.terminal_id,
      credentials,
      sandboxMode: dto.sandbox_mode ?? true,
      config,
      status: FiscalDeviceStatus.INACTIVE,
    });

    const saved = await this.deviceRepo.save(device);

    // Register with provider service
    if (dto.provider === "multikassa") {
      this.multikassaService.registerDevice(saved.id, {
        baseUrl: dto.config?.base_url || "http://localhost:8080/api/v1",
        sandboxMode: dto.sandbox_mode ?? true,
        credentials: {
          login: dto.credentials.login || "",
          password: dto.credentials.password || "",
          companyTin: dto.credentials.company_tin || "",
          defaultCashier: dto.config?.default_cashier,
        },
      });
    }

    this.logger.log(`Created fiscal device: ${saved.id}`);
    return saved;
  }

  async updateDevice(
    deviceId: string,
    organizationId: string,
    updates: UpdateFiscalDeviceDto,
  ): Promise<FiscalDevice> {
    const device = await this.getDevice(deviceId, organizationId);

    if (updates.name) device.name = updates.name;
    if (updates.serial_number) device.serialNumber = updates.serial_number;
    if (updates.terminal_id) device.terminalId = updates.terminal_id;
    if (updates.credentials) {
      device.credentials = {
        ...device.credentials,
        ...(updates.credentials.login !== undefined && {
          login: updates.credentials.login,
        }),
        ...(updates.credentials.password !== undefined && {
          password: updates.credentials.password,
        }),
        ...(updates.credentials.company_tin !== undefined && {
          companyTin: updates.credentials.company_tin,
        }),
        ...(updates.credentials.api_key !== undefined && {
          apiKey: updates.credentials.api_key,
        }),
      };
    }
    if (updates.config) {
      device.config = {
        ...device.config,
        ...(updates.config.base_url !== undefined && {
          baseUrl: updates.config.base_url,
        }),
        ...(updates.config.default_cashier !== undefined && {
          defaultCashier: updates.config.default_cashier,
        }),
        ...(updates.config.vat_rates !== undefined && {
          vatRates: updates.config.vat_rates,
        }),
        ...(updates.config.auto_open_shift !== undefined && {
          autoOpenShift: updates.config.auto_open_shift,
        }),
        ...(updates.config.auto_close_shift !== undefined && {
          autoCloseShift: updates.config.auto_close_shift,
        }),
        ...(updates.config.close_shift_at !== undefined && {
          closeShiftAt: updates.config.close_shift_at,
        }),
      };
    }
    if (updates.sandbox_mode !== undefined) {
      device.sandboxMode = updates.sandbox_mode;
    }

    const saved = await this.deviceRepo.save(device);

    // Update provider service
    if (device.provider === "multikassa") {
      this.multikassaService.registerDevice(saved.id, {
        baseUrl: device.config.baseUrl || "http://localhost:8080/api/v1",
        sandboxMode: device.sandboxMode,
        credentials: {
          login: device.credentials.login || "",
          password: device.credentials.password || "",
          companyTin: device.credentials.companyTin || "",
          defaultCashier: device.config.defaultCashier,
        },
      });
    }

    return saved;
  }

  async getDevice(
    deviceId: string,
    organizationId: string,
  ): Promise<FiscalDevice> {
    const device = await this.deviceRepo.findOne({
      where: { id: deviceId, organizationId },
    });

    if (!device) {
      throw new HttpException("Fiscal device not found", HttpStatus.NOT_FOUND);
    }

    return device;
  }

  async getDevices(organizationId: string): Promise<FiscalDevice[]> {
    return this.deviceRepo.find({
      where: { organizationId },
      order: { createdAt: "DESC" },
    });
  }

  async activateDevice(
    deviceId: string,
    organizationId: string,
  ): Promise<FiscalDevice> {
    const device = await this.getDevice(deviceId, organizationId);
    device.status = FiscalDeviceStatus.ACTIVE;
    return this.deviceRepo.save(device);
  }

  async deactivateDevice(
    deviceId: string,
    organizationId: string,
  ): Promise<FiscalDevice> {
    const device = await this.getDevice(deviceId, organizationId);
    device.status = FiscalDeviceStatus.INACTIVE;
    return this.deviceRepo.save(device);
  }

  // ============================================
  // Shift Management
  // ============================================

  async openShift(
    deviceId: string,
    organizationId: string,
    cashierName: string,
  ): Promise<FiscalShift> {
    const device = await this.getDevice(deviceId, organizationId);

    // Check if shift is already open
    const existingShift = await this.getCurrentShift(deviceId);
    if (existingShift) {
      throw new HttpException("Shift is already open", HttpStatus.BAD_REQUEST);
    }

    // Open shift in provider
    let externalResult: ShiftOpenResult | null = null;
    if (device.provider === "multikassa") {
      try {
        externalResult = await this.multikassaService.openShift(deviceId, {
          cashierName,
        });
      } catch (error: unknown) {
        // Add to queue for retry
        await this.addToQueue(organizationId, deviceId, "shift_open", {
          cashierName,
        });
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.warn(`Shift open failed, added to queue: ${errorMessage}`);
      }
    }

    // Get last shift number
    const lastShift = await this.shiftRepo.findOne({
      where: { deviceId },
      order: { shiftNumber: "DESC" },
    });

    const shift = this.shiftRepo.create({
      organizationId,
      deviceId,
      externalShiftId: externalResult?.shiftId,
      shiftNumber: (lastShift?.shiftNumber || 0) + 1,
      status: FiscalShiftStatus.OPEN,
      cashierName,
      openedAt: new Date(),
    });

    const saved = await this.shiftRepo.save(shift);
    this.logger.log(`Opened shift ${saved.shiftNumber} for device ${deviceId}`);
    return saved;
  }

  async closeShift(
    deviceId: string,
    organizationId: string,
  ): Promise<FiscalShift> {
    const device = await this.getDevice(deviceId, organizationId);
    const shift = await this.getCurrentShift(deviceId);

    if (!shift) {
      throw new HttpException("No open shift found", HttpStatus.BAD_REQUEST);
    }

    // Close shift in provider
    let externalResult: ShiftCloseResult | null = null;
    if (device.provider === "multikassa") {
      try {
        const response = await this.multikassaService.closeShift(deviceId);
        externalResult = {
          zReportNumber: response.zReportNumber,
          zReportUrl: response.zReportUrl,
          totalSales: response.totalSales,
          totalRefunds: response.totalRefunds,
          totalCash: response.totalCash,
          totalCard: response.totalCard,
          receiptsCount: response.receiptsCount,
          vatSummary: response.vatSummary?.map((v) => ({
            rate: v.rate,
            amount: v.amount,
            taxAmount: 0,
          })),
        };
      } catch (error: unknown) {
        await this.addToQueue(organizationId, deviceId, "shift_close", {
          shiftId: shift.id,
        });
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.warn(`Shift close failed, added to queue: ${errorMessage}`);
      }
    }

    // Update shift
    shift.status = FiscalShiftStatus.CLOSED;
    shift.closedAt = new Date();

    if (externalResult) {
      shift.zReportNumber = externalResult.zReportNumber ?? shift.zReportNumber;
      shift.zReportUrl = externalResult.zReportUrl ?? shift.zReportUrl;
      shift.totalSales = externalResult.totalSales ?? shift.totalSales;
      shift.totalRefunds = externalResult.totalRefunds ?? shift.totalRefunds;
      shift.totalCash = externalResult.totalCash ?? shift.totalCash;
      shift.totalCard = externalResult.totalCard ?? shift.totalCard;
      shift.receiptsCount = externalResult.receiptsCount ?? shift.receiptsCount;
      shift.vatSummary = externalResult.vatSummary ?? shift.vatSummary;
    }

    const saved = await this.shiftRepo.save(shift);
    this.logger.log(`Closed shift ${saved.shiftNumber} for device ${deviceId}`);
    return saved;
  }

  async getCurrentShift(deviceId: string): Promise<FiscalShift | null> {
    return this.shiftRepo.findOne({
      where: { deviceId, status: FiscalShiftStatus.OPEN },
      order: { openedAt: "DESC" },
    });
  }

  async getShiftHistory(
    deviceId: string,
    organizationId: string,
    limit = 30,
  ): Promise<FiscalShift[]> {
    await this.getDevice(deviceId, organizationId); // Verify access

    return this.shiftRepo.find({
      where: { deviceId },
      order: { openedAt: "DESC" },
      take: limit,
    });
  }

  async getXReport(
    deviceId: string,
    organizationId: string,
  ): Promise<XReportResult> {
    const device = await this.getDevice(deviceId, organizationId);
    const shift = await this.getCurrentShift(deviceId);

    if (!shift) {
      throw new HttpException("No open shift found", HttpStatus.BAD_REQUEST);
    }

    if (device.provider === "multikassa") {
      const xReport = await this.multikassaService.getXReport(deviceId);
      return {
        ...xReport,
        shiftId: shift.id,
        shiftNumber: shift.shiftNumber,
      };
    }

    // Calculate from local data
    const receipts = await this.receiptRepo.find({
      where: { shiftId: shift.id },
    });

    const stats = receipts.reduce(
      (acc, r) => {
        if (r.type === FiscalReceiptType.SALE) {
          acc.totalSales += Number(r.total);
          acc.totalCash += r.payment.cash;
          acc.totalCard += r.payment.card;
        } else {
          acc.totalRefunds += Number(r.total);
        }
        acc.receiptsCount++;
        return acc;
      },
      {
        totalSales: 0,
        totalRefunds: 0,
        totalCash: 0,
        totalCard: 0,
        receiptsCount: 0,
      },
    );

    return {
      success: true,
      ...stats,
      shiftId: shift.id,
      shiftNumber: shift.shiftNumber,
    };
  }

  // ============================================
  // Receipt Operations
  // ============================================

  async createReceipt(
    organizationId: string,
    dto: CreateFiscalReceiptDto,
  ): Promise<FiscalReceipt> {
    const device = await this.getDevice(dto.device_id, organizationId);

    // Ensure shift is open
    let shift = await this.getCurrentShift(dto.device_id);
    if (!shift) {
      if (device.config.autoOpenShift) {
        shift = await this.openShift(
          dto.device_id,
          organizationId,
          device.config.defaultCashier || "VendHub Auto",
        );
      } else {
        throw new HttpException(
          "No open shift. Please open shift first.",
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Map DTO items (snake_case) to entity items (camelCase) and calculate totals
    const items = dto.items.map((item) => {
      const total = item.price * item.quantity;
      const vatAmount = Math.round(
        (total * item.vat_rate) / (100 + item.vat_rate),
      );
      return {
        name: item.name,
        ikpuCode: item.ikpu_code,
        packageCode: item.package_code,
        quantity: item.quantity,
        price: item.price,
        vatRate: item.vat_rate,
        unit: item.unit,
        vatAmount,
        total,
      };
    });

    const total = items.reduce((sum, i) => sum + i.total, 0);
    const vatTotal = items.reduce((sum, i) => sum + i.vatAmount, 0);

    // Map metadata from snake_case to camelCase
    const metadata = dto.metadata
      ? {
          machineId: dto.metadata.machine_id,
          locationId: dto.metadata.location_id,
          operatorId: dto.metadata.operator_id,
          comment: dto.metadata.comment,
        }
      : {};

    // Create receipt record
    const receipt = this.receiptRepo.create({
      organizationId,
      deviceId: dto.device_id,
      shiftId: shift.id,
      orderId: dto.order_id,
      transactionId: dto.transaction_id,
      type: dto.type,
      status: FiscalReceiptStatus.PENDING,
      items,
      payment: dto.payment,
      total,
      vatTotal,
      metadata,
    });

    const saved = await this.receiptRepo.save(receipt);

    // Send to provider
    try {
      await this.fiscalizeReceipt(saved, device);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(
        `Fiscalization failed, adding to queue: ${errorMessage}`,
      );
      await this.addToQueue(
        organizationId,
        dto.device_id,
        dto.type === FiscalReceiptType.SALE ? "receipt_sale" : "receipt_refund",
        { receiptId: saved.id },
      );
    }

    return saved;
  }

  async fiscalizeReceipt(
    receipt: FiscalReceipt,
    device: FiscalDevice,
  ): Promise<FiscalReceipt> {
    receipt.status = FiscalReceiptStatus.PROCESSING;
    await this.receiptRepo.save(receipt);

    try {
      if (device.provider === "multikassa") {
        const request: CreateReceiptRequest = {
          type: receipt.type === FiscalReceiptType.SALE ? "sale" : "refund",
          items: receipt.items.map((i) => ({
            name: i.name,
            ikpu_code: i.ikpuCode,
            package_code: i.packageCode,
            quantity: i.quantity,
            price: i.price,
            vat_rate: i.vatRate,
            unit: i.unit,
          })),
          payment: receipt.payment,
          total: Number(receipt.total),
          orderId: receipt.orderId,
        };

        const result =
          receipt.type === FiscalReceiptType.SALE
            ? await this.multikassaService.createSaleReceipt(device.id, request)
            : await this.multikassaService.createRefundReceipt(
                device.id,
                request,
              );

        receipt.status = FiscalReceiptStatus.SUCCESS;
        receipt.externalReceiptId = result.receipt_id;
        receipt.fiscalNumber = result.fiscal_number;
        receipt.fiscalSign = result.fiscal_sign;
        receipt.qrCodeUrl = result.qr_code_url;
        receipt.receiptUrl = result.receipt_url;
        receipt.fiscalizedAt = new Date();
        receipt.metadata.rawResponse = result as unknown as Record<
          string,
          unknown
        >;
      }
    } catch (error: unknown) {
      receipt.status = FiscalReceiptStatus.FAILED;
      receipt.lastError =
        error instanceof Error ? error.message : "Unknown error";
      receipt.retryCount++;
      throw error;
    }

    return this.receiptRepo.save(receipt);
  }

  async getReceipt(
    receiptId: string,
    organizationId: string,
  ): Promise<FiscalReceipt> {
    const receipt = await this.receiptRepo.findOne({
      where: { id: receiptId, organizationId },
      relations: ["device", "shift"],
    });

    if (!receipt) {
      throw new HttpException("Receipt not found", HttpStatus.NOT_FOUND);
    }

    return receipt;
  }

  async getReceipts(
    organizationId: string,
    filters: {
      deviceId?: string;
      shiftId?: string;
      type?: FiscalReceiptType;
      status?: FiscalReceiptStatus;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ receipts: FiscalReceipt[]; total: number }> {
    const query = this.receiptRepo
      .createQueryBuilder("receipt")
      .where("receipt.organizationId = :organizationId", { organizationId });

    if (filters.deviceId) {
      query.andWhere("receipt.deviceId = :deviceId", {
        deviceId: filters.deviceId,
      });
    }
    if (filters.shiftId) {
      query.andWhere("receipt.shiftId = :shiftId", {
        shiftId: filters.shiftId,
      });
    }
    if (filters.type) {
      query.andWhere("receipt.type = :type", { type: filters.type });
    }
    if (filters.status) {
      query.andWhere("receipt.status = :status", { status: filters.status });
    }
    if (filters.startDate && filters.endDate) {
      query.andWhere("receipt.createdAt BETWEEN :start AND :end", {
        start: filters.startDate,
        end: filters.endDate,
      });
    }

    const [receipts, total] = await query
      .orderBy("receipt.createdAt", "DESC")
      .skip(filters.offset || 0)
      .take(filters.limit || 50)
      .getManyAndCount();

    return { receipts, total };
  }

  // ============================================
  // Queue Management
  // ============================================

  async addToQueue(
    organizationId: string,
    deviceId: string,
    operation: FiscalQueue["operation"],
    payload: Record<string, unknown>,
    priority = 0,
  ): Promise<FiscalQueue> {
    const queueItem = this.queueRepo.create({
      organizationId,
      deviceId,
      operation,
      payload,
      status: FiscalQueueStatus.PENDING,
      priority,
      maxRetries: 5,
    });

    const saved = await this.queueRepo.save(queueItem);

    // Add to Bull queue for processing
    await this.fiscalQueue.add(
      "process",
      { queueItemId: saved.id },
      {
        attempts: 5,
        backoff: { type: "exponential", delay: 5000 },
        priority,
        removeOnComplete: { age: 7 * 24 * 3600 },
        removeOnFail: { age: 30 * 24 * 3600 },
      },
    );

    return saved;
  }

  async getQueueItems(
    organizationId: string,
    status?: FiscalQueueStatus,
  ): Promise<FiscalQueue[]> {
    const where: QueueWhereClause = { organizationId };
    if (status) where.status = status;

    return this.queueRepo.find({
      where,
      order: { priority: "DESC", createdAt: "ASC" },
    });
  }

  async processQueueItem(queueItemId: string): Promise<void> {
    const item = await this.queueRepo.findOne({ where: { id: queueItemId } });
    if (!item || item.status === FiscalQueueStatus.SUCCESS) return;

    item.status = FiscalQueueStatus.PROCESSING;
    await this.queueRepo.save(item);

    try {
      const device = await this.deviceRepo.findOne({
        where: { id: item.deviceId },
      });
      if (!device) throw new NotFoundException("Device not found");

      switch (item.operation) {
        case "receipt_sale":
        case "receipt_refund":
          const receipt = await this.receiptRepo.findOne({
            where: { id: item.payload.receiptId as string },
          });
          if (receipt) {
            await this.fiscalizeReceipt(receipt, device);
          }
          break;

        case "shift_open":
          if (device.provider === "multikassa") {
            await this.multikassaService.openShift(
              device.id,
              item.payload as unknown as Parameters<
                typeof this.multikassaService.openShift
              >[1],
            );
          }
          break;

        case "shift_close":
          if (device.provider === "multikassa") {
            await this.multikassaService.closeShift(device.id);
          }
          break;

        case "x_report":
          if (device.provider === "multikassa") {
            item.result = (await this.multikassaService.getXReport(
              device.id,
            )) as unknown as Record<string, unknown>;
          }
          break;
      }

      item.status = FiscalQueueStatus.SUCCESS;
      item.processedAt = new Date();
    } catch (error: unknown) {
      item.status = FiscalQueueStatus.FAILED;
      item.lastError = error instanceof Error ? error.message : "Unknown error";
      item.retryCount++;

      if (item.retryCount < item.maxRetries) {
        item.status = FiscalQueueStatus.RETRY;
        item.nextRetryAt = new Date(
          Date.now() + Math.pow(2, item.retryCount) * 5000,
        );
      }
    }

    await this.queueRepo.save(item);
  }

  // ============================================
  // Statistics
  // ============================================

  async getDeviceStatistics(
    deviceId: string,
    organizationId: string,
  ): Promise<DeviceStatistics> {
    const device = await this.getDevice(deviceId, organizationId);
    const currentShift = await this.getCurrentShift(deviceId);

    // Today's receipts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayReceipts = await this.receiptRepo.find({
      where: {
        deviceId,
        createdAt: Between(today, tomorrow),
      },
    });

    const todayStats = todayReceipts.reduce(
      (acc, r) => {
        if (r.type === FiscalReceiptType.SALE) {
          acc.totalSales += Number(r.total);
        } else {
          acc.totalRefunds += Number(r.total);
        }
        acc.receiptsCount++;
        return acc;
      },
      { totalSales: 0, totalRefunds: 0, receiptsCount: 0 },
    );

    // Queue stats
    const pendingQueue = await this.queueRepo.count({
      where: {
        deviceId,
        status: In([FiscalQueueStatus.PENDING, FiscalQueueStatus.RETRY]),
      },
    });
    const failedQueue = await this.queueRepo.count({
      where: { deviceId, status: FiscalQueueStatus.FAILED },
    });

    let shiftStats: ShiftStatistics | undefined;
    if (currentShift) {
      shiftStats = {
        shiftId: currentShift.id,
        shiftNumber: currentShift.shiftNumber,
        status: currentShift.status,
        openedAt: currentShift.openedAt,
        closedAt: currentShift.closedAt,
        cashierName: currentShift.cashierName,
        totalSales: Number(currentShift.totalSales),
        totalRefunds: Number(currentShift.totalRefunds),
        totalCash: Number(currentShift.totalCash),
        totalCard: Number(currentShift.totalCard),
        receiptsCount: currentShift.receiptsCount,
        netTotal:
          Number(currentShift.totalSales) - Number(currentShift.totalRefunds),
      };
    }

    return {
      deviceId,
      deviceName: device.name,
      status: device.status,
      currentShift: shiftStats,
      todayStats,
      queueStats: { pending: pendingQueue, failed: failedQueue },
    };
  }
}
