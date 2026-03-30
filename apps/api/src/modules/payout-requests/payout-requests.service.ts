import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  PayoutRequest,
  PayoutRequestStatus,
} from "./entities/payout-request.entity";
import { CreatePayoutRequestDto } from "./dto/create-payout-request.dto";
import {
  ReviewPayoutRequestDto,
  ReviewAction,
} from "./dto/review-payout-request.dto";
import { QueryPayoutRequestsDto } from "./dto/query-payout-requests.dto";

@Injectable()
export class PayoutRequestsService {
  private readonly logger = new Logger(PayoutRequestsService.name);

  constructor(
    @InjectRepository(PayoutRequest)
    private readonly repo: Repository<PayoutRequest>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * List payout requests with pagination and optional status filter.
   * Always filtered by organizationId for tenant isolation.
   */
  async findAll(organizationId: string, query: QueryPayoutRequestsDto) {
    const { status, page = 1, limit = 20 } = query;

    const qb = this.repo
      .createQueryBuilder("pr")
      .where("pr.organizationId = :organizationId", { organizationId })
      .orderBy("pr.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere("pr.status = :status", { status });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single payout request by ID.
   * Tenant-isolated by organizationId.
   */
  async findById(id: string, organizationId?: string) {
    const where: Record<string, unknown> = { id };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    const request = await this.repo.findOne({ where });
    if (!request) {
      throw new NotFoundException(`Payout request ${id} not found`);
    }
    return request;
  }

  /**
   * Create a new payout request.
   */
  async create(
    organizationId: string,
    userId: string,
    dto: CreatePayoutRequestDto,
  ) {
    const request = this.repo.create({
      organizationId,
      amount: dto.amount,
      payoutMethod: dto.payoutMethod,
      reason: dto.reason ?? null,
      payoutDestination: dto.payoutDestination ?? null,
      requestedById: userId,
      createdById: userId,
      status: PayoutRequestStatus.PENDING,
    });

    const saved = await this.repo.save(request);
    this.logger.log(
      `Payout request ${saved.id} created by user ${userId} for ${dto.amount} UZS`,
    );
    return saved;
  }

  /**
   * Review (approve/reject) a payout request.
   * Uses pessimistic write lock to prevent race conditions.
   */
  async review(
    id: string,
    organizationId: string,
    reviewerId: string,
    dto: ReviewPayoutRequestDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PayoutRequest);
      const request = await repo.findOne({
        where: { id, organizationId },
        lock: { mode: "pessimistic_write" },
      });

      if (!request) {
        throw new NotFoundException(`Payout request ${id} not found`);
      }

      if (request.status !== PayoutRequestStatus.PENDING) {
        throw new BadRequestException(
          `Cannot review payout request in status "${request.status}". Only PENDING requests can be reviewed.`,
        );
      }

      if (dto.action === ReviewAction.REJECT && !dto.comment) {
        throw new BadRequestException(
          "Comment is required when rejecting a payout request",
        );
      }

      request.reviewedById = reviewerId;
      request.reviewedAt = new Date();
      request.reviewComment = dto.comment ?? null;
      request.updatedById = reviewerId;
      request.status =
        dto.action === ReviewAction.APPROVE
          ? PayoutRequestStatus.APPROVED
          : PayoutRequestStatus.REJECTED;

      const saved = await repo.save(request);
      this.logger.log(
        `Payout request ${id} ${dto.action}d by reviewer ${reviewerId}`,
      );
      return saved;
    });
  }

  /**
   * Cancel a payout request (by the requester).
   * Only PENDING requests can be cancelled.
   */
  async cancel(id: string, organizationId: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PayoutRequest);
      const request = await repo.findOne({
        where: { id, organizationId },
        lock: { mode: "pessimistic_write" },
      });

      if (!request) {
        throw new NotFoundException(`Payout request ${id} not found`);
      }

      if (request.status !== PayoutRequestStatus.PENDING) {
        throw new BadRequestException(
          `Cannot cancel payout request in status "${request.status}". Only PENDING requests can be cancelled.`,
        );
      }

      request.status = PayoutRequestStatus.CANCELLED;
      request.updatedById = userId;

      const saved = await repo.save(request);
      this.logger.log(`Payout request ${id} cancelled by user ${userId}`);
      return saved;
    });
  }

  /**
   * Mark payout as processing (by admin/system after approval).
   */
  async markProcessing(id: string, organizationId?: string) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PayoutRequest);
      const where: Record<string, unknown> = { id };
      if (organizationId) where.organizationId = organizationId;

      const request = await repo.findOne({
        where,
        lock: { mode: "pessimistic_write" },
      });

      if (!request) {
        throw new NotFoundException(`Payout request ${id} not found`);
      }

      if (request.status !== PayoutRequestStatus.APPROVED) {
        throw new BadRequestException(
          `Cannot process payout request in status "${request.status}". Only APPROVED requests can be processed.`,
        );
      }

      request.status = PayoutRequestStatus.PROCESSING;
      return repo.save(request);
    });
  }

  /**
   * Complete a payout request with an external transaction reference.
   */
  async complete(
    id: string,
    transactionReference: string,
    organizationId?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PayoutRequest);
      const where: Record<string, unknown> = { id };
      if (organizationId) where.organizationId = organizationId;

      const request = await repo.findOne({
        where,
        lock: { mode: "pessimistic_write" },
      });

      if (!request) {
        throw new NotFoundException(`Payout request ${id} not found`);
      }

      if (request.status !== PayoutRequestStatus.PROCESSING) {
        throw new BadRequestException(
          `Cannot complete payout request in status "${request.status}". Only PROCESSING requests can be completed.`,
        );
      }

      request.status = PayoutRequestStatus.COMPLETED;
      request.completedAt = new Date();
      request.transactionReference = transactionReference;
      return repo.save(request);
    });
  }

  /**
   * Soft-delete a payout request.
   * Only PENDING or CANCELLED requests can be deleted.
   */
  async remove(id: string, organizationId: string) {
    const request = await this.findById(id, organizationId);

    if (
      request.status !== PayoutRequestStatus.PENDING &&
      request.status !== PayoutRequestStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot delete payout request in status "${request.status}". Only PENDING or CANCELLED requests can be deleted.`,
      );
    }

    await this.repo.softDelete(id);
  }

  /**
   * Get summary stats for the organization's payout requests.
   */
  async getStats(organizationId: string) {
    const result = await this.repo
      .createQueryBuilder("pr")
      .select("pr.status", "status")
      .addSelect("COUNT(*)", "count")
      .addSelect("COALESCE(SUM(pr.amount), 0)", "totalAmount")
      .where("pr.organizationId = :organizationId", { organizationId })
      .andWhere("pr.deletedAt IS NULL")
      .groupBy("pr.status")
      .getRawMany();

    return result.map((row) => ({
      status: row.status,
      count: parseInt(row.count, 10),
      totalAmount: parseFloat(row.totalAmount),
    }));
  }
}
