import { Test, TestingModule } from "@nestjs/testing";
import { PayoutRequestsController } from "./payout-requests.controller";
import { PayoutRequestsService } from "./payout-requests.service";
import {
  PayoutRequestStatus,
  PayoutMethod,
} from "./entities/payout-request.entity";
import { ReviewAction } from "./dto/review-payout-request.dto";

describe("PayoutRequestsController", () => {
  let controller: PayoutRequestsController;
  let service: jest.Mocked<PayoutRequestsService>;

  const orgId = "org-uuid-1";
  const userId = "user-uuid-1";

  const mockService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    review: jest.fn(),
    cancel: jest.fn(),
    remove: jest.fn(),
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayoutRequestsController],
      providers: [{ provide: PayoutRequestsService, useValue: mockService }],
    }).compile();

    controller = module.get<PayoutRequestsController>(PayoutRequestsController);
    service = module.get(PayoutRequestsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("should pass orgId and query to service", async () => {
      const query = { page: 1, limit: 20 };
      const expected = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
      mockService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(orgId, query);

      expect(service.findAll).toHaveBeenCalledWith(orgId, query);
      expect(result).toEqual(expected);
    });
  });

  describe("getStats", () => {
    it("should return stats from service", async () => {
      const stats = [{ status: "pending", count: 5, totalAmount: 2500000 }];
      mockService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats(orgId);

      expect(service.getStats).toHaveBeenCalledWith(orgId);
      expect(result).toEqual(stats);
    });
  });

  describe("findOne", () => {
    it("should pass id and orgId to findById", async () => {
      const payout = { id: "p-1", status: PayoutRequestStatus.PENDING };
      mockService.findById.mockResolvedValue(payout);

      const result = await controller.findOne(orgId, "p-1");

      expect(service.findById).toHaveBeenCalledWith("p-1", orgId);
      expect(result).toEqual(payout);
    });
  });

  describe("create", () => {
    it("should pass orgId, userId, and dto to service", async () => {
      const dto = { amount: 500000, payoutMethod: PayoutMethod.CASH };
      const created = {
        id: "p-1",
        ...dto,
        status: PayoutRequestStatus.PENDING,
      };
      mockService.create.mockResolvedValue(created);

      const result = await controller.create(orgId, userId, dto);

      expect(service.create).toHaveBeenCalledWith(orgId, userId, dto);
      expect(result).toEqual(created);
    });
  });

  describe("review", () => {
    it("should pass all params to service.review", async () => {
      const dto = { action: ReviewAction.APPROVE };
      const reviewed = { id: "p-1", status: PayoutRequestStatus.APPROVED };
      mockService.review.mockResolvedValue(reviewed);

      const result = await controller.review(orgId, userId, "p-1", dto);

      expect(service.review).toHaveBeenCalledWith("p-1", orgId, userId, dto);
      expect(result).toEqual(reviewed);
    });
  });

  describe("cancel", () => {
    it("should pass all params to service.cancel", async () => {
      const cancelled = { id: "p-1", status: PayoutRequestStatus.CANCELLED };
      mockService.cancel.mockResolvedValue(cancelled);

      const result = await controller.cancel(orgId, userId, "p-1");

      expect(service.cancel).toHaveBeenCalledWith("p-1", orgId, userId);
      expect(result).toEqual(cancelled);
    });
  });

  describe("remove", () => {
    it("should call service.remove with id and orgId", async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove(orgId, "p-1");

      expect(service.remove).toHaveBeenCalledWith("p-1", orgId);
    });
  });
});
