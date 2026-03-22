/**
 * Operator Ratings Service for VendHub OS
 * Расчёт и управление рейтингами операторов
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OperatorRating } from "./entities/operator-rating.entity";
import { CalculateRatingDto } from "./dto/calculate-rating.dto";
import { QueryRatingsDto, RatingSortBy } from "./dto/query-ratings.dto";
import { safeOrderBy } from "../../common/utils";

// ============================================================================
// WEIGHT CONFIGURATION
// ============================================================================

const RATING_WEIGHTS = {
  task: 0.25, // 25%
  photo: 0.15, // 15%
  quality: 0.1, // 10%
  financial: 0.15, // 15%
  attendance: 0.1, // 10%
  customer: 0.1, // 10%
  discipline: 0.15, // 15%
} as const;

// ============================================================================
// GRADE THRESHOLDS
// ============================================================================

const GRADE_THRESHOLDS: { min: number; grade: string }[] = [
  { min: 95, grade: "A+" },
  { min: 85, grade: "A" },
  { min: 75, grade: "B+" },
  { min: 65, grade: "B" },
  { min: 55, grade: "C+" },
  { min: 45, grade: "C" },
  { min: 30, grade: "D" },
  { min: 0, grade: "F" },
];

@Injectable()
export class OperatorRatingsService {
  private readonly logger = new Logger(OperatorRatingsService.name);

  constructor(
    @InjectRepository(OperatorRating)
    private readonly ratingRepo: Repository<OperatorRating>,
  ) {}

  // ============================================================================
  // CALCULATE RATING
  // ============================================================================

  /**
   * Calculate and save an operator rating for a given period.
   * Computes weighted scores across 7 categories and assigns a grade.
   */
  async calculateRating(
    dto: CalculateRatingDto,
    organizationId: string,
  ): Promise<OperatorRating> {
    // Check for existing rating for this user + period
    const existing = await this.ratingRepo.findOne({
      where: {
        organizationId,
        userId: dto.userId,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
      },
    });

    if (existing) {
      throw new ConflictException(
        `Rating for user ${dto.userId} already exists for period ${dto.periodStart} to ${dto.periodEnd}`,
      );
    }

    // ===== Input values =====
    const tasksAssigned = dto.tasksAssigned || 0;
    const tasksCompleted = dto.tasksCompleted || 0;
    const tasksOnTime = dto.tasksOnTime || 0;
    const tasksLate = dto.tasksLate || 0;
    const avgCompletionTimeHours = dto.avgCompletionTimeHours || 0;

    const tasksWithPhotosBefore = dto.tasksWithPhotosBefore || 0;
    const tasksWithPhotosAfter = dto.tasksWithPhotosAfter || 0;
    const totalPhotosUploaded = dto.totalPhotosUploaded || 0;
    const photoQualityScore = dto.photoQualityScore || 0;

    const machineCleanlinessScore = dto.machineCleanlinessScore || 0;
    const stockAccuracyScore = dto.stockAccuracyScore || 0;

    const cashCollectionAccuracy = dto.cashCollectionAccuracy || 0;
    const inventoryLossRate = dto.inventoryLossRate || 0;
    const collectionsWithVariance = dto.collectionsWithVariance || 0;
    const avgCollectionVariancePercent = dto.avgCollectionVariancePercent || 0;
    const inventoryDiscrepancies = dto.inventoryDiscrepancies || 0;

    const scheduledShifts = dto.scheduledShifts || 0;
    const completedShifts = dto.completedShifts || 0;
    const lateArrivals = dto.lateArrivals || 0;

    const complaintsReceived = dto.complaintsReceived || 0;
    const complaintsResolved = dto.complaintsResolved || 0;
    const averageResponseTime = dto.averageResponseTime || 0;
    const avgCustomerRating = dto.avgCustomerRating || 0;
    const positiveFeedbackCount = dto.positiveFeedbackCount || 0;

    const checklistItemsCompleted = dto.checklistItemsCompleted || 0;
    const checklistItemsTotal = dto.checklistItemsTotal || 0;
    const commentsSent = dto.commentsSent || 0;

    // ===== Calculate rates =====
    const taskCompletionRate =
      tasksAssigned > 0 ? (tasksCompleted / tasksAssigned) * 100 : 0;

    const taskOnTimeRate =
      tasksCompleted > 0 ? (tasksOnTime / tasksCompleted) * 100 : 0;

    const attendanceRate =
      scheduledShifts > 0 ? (completedShifts / scheduledShifts) * 100 : 0;

    // Timeliness: penalize late tasks, reward on-time
    const timelinessScore =
      tasksCompleted > 0
        ? Math.max(0, ((tasksCompleted - tasksLate) / tasksCompleted) * 100)
        : 0;

    // Photo compliance: % of completed tasks with both before+after photos
    const photoComplianceRate =
      tasksCompleted > 0
        ? (Math.min(tasksWithPhotosBefore, tasksWithPhotosAfter) /
            tasksCompleted) *
          100
        : 0;

    // Checklist completion rate
    const checklistCompletionRate =
      checklistItemsTotal > 0
        ? (checklistItemsCompleted / checklistItemsTotal) * 100
        : 0;

    // ===== Calculate category scores (all normalized to 0-100) =====

    // 1. Task score (25%): 50% completion + 30% on-time + 20% timeliness
    const taskScore =
      taskCompletionRate * 0.5 + taskOnTimeRate * 0.3 + timelinessScore * 0.2;

    // 2. Photo compliance score (15%): 50% compliance rate + 30% quality + 20% volume bonus
    const photoVolumeBonus =
      tasksCompleted > 0
        ? Math.min(100, (totalPhotosUploaded / (tasksCompleted * 2)) * 100)
        : 0;
    const photoScore =
      photoComplianceRate * 0.5 +
      photoQualityScore * 0.3 +
      photoVolumeBonus * 0.2;

    // 3. Quality score (10%): average of cleanliness and stock accuracy
    const qualityScore = (machineCleanlinessScore + stockAccuracyScore) / 2;

    // 4. Financial score (15%): 50% cash accuracy + 30% inverse loss + 20% variance penalty
    const variancePenalty =
      avgCollectionVariancePercent > 0
        ? Math.min(100, avgCollectionVariancePercent * 10)
        : 0;
    const financialScore =
      cashCollectionAccuracy * 0.5 +
      (100 - inventoryLossRate) * 0.3 +
      (100 - variancePenalty) * 0.2;

    // 5. Attendance score (10%): 70% attendance rate + 30% punctuality
    const punctualityRate =
      completedShifts > 0
        ? ((completedShifts - lateArrivals) / completedShifts) * 100
        : 0;
    const attendanceScore =
      attendanceRate * 0.7 + Math.max(0, punctualityRate) * 0.3;

    // 6. Customer score (10%): resolution rate + rating bonus - response penalty
    const resolutionRate =
      complaintsReceived > 0
        ? (complaintsResolved / complaintsReceived) * 100
        : 100; // No complaints = perfect

    const responseTimePenalty =
      averageResponseTime <= 30
        ? 0
        : Math.min(30, ((averageResponseTime - 30) / 450) * 30);

    // Rating bonus: avgCustomerRating on 1-5 scale -> 0-20 bonus
    const ratingBonus =
      avgCustomerRating > 0 ? ((avgCustomerRating - 1) / 4) * 20 : 0;

    const customerScore = Math.min(
      100,
      Math.max(0, resolutionRate - responseTimePenalty + ratingBonus),
    );

    // 7. Discipline score (15%): 70% checklist + 30% communication bonus
    const communicationBonus = Math.min(100, commentsSent * 10); // Each comment worth 10 points, max 100
    const disciplineScore =
      checklistCompletionRate * 0.7 + communicationBonus * 0.3;

    // ===== Calculate total weighted score =====
    const totalScore =
      taskScore * RATING_WEIGHTS.task +
      photoScore * RATING_WEIGHTS.photo +
      qualityScore * RATING_WEIGHTS.quality +
      financialScore * RATING_WEIGHTS.financial +
      attendanceScore * RATING_WEIGHTS.attendance +
      customerScore * RATING_WEIGHTS.customer +
      disciplineScore * RATING_WEIGHTS.discipline;

    // ===== Determine grade =====
    const grade = this.calculateGrade(totalScore);

    // ===== Round all scores =====
    const round2 = (n: number) => Math.round(n * 100) / 100;

    // ===== Create and save =====
    const rating = this.ratingRepo.create({
      organizationId,
      userId: dto.userId,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),

      // Task
      tasksAssigned,
      tasksCompleted,
      tasksOnTime,
      tasksLate,
      avgCompletionTimeHours,
      taskCompletionRate: round2(taskCompletionRate),
      taskOnTimeRate: round2(taskOnTimeRate),
      timelinessScore: round2(timelinessScore),
      taskScore: round2(taskScore),

      // Photo compliance
      tasksWithPhotosBefore,
      tasksWithPhotosAfter,
      totalPhotosUploaded,
      photoComplianceRate: round2(photoComplianceRate),
      photoQualityScore: round2(photoQualityScore),

      // Quality
      machineCleanlinessScore: round2(machineCleanlinessScore),
      stockAccuracyScore: round2(stockAccuracyScore),
      qualityScore: round2(qualityScore),

      // Financial
      cashCollectionAccuracy: round2(cashCollectionAccuracy),
      inventoryLossRate: round2(inventoryLossRate),
      collectionsWithVariance,
      avgCollectionVariancePercent: round2(avgCollectionVariancePercent),
      inventoryDiscrepancies,
      financialScore: round2(financialScore),

      // Attendance
      scheduledShifts,
      completedShifts,
      lateArrivals,
      attendanceRate: round2(attendanceRate),
      attendanceScore: round2(attendanceScore),

      // Customer
      complaintsReceived,
      complaintsResolved,
      averageResponseTime,
      avgCustomerRating: round2(avgCustomerRating),
      positiveFeedbackCount,
      customerScore: round2(customerScore),

      // Discipline
      checklistItemsCompleted,
      checklistItemsTotal,
      checklistCompletionRate: round2(checklistCompletionRate),
      commentsSent,
      disciplineScore: round2(disciplineScore),

      // Totals
      totalScore: round2(totalScore),
      grade,
      rank: null, // Will be computed by recalculateRanks
      notes: dto.notes || null,
      metadata: dto.metadata || {},
    });

    const saved = await this.ratingRepo.save(rating);

    // Recalculate ranks for this period within the organization
    await this.recalculateRanks(organizationId, dto.periodStart, dto.periodEnd);

    // Reload to get updated rank
    const result = await this.findById(saved.id, organizationId);

    this.logger.log(
      `Rating calculated: user=${dto.userId} score=${round2(totalScore)} grade=${grade}`,
    );

    return result;
  }

  /**
   * Recalculate a rating for an existing record (overwrites scores)
   */
  async recalculateRating(
    id: string,
    dto: CalculateRatingDto,
    organizationId: string,
  ): Promise<OperatorRating> {
    await this.findById(id, organizationId);

    // Delete the existing one and recalculate
    await this.ratingRepo.softDelete(id);

    // Create new rating
    return this.calculateRating(dto, organizationId);
  }

  // ============================================================================
  // QUERY
  // ============================================================================

  /**
   * Find a rating by ID
   */
  async findById(id: string, organizationId: string): Promise<OperatorRating> {
    const rating = await this.ratingRepo.findOne({
      where: { id, organizationId },
    });

    if (!rating) {
      throw new NotFoundException(`Operator rating ${id} not found`);
    }

    return rating;
  }

  /**
   * Query ratings with filters and pagination
   */
  async query(queryDto: QueryRatingsDto, organizationId: string) {
    const {
      userId,
      periodStart,
      periodEnd,
      grade,
      minScore,
      maxScore,
      sortBy = RatingSortBy.TOTAL_SCORE,
      sortOrder = "DESC",
      page = 1,
      limit = 20,
    } = queryDto;

    const qb = this.ratingRepo.createQueryBuilder("r");
    qb.where("r.organizationId = :organizationId", { organizationId });

    if (userId) {
      qb.andWhere("r.userId = :userId", { userId });
    }

    if (periodStart) {
      qb.andWhere("r.periodStart >= :periodStart", {
        periodStart: new Date(periodStart),
      });
    }

    if (periodEnd) {
      qb.andWhere("r.periodEnd <= :periodEnd", {
        periodEnd: new Date(periodEnd),
      });
    }

    if (grade) {
      qb.andWhere("r.grade = :grade", { grade });
    }

    if (minScore !== undefined) {
      qb.andWhere("r.totalScore >= :minScore", { minScore });
    }

    if (maxScore !== undefined) {
      qb.andWhere("r.totalScore <= :maxScore", { maxScore });
    }

    const total = await qb.getCount();

    safeOrderBy(qb, "r", sortBy, sortOrder, [
      "createdAt",
      "updatedAt",
      "rating",
      "operatorId",
    ] as const);
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get leaderboard for a specific period
   */
  async getLeaderboard(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    topN = 10,
  ): Promise<OperatorRating[]> {
    return this.ratingRepo.find({
      where: {
        organizationId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      },
      order: { totalScore: "DESC" },
      take: topN,
    });
  }

  /**
   * Get rating history for a specific operator
   */
  async getOperatorHistory(
    userId: string,
    organizationId: string,
    limit = 12,
  ): Promise<OperatorRating[]> {
    return this.ratingRepo.find({
      where: {
        userId,
        organizationId,
      },
      order: { periodStart: "DESC" },
      take: limit,
    });
  }

  /**
   * Get organization-wide rating summary for a period
   */
  async getOrganizationSummary(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
  ) {
    const ratings = await this.ratingRepo.find({
      where: {
        organizationId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      },
    });

    if (ratings.length === 0) {
      return {
        totalOperators: 0,
        averageScore: 0,
        gradeDistribution: {},
        topPerformer: null,
        lowestPerformer: null,
        categoryAverages: {
          task: 0,
          photo: 0,
          quality: 0,
          financial: 0,
          attendance: 0,
          customer: 0,
          discipline: 0,
        },
      };
    }

    const gradeDistribution: Record<string, number> = {};
    let sumScore = 0;
    let sumTask = 0;
    let sumPhoto = 0;
    let sumQuality = 0;
    let sumFinancial = 0;
    let sumAttendance = 0;
    let sumCustomer = 0;
    let sumDiscipline = 0;

    for (const r of ratings) {
      sumScore += Number(r.totalScore);
      sumTask += Number(r.taskScore);
      sumPhoto += Number(r.photoComplianceRate);
      sumQuality += Number(r.qualityScore);
      sumFinancial += Number(r.financialScore);
      sumAttendance += Number(r.attendanceScore);
      sumCustomer += Number(r.customerScore);
      sumDiscipline += Number(r.disciplineScore);

      const g = r.grade || "F";
      gradeDistribution[g] = (gradeDistribution[g] || 0) + 1;
    }

    const n = ratings.length;
    const round2 = (v: number) => Math.round(v * 100) / 100;
    const sorted = [...ratings].sort(
      (a, b) => Number(b.totalScore) - Number(a.totalScore),
    );

    return {
      totalOperators: n,
      averageScore: round2(sumScore / n),
      gradeDistribution,
      topPerformer: sorted[0] || null,
      lowestPerformer: sorted[sorted.length - 1] || null,
      categoryAverages: {
        task: round2(sumTask / n),
        photo: round2(sumPhoto / n),
        quality: round2(sumQuality / n),
        financial: round2(sumFinancial / n),
        attendance: round2(sumAttendance / n),
        customer: round2(sumCustomer / n),
        discipline: round2(sumDiscipline / n),
      },
    };
  }

  /**
   * Soft delete a rating
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const rating = await this.findById(id, organizationId);
    await this.ratingRepo.softDelete(rating.id);
    this.logger.log(`Operator rating ${id} soft deleted`);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Determine grade from total score
   */
  private calculateGrade(totalScore: number): string {
    for (const threshold of GRADE_THRESHOLDS) {
      if (totalScore >= threshold.min) {
        return threshold.grade;
      }
    }
    return "F";
  }

  /**
   * Recalculate ranks for all ratings in a period within an organization
   */
  private async recalculateRanks(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<void> {
    const ratings = await this.ratingRepo.find({
      where: {
        organizationId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      },
      order: { totalScore: "DESC" },
    });

    for (let i = 0; i < ratings.length; i++) {
      ratings[i]!.rank = i + 1;
    }

    if (ratings.length > 0) {
      await this.ratingRepo.save(ratings);
    }
  }
}
