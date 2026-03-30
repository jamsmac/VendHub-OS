import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { Repository, DataSource } from "typeorm";
import { PayoutRequestsService } from "./payout-requests.service";
import {
  PayoutRequest,
  PayoutRequestStatus,
  PayoutMethod,
} from "./entities/payout-request.entity";
import { ReviewAction } from "./dto/review-payout-request.dto";

describe("PayoutRequestsService", () => {
  let service: PayoutRequestsService;
  let _repo: jest.Mocked<Repository<PayoutRequest>>;
  let _dataSource: jest.Mocked<DataSource>;

  const orgId = "org-uuid-1";
  const userId = "user-uuid-1";
  const reviewerId = "reviewer-uuid-1";

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  // Helper to create a mock PayoutRequest
  function makePayout(overrides: Partial<PayoutRequest> = {}): PayoutRequest {
    return {
      id: "payout-uuid-1",
      organizationId: orgId,
      amount: 500000,
      status: PayoutRequestStatus.PENDING,
      payoutMethod: PayoutMethod.BANK_TRANSFER,
      requestedById: userId,
      reviewedById: null,
      reviewedAt: null,
      completedAt: null,
      reason: null,
      reviewComment: null,
      payoutDestination: null,
      transactionReference: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      createdById: userId,
      updatedById: null,
      ...overrides,
    } as PayoutRequest;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutRequestsService,
        {
          provide: getRepositoryToken(PayoutRequest),
          useValue: mockRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<PayoutRequestsService>(PayoutRequestsService);
    _repo = module.get(getRepositoryToken(PayoutRequest));
    _dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // create
  // ==========================================================================

  describe("create", () => {
    it("should create a PENDING payout request", async () => {
      const dto = {
        amount: 500000,
        payoutMethod: PayoutMethod.CARD,
        reason: "Monthly withdrawal",
      };

      const created = makePayout({
        ...dto,
        requestedById: userId,
        status: PayoutRequestStatus.PENDING,
      });

      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      const result = await service.create(orgId, userId, dto);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          amount: 500000,
          payoutMethod: PayoutMethod.CARD,
          reason: "Monthly withdrawal",
          requestedById: userId,
          status: PayoutRequestStatus.PENDING,
        }),
      );
      expect(result).toEqual(created);
    });

    it("should default payoutDestination to null when not provided", async () => {
      const dto = { amount: 100000 };
      const created = makePayout({ amount: 100000 });

      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      await service.create(orgId, userId, dto);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ payoutDestination: null }),
      );
    });
  });

  // ==========================================================================
  // findById
  // ==========================================================================

  describe("findById", () => {
    it("should return a payout request filtered by orgId", async () => {
      const payout = makePayout();
      mockRepo.findOne.mockResolvedValue(payout);

      const result = await service.findById("payout-uuid-1", orgId);

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: "payout-uuid-1", organizationId: orgId },
      });
      expect(result).toEqual(payout);
    });

    it("should throw NotFoundException when not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findById("nonexistent-id", orgId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException for cross-org access", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findById("payout-uuid-1", "other-org"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // review (approve/reject) — status machine critical path
  // ==========================================================================

  describe("review", () => {
    it("should approve a PENDING request", async () => {
      const pending = makePayout({ status: PayoutRequestStatus.PENDING });
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue({ ...pending }),
        save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockTxRepo),
        };
        return callback(mockManager as any);
      });

      const result = await service.review("payout-uuid-1", orgId, reviewerId, {
        action: ReviewAction.APPROVE,
      });

      expect(result.status).toBe(PayoutRequestStatus.APPROVED);
      expect(result.reviewedById).toBe(reviewerId);
      expect(result.reviewedAt).toBeInstanceOf(Date);
    });

    it("should reject a PENDING request with comment", async () => {
      const pending = makePayout({ status: PayoutRequestStatus.PENDING });
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue({ ...pending }),
        save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockTxRepo),
        };
        return callback(mockManager as any);
      });

      const result = await service.review("payout-uuid-1", orgId, reviewerId, {
        action: ReviewAction.REJECT,
        comment: "Insufficient documentation",
      });

      expect(result.status).toBe(PayoutRequestStatus.REJECTED);
      expect(result.reviewComment).toBe("Insufficient documentation");
    });

    it("should throw BadRequestException when rejecting without comment", async () => {
      const pending = makePayout({ status: PayoutRequestStatus.PENDING });
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue({ ...pending }),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockTxRepo),
        };
        return callback(mockManager as any);
      });

      await expect(
        service.review("payout-uuid-1", orgId, reviewerId, {
          action: ReviewAction.REJECT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when reviewing non-PENDING request", async () => {
      const approved = makePayout({
        status: PayoutRequestStatus.APPROVED,
      });
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue({ ...approved }),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockTxRepo),
        };
        return callback(mockManager as any);
      });

      await expect(
        service.review("payout-uuid-1", orgId, reviewerId, {
          action: ReviewAction.APPROVE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when payout does not exist", async () => {
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockTxRepo),
        };
        return callback(mockManager as any);
      });

      await expect(
        service.review("nonexistent", orgId, reviewerId, {
          action: ReviewAction.APPROVE,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when reviewer is the requester (self-approval)", async () => {
      const pending = makePayout({
        status: PayoutRequestStatus.PENDING,
        requestedById: userId,
      });
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue({ ...pending }),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockTxRepo),
        };
        return callback(mockManager as any);
      });

      await expect(
        service.review("payout-uuid-1", orgId, userId, {
          action: ReviewAction.APPROVE,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // cancel — only PENDING can be cancelled
  // ==========================================================================

  describe("cancel", () => {
    it("should cancel a PENDING request", async () => {
      const pending = makePayout({ status: PayoutRequestStatus.PENDING });
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue({ ...pending }),
        save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockTxRepo),
        };
        return callback(mockManager as any);
      });

      const result = await service.cancel("payout-uuid-1", orgId, userId);
      expect(result.status).toBe(PayoutRequestStatus.CANCELLED);
    });

    it("should throw BadRequestException when cancelling APPROVED request", async () => {
      const approved = makePayout({
        status: PayoutRequestStatus.APPROVED,
      });
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue({ ...approved }),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockTxRepo),
        };
        return callback(mockManager as any);
      });

      await expect(
        service.cancel("payout-uuid-1", orgId, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // remove — only PENDING or CANCELLED can be deleted
  // ==========================================================================

  describe("remove", () => {
    it("should soft-delete a PENDING request", async () => {
      const pending = makePayout({ status: PayoutRequestStatus.PENDING });
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue({ ...pending }),
        softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockTxRepo),
        };
        return callback(mockManager as any);
      });

      await service.remove("payout-uuid-1", orgId);

      expect(mockTxRepo.softDelete).toHaveBeenCalledWith("payout-uuid-1");
    });

    it("should soft-delete a CANCELLED request", async () => {
      const cancelled = makePayout({
        status: PayoutRequestStatus.CANCELLED,
      });
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue({ ...cancelled }),
        softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockTxRepo),
        };
        return callback(mockManager as any);
      });

      await service.remove("payout-uuid-1", orgId);

      expect(mockTxRepo.softDelete).toHaveBeenCalledWith("payout-uuid-1");
    });

    it("should throw BadRequestException for COMPLETED request", async () => {
      const completed = makePayout({
        status: PayoutRequestStatus.COMPLETED,
      });
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue({ ...completed }),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockTxRepo),
        };
        return callback(mockManager as any);
      });

      await expect(service.remove("payout-uuid-1", orgId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException for APPROVED request", async () => {
      const approved = makePayout({
        status: PayoutRequestStatus.APPROVED,
      });
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue({ ...approved }),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockTxRepo),
        };
        return callback(mockManager as any);
      });

      await expect(service.remove("payout-uuid-1", orgId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when payout does not exist", async () => {
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockTxRepo),
        };
        return callback(mockManager as any);
      });

      await expect(service.remove("nonexistent", orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================================================
  // markProcessing — only APPROVED → PROCESSING
  // ==========================================================================

  describe("markProcessing", () => {
    it("should transition APPROVED to PROCESSING", async () => {
      const approved = makePayout({
        status: PayoutRequestStatus.APPROVED,
      });
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue({ ...approved }),
        save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockTxRepo),
        };
        return callback(mockManager as any);
      });

      const result = await service.markProcessing("payout-uuid-1", orgId);
      expect(result.status).toBe(PayoutRequestStatus.PROCESSING);
    });

    it("should throw for PENDING request", async () => {
      const pending = makePayout({ status: PayoutRequestStatus.PENDING });
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue({ ...pending }),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockTxRepo),
        };
        return callback(mockManager as any);
      });

      await expect(
        service.markProcessing("payout-uuid-1", orgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // complete — only PROCESSING → COMPLETED
  // ==========================================================================

  describe("complete", () => {
    it("should transition PROCESSING to COMPLETED with reference", async () => {
      const processing = makePayout({
        status: PayoutRequestStatus.PROCESSING,
      });
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue({ ...processing }),
        save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockTxRepo),
        };
        return callback(mockManager as any);
      });

      const result = await service.complete(
        "payout-uuid-1",
        "TXN-12345",
        orgId,
      );

      expect(result.status).toBe(PayoutRequestStatus.COMPLETED);
      expect(result.transactionReference).toBe("TXN-12345");
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it("should throw for PENDING request", async () => {
      const pending = makePayout({ status: PayoutRequestStatus.PENDING });
      const mockTxRepo = {
        findOne: jest.fn().mockResolvedValue({ ...pending }),
      };

      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue(mockTxRepo),
        };
        return callback(mockManager as any);
      });

      await expect(
        service.complete("payout-uuid-1", "TXN-12345", orgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // getStats
  // ==========================================================================

  describe("getStats", () => {
    it("should return aggregated stats by status", async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: "pending", count: "3", totalAmount: "1500000" },
          { status: "completed", count: "10", totalAmount: "8000000" },
        ]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      const result = await service.getStats(orgId);

      expect(result).toEqual([
        { status: "pending", count: 3, totalAmount: 1500000 },
        { status: "completed", count: 10, totalAmount: 8000000 },
      ]);
    });
  });
});
