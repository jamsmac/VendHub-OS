import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { randomBytes } from "crypto";
import { Invite, InviteStatus } from "./entities/invite.entity";
import { UserRole } from "../../common/enums";

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    @InjectRepository(Invite)
    private readonly inviteRepo: Repository<Invite>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    role: UserRole,
    organizationId: string,
    createdById: string,
    expiresInHours = 24,
    maxUses = 1,
    description?: string,
  ): Promise<Invite> {
    // Owner role cannot be invited
    if (role === UserRole.OWNER) {
      throw new BadRequestException("Cannot create invite for owner role");
    }

    const code = randomBytes(6).toString("hex"); // 12 hex chars
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const invite = this.inviteRepo.create({
      code,
      role,
      organizationId,
      createdById,
      expiresAt,
      maxUses,
      description: description ?? null,
      status: InviteStatus.ACTIVE,
      currentUses: 0,
      usedById: null,
      usedAt: null,
    });

    return this.inviteRepo.save(invite);
  }

  async findByCode(code: string): Promise<Invite | null> {
    return this.inviteRepo.findOne({ where: { code } });
  }

  async validateInvite(code: string): Promise<Invite> {
    const invite = await this.findByCode(code);

    if (!invite) {
      throw new NotFoundException("Invite not found");
    }

    if (invite.status === InviteStatus.REVOKED) {
      throw new BadRequestException("Invite has been revoked");
    }

    if (invite.isExpired) {
      throw new BadRequestException("Invite has expired");
    }

    if (invite.isUsed) {
      throw new BadRequestException("Invite has already been used");
    }

    return invite;
  }

  /**
   * Claims an invite using pessimistic locking to prevent race conditions.
   * Returns the locked invite within a transaction.
   */
  async claimInvite(code: string, userId: string): Promise<Invite> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Lock the invite row to prevent concurrent claims
      const invite = await qr.manager
        .createQueryBuilder(Invite, "invite")
        .setLock("pessimistic_write")
        .where("invite.code = :code", { code })
        .getOne();

      if (!invite) {
        throw new NotFoundException("Invite not found");
      }

      if (!invite.isValid) {
        throw new ConflictException(
          invite.isExpired
            ? "Invite has expired"
            : "Invite has already been used",
        );
      }

      // Mark as used
      invite.currentUses += 1;
      invite.usedById = userId;
      invite.usedAt = new Date();

      if (invite.currentUses >= invite.maxUses) {
        invite.status = InviteStatus.USED;
      }

      await qr.manager.save(invite);
      await qr.commitTransaction();

      this.logger.log(`Invite ${code} claimed by user ${userId}`);
      return invite;
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  async findByOrganization(
    organizationId: string,
    includeExpired = false,
  ): Promise<Invite[]> {
    const qb = this.inviteRepo
      .createQueryBuilder("invite")
      .where("invite.organizationId = :organizationId", { organizationId })
      .orderBy("invite.createdAt", "DESC");

    if (!includeExpired) {
      qb.andWhere("invite.status = :status", { status: InviteStatus.ACTIVE });
    }

    return qb.getMany();
  }

  async findById(id: string, organizationId: string): Promise<Invite> {
    const invite = await this.inviteRepo.findOne({
      where: { id, organizationId },
    });

    if (!invite) {
      throw new NotFoundException("Invite not found");
    }

    return invite;
  }

  async revoke(id: string, organizationId: string): Promise<Invite> {
    const invite = await this.findById(id, organizationId);

    if (invite.status !== InviteStatus.ACTIVE) {
      throw new BadRequestException("Only active invites can be revoked");
    }

    invite.status = InviteStatus.REVOKED;
    return this.inviteRepo.save(invite);
  }
}
