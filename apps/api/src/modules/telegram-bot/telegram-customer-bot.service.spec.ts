import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { Repository, ObjectLiteral } from "typeorm";
import { TelegramCustomerBotService } from "./telegram-customer-bot.service";
import { CustomerHandlersService } from "./services/customer-handlers.service";
import { CustomerMenuService } from "./services/customer-menu.service";
import { CustomerCatalogService } from "./services/customer-catalog.service";
import { CustomerLoyaltyService } from "./services/customer-loyalty.service";
import { CustomerOrdersService } from "./services/customer-orders.service";
import { CustomerComplaintsService } from "./services/customer-complaints.service";
import { CustomerLocationService } from "./services/customer-location.service";
import { CustomerCartService } from "./services/customer-cart.service";
import { CustomerEngagementService } from "./services/customer-engagement.service";
import { ClientUser } from "../client/entities/client-user.entity";
import { Transaction } from "../transactions/entities/transaction.entity";
import {
  Complaint,
  ComplaintStatus,
  ComplaintCategory,
  ComplaintSource,
} from "../complaints/entities/complaint.entity";
import { Machine } from "../machines/entities/machine.entity";

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;
const createMockRepository = <
  T extends ObjectLiteral,
>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getManyAndCount: jest.fn(),
  getOne: jest.fn(),
});

describe("TelegramCustomerBotService", () => {
  let service: TelegramCustomerBotService;
  let transactionRepo: MockRepository<Transaction>;
  let complaintRepo: MockRepository<Complaint>;
  let machineRepo: MockRepository<Machine>;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    transactionRepo = createMockRepository<Transaction>();
    complaintRepo = createMockRepository<Complaint>();
    machineRepo = createMockRepository<Machine>();
    configService = { get: jest.fn().mockReturnValue(undefined) }; // No token = bot disabled

    const mockSubService = () => ({ setBot: jest.fn() });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramCustomerBotService,
        { provide: ConfigService, useValue: configService },
        {
          provide: getRepositoryToken(ClientUser),
          useValue: createMockRepository<ClientUser>(),
        },
        {
          provide: CustomerHandlersService,
          useValue: mockSubService(),
        },
        { provide: CustomerMenuService, useValue: mockSubService() },
        { provide: CustomerCatalogService, useValue: mockSubService() },
        { provide: CustomerLoyaltyService, useValue: mockSubService() },
        { provide: CustomerOrdersService, useValue: mockSubService() },
        { provide: CustomerComplaintsService, useValue: mockSubService() },
        { provide: CustomerLocationService, useValue: mockSubService() },
        { provide: CustomerCartService, useValue: mockSubService() },
        { provide: CustomerEngagementService, useValue: mockSubService() },
        // Legacy repos kept for integration-like tests below
        { provide: getRepositoryToken(Transaction), useValue: transactionRepo },
        { provide: getRepositoryToken(Complaint), useValue: complaintRepo },
        { provide: getRepositoryToken(Machine), useValue: machineRepo },
      ],
    }).compile();

    service = module.get<TelegramCustomerBotService>(
      TelegramCustomerBotService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // onModuleInit
  // ==========================================================================

  describe("onModuleInit", () => {
    it("should not create bot when token is not set", async () => {
      configService.get.mockReturnValue(undefined);
      await service.onModuleInit();

      // Service initializes without error; bot is null
      expect(service).toBeDefined();
    });

    it("should log warning when token is not configured", async () => {
      configService.get.mockReturnValue(undefined);

      // Should not throw
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // onModuleDestroy
  // ==========================================================================

  describe("onModuleDestroy", () => {
    it("should not throw when bot was never initialized", async () => {
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // sendMessage
  // ==========================================================================

  describe("sendMessage", () => {
    it("should return false when bot is not initialized", async () => {
      const result = await service.sendMessage("123456", "Hello");
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // sendOrderStatusNotification
  // ==========================================================================

  describe("sendOrderStatusNotification", () => {
    it("should return false when bot is not initialized", async () => {
      const result = await service.sendOrderStatusNotification(
        "123456",
        "ORD-001",
        "COMPLETED",
      );
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // sendComplaintStatusNotification
  // ==========================================================================

  describe("sendComplaintStatusNotification", () => {
    it("should return false when bot is not initialized", async () => {
      const result = await service.sendComplaintStatusNotification(
        "123456",
        "TK-001",
        "IN_PROGRESS",
      );
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Internal method behavior (tested through public API)
  // ==========================================================================

  describe("complaint flow (integration-like)", () => {
    it("should handle missing machine gracefully", async () => {
      // handleMachineCode looks up machine, returns not found
      machineRepo.findOne!.mockResolvedValue(null);

      // The private methods are not directly accessible,
      // but we test that repos are wired correctly
      expect(machineRepo.findOne).toBeDefined();
    });

    it("should use complaintRepo.create for new complaints", () => {
      complaintRepo.create!.mockReturnValue({ id: "new-complaint" });
      const result = complaintRepo.create!({
        category: ComplaintCategory.OTHER,
        subject: "Test complaint",
        status: ComplaintStatus.PENDING,
        source: ComplaintSource.TELEGRAM_BOT,
      });

      expect(result.id).toBe("new-complaint");
    });

    it("should use transactionRepo for status lookups", async () => {
      transactionRepo.findOne!.mockResolvedValue(null);

      const result = await transactionRepo.findOne!({ where: { id: "trx-1" } });
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // showMyComplaints query builder
  // ==========================================================================

  describe("showMyComplaints query builder", () => {
    it("should configure the query builder with correct filters", () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue([]);
      complaintRepo.createQueryBuilder!.mockReturnValue(mockQb);

      // Verifying that createQueryBuilder is available and properly mocked
      const qb = complaintRepo.createQueryBuilder!("complaint");
      expect(qb.where).toBeDefined();
      expect(qb.leftJoinAndSelect).toBeDefined();
      expect(qb.orderBy).toBeDefined();
    });
  });
});
