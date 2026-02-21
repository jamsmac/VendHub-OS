import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AccessRequest,
  AccessRequestStatus,
} from "../telegram-bot/entities/access-request.entity";
import { UsersService } from "../users/users.service";
import { CreateAccessRequestDto } from "./dto/create-access-request.dto";
import {
  ApproveAccessRequestDto,
  RejectAccessRequestDto,
} from "./dto/approve-access-request.dto";

interface AccessRequestFilters {
  status?: AccessRequestStatus;
  source?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AccessRequestsService {
  constructor(
    @InjectRepository(AccessRequest)
    private readonly accessRequestRepository: Repository<AccessRequest>,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateAccessRequestDto): Promise<AccessRequest> {
    const existing = await this.accessRequestRepository.findOne({
      where: {
        telegramId: dto.telegramId,
        status: AccessRequestStatus.NEW,
      },
    });
    if (existing) {
      throw new ConflictException(
        `A pending access request already exists for Telegram ID ${dto.telegramId}`,
      );
    }

    const request = this.accessRequestRepository.create({
      telegramId: dto.telegramId,
      telegramUsername: dto.telegramUsername ?? null,
      telegramFirstName: dto.telegramFirstName ?? null,
      telegramLastName: dto.telegramLastName ?? null,
      source: dto.source,
      notes: dto.notes ?? null,
    });

    return this.accessRequestRepository.save(request);
  }

  async findAll(
    organizationId?: string,
    filters?: AccessRequestFilters,
  ): Promise<{
    data: AccessRequest[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit: rawLimit = 50, status, source } = filters || {};
    const limit = Math.min(rawLimit, 100);

    const query = this.accessRequestRepository.createQueryBuilder("ar");

    if (organizationId) {
      query.where("ar.organizationId = :organizationId", { organizationId });
    }

    if (status) {
      query.andWhere("ar.status = :status", { status });
    }

    if (source) {
      query.andWhere("ar.source = :source", { source });
    }

    const total = await query.getCount();

    query
      .leftJoinAndSelect("ar.processedBy", "processedBy")
      .leftJoinAndSelect("ar.createdUser", "createdUser")
      .orderBy("ar.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<AccessRequest> {
    const request = await this.accessRequestRepository.findOne({
      where: { id },
      relations: ["processedBy", "createdUser"],
    });
    if (!request) {
      throw new NotFoundException(`Access request with ID ${id} not found`);
    }
    return request;
  }

  async approve(
    id: string,
    adminUserId: string,
    organizationId: string,
    dto: ApproveAccessRequestDto,
  ): Promise<AccessRequest> {
    const request = await this.findById(id);

    if (request.status !== AccessRequestStatus.NEW) {
      throw new BadRequestException(
        `Access request is already ${request.status}`,
      );
    }

    // Create user account
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      firstName: request.telegramFirstName || "User",
      lastName: request.telegramLastName || request.telegramId,
      role: dto.role,
      organizationId,
      telegramId: request.telegramId,
      telegramUsername: request.telegramUsername || undefined,
    } as Parameters<typeof this.usersService.create>[0]);

    // Update request
    request.status = AccessRequestStatus.APPROVED;
    request.processedByUserId = adminUserId;
    request.processedAt = new Date();
    request.createdUserId = user.id;
    request.organizationId = organizationId;
    if (dto.notes) {
      request.notes = dto.notes;
    }

    return this.accessRequestRepository.save(request);
  }

  async reject(
    id: string,
    adminUserId: string,
    dto: RejectAccessRequestDto,
  ): Promise<AccessRequest> {
    const request = await this.findById(id);

    if (request.status !== AccessRequestStatus.NEW) {
      throw new BadRequestException(
        `Access request is already ${request.status}`,
      );
    }

    request.status = AccessRequestStatus.REJECTED;
    request.processedByUserId = adminUserId;
    request.processedAt = new Date();
    request.rejectionReason = dto.rejectionReason;

    return this.accessRequestRepository.save(request);
  }

  async findPendingByTelegramId(
    telegramId: string,
  ): Promise<AccessRequest | null> {
    return this.accessRequestRepository.findOne({
      where: { telegramId, status: AccessRequestStatus.NEW },
    });
  }

  async getStats(organizationId?: string): Promise<Record<string, number>> {
    const query = this.accessRequestRepository.createQueryBuilder("ar");

    if (organizationId) {
      query.where("ar.organizationId = :organizationId", { organizationId });
    }

    const requests = await query
      .select("ar.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("ar.status")
      .getRawMany<{ status: string; count: string }>();

    const stats: Record<string, number> = {};
    for (const r of requests) {
      stats[r.status] = Number(r.count);
    }
    return stats;
  }
}
