/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { PerformanceReviewService } from "./performance-review.service";
import {
  PerformanceReview,
  ReviewStatus,
  ReviewPeriod,
} from "../entities/performance-review.entity";
import { Employee } from "../entities/employee.entity";

const ORG_ID = "org-uuid-00000000-0000-0000-0000-000000000001";

describe("PerformanceReviewService", () => {
  let service: PerformanceReviewService;
  let reviewRepo: any;
  let employeeRepo: any;
  let eventEmitter: any;

  const mockEmployee = {
    id: "emp-uuid-1",
    organizationId: ORG_ID,
    firstName: "Aziz",
    lastName: "Karimov",
  } as Employee;

  const mockReview = {
    id: "rev-uuid-1",
    organizationId: ORG_ID,
    employeeId: "emp-uuid-1",
    reviewerId: "reviewer-uuid-1",
    reviewPeriod: ReviewPeriod.QUARTERLY,
    periodStart: new Date("2024-01-01"),
    periodEnd: new Date("2024-03-31"),
    status: ReviewStatus.SCHEDULED,
    overallRating: null,
    ratings: null,
    strengths: null,
    areasForImprovement: null,
    goals: null,
    employeeComments: null,
    reviewerComments: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as PerformanceReview;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockReview], 1]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceReviewService,
        {
          provide: getRepositoryToken(PerformanceReview),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PerformanceReviewService>(PerformanceReviewService);
    reviewRepo = module.get(getRepositoryToken(PerformanceReview));
    employeeRepo = module.get(getRepositoryToken(Employee));
    eventEmitter = module.get(EventEmitter2);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createReview", () => {
    it("should create a review for an existing employee", async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      reviewRepo.create.mockReturnValue(mockReview);
      reviewRepo.save.mockResolvedValue(mockReview);

      const dto = {
        employeeId: "emp-uuid-1",
        reviewerId: "reviewer-uuid-1",
        reviewPeriod: ReviewPeriod.QUARTERLY,
        periodStart: "2024-01-01",
        periodEnd: "2024-03-31",
      };

      const result = await service.createReview(ORG_ID, dto as any);

      expect(result).toBeDefined();
      expect(result.id).toBe("rev-uuid-1");
      expect(result.status).toBe(ReviewStatus.SCHEDULED);
      expect(reviewRepo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException when employee does not exist", async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      const dto = {
        employeeId: "non-existent",
        reviewerId: "reviewer-uuid-1",
        reviewPeriod: ReviewPeriod.QUARTERLY,
        periodStart: "2024-01-01",
        periodEnd: "2024-03-31",
      };

      await expect(service.createReview(ORG_ID, dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should set status to SCHEDULED on creation", async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      reviewRepo.create.mockReturnValue(mockReview);
      reviewRepo.save.mockResolvedValue(mockReview);

      const dto = {
        employeeId: "emp-uuid-1",
        reviewerId: "reviewer-uuid-1",
        reviewPeriod: ReviewPeriod.ANNUAL,
        periodStart: "2024-01-01",
        periodEnd: "2024-12-31",
      };

      await service.createReview(ORG_ID, dto as any);

      expect(reviewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReviewStatus.SCHEDULED,
          organizationId: ORG_ID,
        }),
      );
    });
  });

  describe("submitReview", () => {
    it("should submit a review with ratings", async () => {
      const scheduledReview = { ...mockReview, status: ReviewStatus.SCHEDULED };
      reviewRepo.findOne.mockResolvedValue(scheduledReview);
      reviewRepo.save.mockImplementation(async (r: any) => r);

      const dto = {
        overallRating: 4.5,
        ratings: { quality: 5, teamwork: 4 },
        strengths: "Excellent work",
        areasForImprovement: "Time management",
        goals: "Lead a project",
        reviewerComments: "Great progress",
      };

      const result = await service.submitReview(
        "rev-uuid-1",
        ORG_ID,
        dto as any,
      );

      expect(result.status).toBe(ReviewStatus.COMPLETED);
      expect(result.overallRating).toBe(4.5);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "review.completed",
        expect.objectContaining({
          reviewId: "rev-uuid-1",
          employeeId: "emp-uuid-1",
        }),
      );
    });

    it("should throw NotFoundException when review does not exist", async () => {
      reviewRepo.findOne.mockResolvedValue(null);

      await expect(
        service.submitReview("non-existent", ORG_ID, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when review is already completed", async () => {
      reviewRepo.findOne.mockResolvedValue({
        ...mockReview,
        status: ReviewStatus.COMPLETED,
      });

      await expect(
        service.submitReview("rev-uuid-1", ORG_ID, { overallRating: 3 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when review is cancelled", async () => {
      reviewRepo.findOne.mockResolvedValue({
        ...mockReview,
        status: ReviewStatus.CANCELLED,
      });

      await expect(
        service.submitReview("rev-uuid-1", ORG_ID, { overallRating: 3 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("should set completedAt timestamp on submission", async () => {
      const scheduledReview = {
        ...mockReview,
        status: ReviewStatus.IN_PROGRESS,
      };
      reviewRepo.findOne.mockResolvedValue(scheduledReview);
      reviewRepo.save.mockImplementation(async (r: any) => r);

      await service.submitReview("rev-uuid-1", ORG_ID, {
        overallRating: 4,
        ratings: {},
      } as any);

      expect(reviewRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: expect.any(Date),
        }),
      );
    });
  });

  describe("getReviews", () => {
    it("should return paginated reviews", async () => {
      const result = await service.getReviews(ORG_ID, {
        page: 1,
        limit: 20,
      } as any);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should filter by employeeId", async () => {
      await service.getReviews(ORG_ID, { employeeId: "emp-uuid-1" } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "r.employeeId = :employeeId",
        { employeeId: "emp-uuid-1" },
      );
    });

    it("should filter by status", async () => {
      await service.getReviews(ORG_ID, {
        status: ReviewStatus.COMPLETED,
      } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "r.status = :status",
        { status: ReviewStatus.COMPLETED },
      );
    });

    it("should filter by reviewPeriod", async () => {
      await service.getReviews(ORG_ID, {
        reviewPeriod: ReviewPeriod.QUARTERLY,
      } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "r.reviewPeriod = :reviewPeriod",
        { reviewPeriod: ReviewPeriod.QUARTERLY },
      );
    });
  });

  describe("getReview", () => {
    it("should return a single review by id", async () => {
      reviewRepo.findOne.mockResolvedValue(mockReview);

      const result = await service.getReview("rev-uuid-1", ORG_ID);

      expect(result.id).toBe("rev-uuid-1");
    });

    it("should throw NotFoundException when review not found", async () => {
      reviewRepo.findOne.mockResolvedValue(null);

      await expect(service.getReview("non-existent", ORG_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("mapReviewToDto", () => {
    it("should convert overallRating to number", () => {
      const review = { ...mockReview, overallRating: "4.5" as any };

      const dto = service.mapReviewToDto(review as PerformanceReview);

      expect(dto.overallRating).toBe(4.5);
      expect(typeof dto.overallRating).toBe("number");
    });

    it("should return null for missing overallRating", () => {
      const dto = service.mapReviewToDto(mockReview as PerformanceReview);

      expect(dto.overallRating).toBeNull();
    });
  });
});
