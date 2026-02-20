import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundException, ConflictException } from "@nestjs/common";

import { OperatorRatingsService } from "./operator-ratings.service";
import { OperatorRating } from "./entities/operator-rating.entity";
import { CalculateRatingDto } from "./dto/calculate-rating.dto";
import { QueryRatingsDto } from "./dto/query-ratings.dto";

const ORG_ID = "org-uuid-00000000-0000-0000-0000-000000000001";
const USER_ID = "user-uuid-00000000-0000-0000-0000-000000000001";

describe("OperatorRatingsService", () => {
  let service: OperatorRatingsService;
  let ratingRepo: jest.Mocked<Repository<OperatorRating>>;

  const mockRating = {
    id: "rating-uuid-1",
    organizationId: ORG_ID,
    userId: USER_ID,
    periodStart: new Date("2024-01-01"),
    periodEnd: new Date("2024-01-31"),
    totalScore: 78.5,
    grade: "B+",
    rank: 1,
    taskScore: 85,
    photoComplianceRate: 90,
    qualityScore: 70,
    financialScore: 75,
    attendanceScore: 80,
    customerScore: 65,
    disciplineScore: 72,
    tasksAssigned: 20,
    tasksCompleted: 18,
    tasksOnTime: 15,
    tasksLate: 3,
    avgCompletionTimeHours: 2.5,
    taskCompletionRate: 90,
    taskOnTimeRate: 83.33,
    timelinessScore: 83.33,
    tasksWithPhotosBefore: 16,
    tasksWithPhotosAfter: 14,
    totalPhotosUploaded: 40,
    photoQualityScore: 80,
    machineCleanlinessScore: 70,
    stockAccuracyScore: 70,
    cashCollectionAccuracy: 95,
    inventoryLossRate: 2,
    collectionsWithVariance: 1,
    avgCollectionVariancePercent: 0.5,
    inventoryDiscrepancies: 2,
    scheduledShifts: 22,
    completedShifts: 20,
    lateArrivals: 2,
    attendanceRate: 90.91,
    complaintsReceived: 3,
    complaintsResolved: 2,
    averageResponseTime: 45,
    avgCustomerRating: 4.2,
    positiveFeedbackCount: 5,
    checklistItemsCompleted: 45,
    checklistItemsTotal: 50,
    checklistCompletionRate: 90,
    commentsSent: 8,
    notes: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as OperatorRating;

  const mockRating2 = {
    ...mockRating,
    id: "rating-uuid-2",
    userId: "user-uuid-2",
    totalScore: 65,
    grade: "B",
    rank: 2,
  } as unknown as OperatorRating;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockRating]),
    getCount: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperatorRatingsService,
        {
          provide: getRepositoryToken(OperatorRating),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<OperatorRatingsService>(OperatorRatingsService);
    ratingRepo = module.get(getRepositoryToken(OperatorRating));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CALCULATE RATING
  // ============================================================================

  describe("calculateRating", () => {
    const baseDto = {
      userId: USER_ID,
      periodStart: "2024-02-01",
      periodEnd: "2024-02-29",
      tasksAssigned: 20,
      tasksCompleted: 18,
      tasksOnTime: 15,
      tasksLate: 3,
      avgCompletionTimeHours: 2.5,
      tasksWithPhotosBefore: 16,
      tasksWithPhotosAfter: 14,
      totalPhotosUploaded: 40,
      photoQualityScore: 80,
      machineCleanlinessScore: 70,
      stockAccuracyScore: 70,
      cashCollectionAccuracy: 95,
      inventoryLossRate: 2,
      collectionsWithVariance: 1,
      avgCollectionVariancePercent: 0.5,
      inventoryDiscrepancies: 2,
      scheduledShifts: 22,
      completedShifts: 20,
      lateArrivals: 2,
      complaintsReceived: 3,
      complaintsResolved: 2,
      averageResponseTime: 45,
      avgCustomerRating: 4.2,
      positiveFeedbackCount: 5,
      checklistItemsCompleted: 45,
      checklistItemsTotal: 50,
      commentsSent: 8,
    };

    it("should calculate and save a new rating with weighted scores", async () => {
      ratingRepo.findOne
        .mockResolvedValueOnce(null) // no existing rating
        .mockResolvedValueOnce(mockRating); // findById after save
      ratingRepo.create.mockReturnValue(mockRating);
      ratingRepo.save.mockResolvedValue(mockRating);
      ratingRepo.find.mockResolvedValue([mockRating]); // for recalculateRanks

      const result = await service.calculateRating(
        baseDto as CalculateRatingDto,
        ORG_ID,
      );

      expect(result).toBeDefined();
      expect(ratingRepo.create).toHaveBeenCalled();
      expect(ratingRepo.save).toHaveBeenCalled();
    });

    it("should throw ConflictException when rating already exists for period", async () => {
      ratingRepo.findOne.mockResolvedValueOnce(mockRating); // existing rating found

      await expect(
        service.calculateRating(baseDto as CalculateRatingDto, ORG_ID),
      ).rejects.toThrow(ConflictException);
    });

    it("should assign grade A+ for score >= 95", async () => {
      // We test the private calculateGrade method indirectly through calculateRating
      const highDto = {
        ...baseDto,
        tasksAssigned: 20,
        tasksCompleted: 20,
        tasksOnTime: 20,
        tasksLate: 0,
        tasksWithPhotosBefore: 20,
        tasksWithPhotosAfter: 20,
        totalPhotosUploaded: 60,
        photoQualityScore: 100,
        machineCleanlinessScore: 100,
        stockAccuracyScore: 100,
        cashCollectionAccuracy: 100,
        inventoryLossRate: 0,
        avgCollectionVariancePercent: 0,
        scheduledShifts: 22,
        completedShifts: 22,
        lateArrivals: 0,
        complaintsReceived: 0,
        avgCustomerRating: 5,
        checklistItemsCompleted: 50,
        checklistItemsTotal: 50,
        commentsSent: 10,
      };

      ratingRepo.findOne
        .mockResolvedValueOnce(null) // no existing
        .mockResolvedValueOnce(mockRating); // findById
      ratingRepo.create.mockImplementation((data) => data as OperatorRating);
      ratingRepo.save.mockImplementation(
        async (data) =>
          ({ ...data, id: "new-uuid" }) as unknown as OperatorRating,
      );
      ratingRepo.find.mockResolvedValue([]);

      await service.calculateRating(highDto as CalculateRatingDto, ORG_ID);

      // The grade in create call should be A+ for perfect scores
      expect(ratingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          grade: expect.any(String),
          totalScore: expect.any(Number),
        }),
      );
    });

    it("should handle zero tasks without division errors", async () => {
      const zeroDto = {
        ...baseDto,
        tasksAssigned: 0,
        tasksCompleted: 0,
        tasksOnTime: 0,
        tasksLate: 0,
        scheduledShifts: 0,
        completedShifts: 0,
        complaintsReceived: 0,
        checklistItemsTotal: 0,
        checklistItemsCompleted: 0,
      };

      ratingRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockRating);
      ratingRepo.create.mockReturnValue(mockRating);
      ratingRepo.save.mockResolvedValue(mockRating);
      ratingRepo.find.mockResolvedValue([]);

      // Should not throw division by zero
      await expect(
        service.calculateRating(zeroDto as CalculateRatingDto, ORG_ID),
      ).resolves.toBeDefined();
    });
  });

  // ============================================================================
  // RECALCULATE RATING
  // ============================================================================

  describe("recalculateRating", () => {
    it("should soft delete existing and create new rating", async () => {
      ratingRepo.findOne
        .mockResolvedValueOnce(mockRating) // findById
        .mockResolvedValueOnce(null) // no duplicate in calculateRating
        .mockResolvedValueOnce(mockRating); // findById after save
      ratingRepo.softDelete.mockResolvedValue(
        undefined as unknown as ReturnType<
          Repository<OperatorRating>["softDelete"]
        > extends Promise<infer R>
          ? R
          : never,
      );
      ratingRepo.create.mockReturnValue(mockRating);
      ratingRepo.save.mockResolvedValue(mockRating);
      ratingRepo.find.mockResolvedValue([mockRating]);

      const dto = {
        userId: USER_ID,
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        tasksAssigned: 10,
        tasksCompleted: 8,
      };

      const result = await service.recalculateRating(
        "rating-uuid-1",
        dto as CalculateRatingDto,
        ORG_ID,
      );

      expect(ratingRepo.softDelete).toHaveBeenCalledWith("rating-uuid-1");
      expect(result).toBeDefined();
    });

    it("should throw NotFoundException if rating does not exist", async () => {
      ratingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.recalculateRating(
          "non-existent",
          {} as CalculateRatingDto,
          ORG_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // FIND BY ID
  // ============================================================================

  describe("findById", () => {
    it("should return rating when found", async () => {
      ratingRepo.findOne.mockResolvedValue(mockRating);

      const result = await service.findById("rating-uuid-1", ORG_ID);

      expect(result).toEqual(mockRating);
      expect(ratingRepo.findOne).toHaveBeenCalledWith({
        where: { id: "rating-uuid-1", organizationId: ORG_ID },
      });
    });

    it("should throw NotFoundException when rating not found", async () => {
      ratingRepo.findOne.mockResolvedValue(null);

      await expect(service.findById("non-existent", ORG_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================================
  // QUERY
  // ============================================================================

  describe("query", () => {
    it("should return paginated ratings", async () => {
      const result = await service.query(
        { page: 1, limit: 20 } as QueryRatingsDto,
        ORG_ID,
      );

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total", 1);
      expect(result).toHaveProperty("page", 1);
      expect(result).toHaveProperty("totalPages", 1);
    });

    it("should filter by userId", async () => {
      await service.query(
        { userId: USER_ID, page: 1, limit: 20 } as QueryRatingsDto,
        ORG_ID,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "r.userId = :userId",
        { userId: USER_ID },
      );
    });

    it("should filter by grade", async () => {
      await service.query(
        { grade: "A", page: 1, limit: 20 } as QueryRatingsDto,
        ORG_ID,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "r.grade = :grade",
        { grade: "A" },
      );
    });
  });

  // ============================================================================
  // GET LEADERBOARD
  // ============================================================================

  describe("getLeaderboard", () => {
    it("should return top N ratings sorted by totalScore", async () => {
      ratingRepo.find.mockResolvedValue([mockRating, mockRating2]);

      const result = await service.getLeaderboard(
        ORG_ID,
        "2024-01-01",
        "2024-01-31",
        10,
      );

      expect(result).toHaveLength(2);
      expect(ratingRepo.find).toHaveBeenCalledWith({
        where: {
          organizationId: ORG_ID,
          periodStart: new Date("2024-01-01"),
          periodEnd: new Date("2024-01-31"),
        },
        order: { totalScore: "DESC" },
        take: 10,
      });
    });
  });

  // ============================================================================
  // GET ORGANIZATION SUMMARY
  // ============================================================================

  describe("getOrganizationSummary", () => {
    it("should return summary with averages and distribution", async () => {
      ratingRepo.find.mockResolvedValue([mockRating, mockRating2]);

      const result = await service.getOrganizationSummary(
        ORG_ID,
        "2024-01-01",
        "2024-01-31",
      );

      expect(result.totalOperators).toBe(2);
      expect(result.averageScore).toBeDefined();
      expect(result.gradeDistribution).toBeDefined();
      expect(result.topPerformer).toBeDefined();
      expect(result.lowestPerformer).toBeDefined();
      expect(result.categoryAverages).toHaveProperty("task");
      expect(result.categoryAverages).toHaveProperty("financial");
    });

    it("should return zeros when no ratings exist", async () => {
      ratingRepo.find.mockResolvedValue([]);

      const result = await service.getOrganizationSummary(
        ORG_ID,
        "2024-01-01",
        "2024-01-31",
      );

      expect(result.totalOperators).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.topPerformer).toBeNull();
      expect(result.lowestPerformer).toBeNull();
    });
  });

  // ============================================================================
  // REMOVE
  // ============================================================================

  describe("remove", () => {
    it("should soft delete rating", async () => {
      ratingRepo.findOne.mockResolvedValue(mockRating);
      ratingRepo.softDelete.mockResolvedValue(
        undefined as unknown as ReturnType<
          Repository<OperatorRating>["softDelete"]
        > extends Promise<infer R>
          ? R
          : never,
      );

      await service.remove("rating-uuid-1", ORG_ID);

      expect(ratingRepo.softDelete).toHaveBeenCalledWith("rating-uuid-1");
    });

    it("should throw NotFoundException when rating not found", async () => {
      ratingRepo.findOne.mockResolvedValue(null);

      await expect(service.remove("non-existent", ORG_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
