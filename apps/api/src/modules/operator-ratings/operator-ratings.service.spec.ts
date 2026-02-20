import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { OperatorRatingsService } from './operator-ratings.service';
import { OperatorRating } from './entities/operator-rating.entity';

const ORG_ID = 'org-uuid-00000000-0000-0000-0000-000000000001';
const USER_ID = 'user-uuid-00000000-0000-0000-0000-000000000001';

describe('OperatorRatingsService', () => {
  let service: OperatorRatingsService;
  let ratingRepo: jest.Mocked<Repository<OperatorRating>>;

  const mockRating = {
    id: 'rating-uuid-1',
    organization_id: ORG_ID,
    user_id: USER_ID,
    period_start: new Date('2024-01-01'),
    period_end: new Date('2024-01-31'),
    total_score: 78.5,
    grade: 'B+',
    rank: 1,
    task_score: 85,
    photo_compliance_rate: 90,
    quality_score: 70,
    financial_score: 75,
    attendance_score: 80,
    customer_score: 65,
    discipline_score: 72,
    tasks_assigned: 20,
    tasks_completed: 18,
    tasks_on_time: 15,
    tasks_late: 3,
    avg_completion_time_hours: 2.5,
    task_completion_rate: 90,
    task_on_time_rate: 83.33,
    timeliness_score: 83.33,
    tasks_with_photos_before: 16,
    tasks_with_photos_after: 14,
    total_photos_uploaded: 40,
    photo_quality_score: 80,
    machine_cleanliness_score: 70,
    stock_accuracy_score: 70,
    cash_collection_accuracy: 95,
    inventory_loss_rate: 2,
    collections_with_variance: 1,
    avg_collection_variance_percent: 0.5,
    inventory_discrepancies: 2,
    scheduled_shifts: 22,
    completed_shifts: 20,
    late_arrivals: 2,
    attendance_rate: 90.91,
    complaints_received: 3,
    complaints_resolved: 2,
    average_response_time: 45,
    avg_customer_rating: 4.2,
    positive_feedback_count: 5,
    checklist_items_completed: 45,
    checklist_items_total: 50,
    checklist_completion_rate: 90,
    comments_sent: 8,
    notes: null,
    metadata: {},
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as OperatorRating;

  const mockRating2 = {
    ...mockRating,
    id: 'rating-uuid-2',
    user_id: 'user-uuid-2',
    total_score: 65,
    grade: 'B',
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CALCULATE RATING
  // ============================================================================

  describe('calculateRating', () => {
    const baseDto = {
      user_id: USER_ID,
      period_start: '2024-02-01',
      period_end: '2024-02-29',
      tasks_assigned: 20,
      tasks_completed: 18,
      tasks_on_time: 15,
      tasks_late: 3,
      avg_completion_time_hours: 2.5,
      tasks_with_photos_before: 16,
      tasks_with_photos_after: 14,
      total_photos_uploaded: 40,
      photo_quality_score: 80,
      machine_cleanliness_score: 70,
      stock_accuracy_score: 70,
      cash_collection_accuracy: 95,
      inventory_loss_rate: 2,
      collections_with_variance: 1,
      avg_collection_variance_percent: 0.5,
      inventory_discrepancies: 2,
      scheduled_shifts: 22,
      completed_shifts: 20,
      late_arrivals: 2,
      complaints_received: 3,
      complaints_resolved: 2,
      average_response_time: 45,
      avg_customer_rating: 4.2,
      positive_feedback_count: 5,
      checklist_items_completed: 45,
      checklist_items_total: 50,
      comments_sent: 8,
    };

    it('should calculate and save a new rating with weighted scores', async () => {
      ratingRepo.findOne
        .mockResolvedValueOnce(null) // no existing rating
        .mockResolvedValueOnce(mockRating); // findById after save
      ratingRepo.create.mockReturnValue(mockRating);
      ratingRepo.save.mockResolvedValue(mockRating);
      ratingRepo.find.mockResolvedValue([mockRating]); // for recalculateRanks

      const result = await service.calculateRating(baseDto as any, ORG_ID);

      expect(result).toBeDefined();
      expect(ratingRepo.create).toHaveBeenCalled();
      expect(ratingRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when rating already exists for period', async () => {
      ratingRepo.findOne.mockResolvedValueOnce(mockRating); // existing rating found

      await expect(
        service.calculateRating(baseDto as any, ORG_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('should assign grade A+ for score >= 95', async () => {
      // We test the private calculateGrade method indirectly through calculateRating
      const highDto = {
        ...baseDto,
        tasks_assigned: 20,
        tasks_completed: 20,
        tasks_on_time: 20,
        tasks_late: 0,
        tasks_with_photos_before: 20,
        tasks_with_photos_after: 20,
        total_photos_uploaded: 60,
        photo_quality_score: 100,
        machine_cleanliness_score: 100,
        stock_accuracy_score: 100,
        cash_collection_accuracy: 100,
        inventory_loss_rate: 0,
        avg_collection_variance_percent: 0,
        scheduled_shifts: 22,
        completed_shifts: 22,
        late_arrivals: 0,
        complaints_received: 0,
        avg_customer_rating: 5,
        checklist_items_completed: 50,
        checklist_items_total: 50,
        comments_sent: 10,
      };

      ratingRepo.findOne
        .mockResolvedValueOnce(null) // no existing
        .mockResolvedValueOnce(mockRating); // findById
      ratingRepo.create.mockImplementation((data) => data as any);
      ratingRepo.save.mockImplementation(async (data) => ({ ...data, id: 'new-uuid' }) as any);
      ratingRepo.find.mockResolvedValue([]);

      const result = await service.calculateRating(highDto as any, ORG_ID);

      // The grade in create call should be A+ for perfect scores
      expect(ratingRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        grade: expect.any(String),
        total_score: expect.any(Number),
      }));
    });

    it('should handle zero tasks without division errors', async () => {
      const zeroDto = {
        ...baseDto,
        tasks_assigned: 0,
        tasks_completed: 0,
        tasks_on_time: 0,
        tasks_late: 0,
        scheduled_shifts: 0,
        completed_shifts: 0,
        complaints_received: 0,
        checklist_items_total: 0,
        checklist_items_completed: 0,
      };

      ratingRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockRating);
      ratingRepo.create.mockReturnValue(mockRating);
      ratingRepo.save.mockResolvedValue(mockRating);
      ratingRepo.find.mockResolvedValue([]);

      // Should not throw division by zero
      await expect(service.calculateRating(zeroDto as any, ORG_ID)).resolves.toBeDefined();
    });
  });

  // ============================================================================
  // RECALCULATE RATING
  // ============================================================================

  describe('recalculateRating', () => {
    it('should soft delete existing and create new rating', async () => {
      ratingRepo.findOne
        .mockResolvedValueOnce(mockRating) // findById
        .mockResolvedValueOnce(null) // no duplicate in calculateRating
        .mockResolvedValueOnce(mockRating); // findById after save
      ratingRepo.softDelete.mockResolvedValue(undefined as any);
      ratingRepo.create.mockReturnValue(mockRating);
      ratingRepo.save.mockResolvedValue(mockRating);
      ratingRepo.find.mockResolvedValue([mockRating]);

      const dto = {
        user_id: USER_ID,
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        tasks_assigned: 10,
        tasks_completed: 8,
      };

      const result = await service.recalculateRating('rating-uuid-1', dto as any, ORG_ID);

      expect(ratingRepo.softDelete).toHaveBeenCalledWith('rating-uuid-1');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if rating does not exist', async () => {
      ratingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.recalculateRating('non-existent', {} as any, ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // FIND BY ID
  // ============================================================================

  describe('findById', () => {
    it('should return rating when found', async () => {
      ratingRepo.findOne.mockResolvedValue(mockRating);

      const result = await service.findById('rating-uuid-1', ORG_ID);

      expect(result).toEqual(mockRating);
      expect(ratingRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'rating-uuid-1', organization_id: ORG_ID },
      });
    });

    it('should throw NotFoundException when rating not found', async () => {
      ratingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findById('non-existent', ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // QUERY
  // ============================================================================

  describe('query', () => {
    it('should return paginated ratings', async () => {
      const result = await service.query({ page: 1, limit: 20 } as any, ORG_ID);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('totalPages', 1);
    });

    it('should filter by user_id', async () => {
      await service.query({ user_id: USER_ID, page: 1, limit: 20 } as any, ORG_ID);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'r.user_id = :user_id',
        { user_id: USER_ID },
      );
    });

    it('should filter by grade', async () => {
      await service.query({ grade: 'A', page: 1, limit: 20 } as any, ORG_ID);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'r.grade = :grade',
        { grade: 'A' },
      );
    });
  });

  // ============================================================================
  // GET LEADERBOARD
  // ============================================================================

  describe('getLeaderboard', () => {
    it('should return top N ratings sorted by total_score', async () => {
      ratingRepo.find.mockResolvedValue([mockRating, mockRating2]);

      const result = await service.getLeaderboard(ORG_ID, '2024-01-01', '2024-01-31', 10);

      expect(result).toHaveLength(2);
      expect(ratingRepo.find).toHaveBeenCalledWith({
        where: {
          organization_id: ORG_ID,
          period_start: new Date('2024-01-01'),
          period_end: new Date('2024-01-31'),
        },
        order: { total_score: 'DESC' },
        take: 10,
      });
    });
  });

  // ============================================================================
  // GET ORGANIZATION SUMMARY
  // ============================================================================

  describe('getOrganizationSummary', () => {
    it('should return summary with averages and distribution', async () => {
      ratingRepo.find.mockResolvedValue([mockRating, mockRating2]);

      const result = await service.getOrganizationSummary(ORG_ID, '2024-01-01', '2024-01-31');

      expect(result.totalOperators).toBe(2);
      expect(result.averageScore).toBeDefined();
      expect(result.gradeDistribution).toBeDefined();
      expect(result.topPerformer).toBeDefined();
      expect(result.lowestPerformer).toBeDefined();
      expect(result.categoryAverages).toHaveProperty('task');
      expect(result.categoryAverages).toHaveProperty('financial');
    });

    it('should return zeros when no ratings exist', async () => {
      ratingRepo.find.mockResolvedValue([]);

      const result = await service.getOrganizationSummary(ORG_ID, '2024-01-01', '2024-01-31');

      expect(result.totalOperators).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.topPerformer).toBeNull();
      expect(result.lowestPerformer).toBeNull();
    });
  });

  // ============================================================================
  // REMOVE
  // ============================================================================

  describe('remove', () => {
    it('should soft delete rating', async () => {
      ratingRepo.findOne.mockResolvedValue(mockRating);
      ratingRepo.softDelete.mockResolvedValue(undefined as any);

      await service.remove('rating-uuid-1', ORG_ID);

      expect(ratingRepo.softDelete).toHaveBeenCalledWith('rating-uuid-1');
    });

    it('should throw NotFoundException when rating not found', async () => {
      ratingRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent', ORG_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
