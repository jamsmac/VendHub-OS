/**
 * Performance Review Sub-Service
 * Handles performance review CRUD and submission workflow
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Employee } from "../entities/employee.entity";
import {
  PerformanceReview,
  ReviewStatus,
} from "../entities/performance-review.entity";
import {
  CreateReviewDto,
  SubmitReviewDto,
  QueryReviewsDto,
  PerformanceReviewDto,
  PerformanceReviewListDto,
} from "../dto/performance-review.dto";

@Injectable()
export class PerformanceReviewService {
  private readonly logger = new Logger(PerformanceReviewService.name);

  constructor(
    @InjectRepository(PerformanceReview)
    private readonly reviewRepo: Repository<PerformanceReview>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a performance review
   */
  async createReview(
    organizationId: string,
    dto: CreateReviewDto,
  ): Promise<PerformanceReviewDto> {
    await this.findEmployee(dto.employeeId, organizationId);

    const review = this.reviewRepo.create({
      organizationId,
      employeeId: dto.employeeId,
      reviewerId: dto.reviewerId,
      reviewPeriod: dto.reviewPeriod,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      status: ReviewStatus.SCHEDULED,
    });

    await this.reviewRepo.save(review);

    this.logger.log(
      `Performance review created for employee ${dto.employeeId}`,
    );

    return this.mapReviewToDto(review);
  }

  /**
   * Submit a review with ratings
   */
  async submitReview(
    reviewId: string,
    organizationId: string,
    dto: SubmitReviewDto,
  ): Promise<PerformanceReviewDto> {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId, organizationId },
    });
    if (!review) {
      throw new NotFoundException("Performance review not found");
    }

    if (review.status === ReviewStatus.COMPLETED) {
      throw new BadRequestException("Review is already completed");
    }

    if (review.status === ReviewStatus.CANCELLED) {
      throw new BadRequestException("Review has been cancelled");
    }

    review.overallRating = dto.overallRating;
    review.ratings = dto.ratings;
    review.strengths = dto.strengths || null;
    review.areasForImprovement = dto.areasForImprovement || null;
    review.goals = dto.goals || null;
    review.reviewerComments = dto.reviewerComments || null;
    review.status = ReviewStatus.COMPLETED;
    review.completedAt = new Date();

    await this.reviewRepo.save(review);

    this.eventEmitter.emit("review.completed", {
      reviewId: review.id,
      employeeId: review.employeeId,
      organizationId,
      overallRating: review.overallRating,
    });

    return this.mapReviewToDto(review);
  }

  /**
   * Get reviews (paginated)
   */
  async getReviews(
    organizationId: string,
    query: QueryReviewsDto,
  ): Promise<PerformanceReviewListDto> {
    const { page = 1, limit = 20, employeeId, status, reviewPeriod } = query;

    const qb = this.reviewRepo
      .createQueryBuilder("r")
      .where("r.organizationId = :organizationId", { organizationId });

    if (employeeId) {
      qb.andWhere("r.employeeId = :employeeId", { employeeId });
    }

    if (status) {
      qb.andWhere("r.status = :status", { status });
    }

    if (reviewPeriod) {
      qb.andWhere("r.reviewPeriod = :reviewPeriod", { reviewPeriod });
    }

    const [items, total] = await qb
      .orderBy("r.periodEnd", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((r) => this.mapReviewToDto(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single review
   */
  async getReview(
    reviewId: string,
    organizationId: string,
  ): Promise<PerformanceReviewDto> {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId, organizationId },
    });
    if (!review) {
      throw new NotFoundException("Performance review not found");
    }
    return this.mapReviewToDto(review);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async findEmployee(
    employeeId: string,
    organizationId: string,
  ): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, organizationId },
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    return employee;
  }

  mapReviewToDto(review: PerformanceReview): PerformanceReviewDto {
    return {
      id: review.id,
      organizationId: review.organizationId,
      employeeId: review.employeeId,
      reviewerId: review.reviewerId,
      reviewPeriod: review.reviewPeriod,
      periodStart: review.periodStart,
      periodEnd: review.periodEnd,
      status: review.status,
      overallRating: review.overallRating ? Number(review.overallRating) : null,
      ratings: review.ratings,
      strengths: review.strengths,
      areasForImprovement: review.areasForImprovement,
      goals: review.goals,
      employeeComments: review.employeeComments,
      reviewerComments: review.reviewerComments,
      completedAt: review.completedAt,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
    };
  }
}
