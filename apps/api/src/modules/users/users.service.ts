import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, In, Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { User, UserStatus } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserRole } from "../../common/enums";
import { stripProtectedFields } from "../../common/utils";

export interface AuthLookupUser {
  id: string;
  email: string;
  role: string;
  organizationId?: string | null;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    if (createUserDto.role === UserRole.OWNER) {
      throw new ForbiddenException("Cannot assign owner role through API");
    }
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findAll(
    organizationId?: string,
    options?: {
      page?: number;
      limit?: number;
      role?: string;
      status?: string;
      search?: string;
    },
  ) {
    const { page = 1, limit = 20, role, status, search } = options || {};
    const query = this.userRepository.createQueryBuilder("user");

    if (organizationId) {
      query.where("user.organization_id = :organizationId", { organizationId });
    }

    if (role) {
      query.andWhere("user.role = :role", { role });
    }

    if (status) {
      query.andWhere("user.status = :status", { status });
    }

    if (search) {
      query.andWhere(
        "(user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.email ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    const total = await query.getCount();

    query.orderBy("user.createdAt", "DESC");
    query.skip((page - 1) * limit);
    query.take(limit);

    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ["organization"],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ["organization"],
    });
  }

  async findAuthUserById(id: string): Promise<AuthLookupUser | null> {
    try {
      const user = await this.findById(id);
      if (user) {
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          isActive: user.isActive,
        };
      }
    } catch {
      // Fall back to a narrow raw query for legacy production schemas.
    }

    const rows = (await this.userRepository.query(
      `
        SELECT
          id,
          email,
          role,
          status,
          organization_id AS "organizationId",
          COALESCE(first_name, '') AS "firstName",
          COALESCE(last_name, '') AS "lastName",
          COALESCE(is_active, status = 'active') AS "isActive"
        FROM users
        WHERE id = $1
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [id],
    )) as Array<
      AuthLookupUser & { status?: string; isActive?: boolean | string }
    >;

    const user = rows[0];
    if (!user) {
      return null;
    }

    const isActive = user.isActive;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      isActive:
        isActive === true ||
        String(isActive) === "t" ||
        user.status === UserStatus.ACTIVE,
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.role === UserRole.OWNER) {
      throw new ForbiddenException("Cannot assign owner role through API");
    }
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    Object.assign(
      user,
      stripProtectedFields(updateUserDto as Record<string, unknown>),
    );
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.userRepository.softRemove(user);
  }

  async updateLastLogin(id: string, ip: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    });
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return this.userRepository.count({
      where: { organizationId },
    });
  }

  async findOneWithRoles(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ["organization", "roles"],
    });
  }

  async approveUser(userId: string, approvedById: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException("User is not in pending status");
    }

    user.status = UserStatus.ACTIVE;
    user.approvedAt = new Date();
    user.approvedById = approvedById;

    return this.userRepository.save(user);
  }

  async rejectUser(
    userId: string,
    rejectedById: string,
    reason: string,
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException("User is not in pending status");
    }

    user.status = UserStatus.REJECTED;
    user.rejectedAt = new Date();
    user.rejectedById = rejectedById;
    user.rejectionReason = reason;

    return this.userRepository.save(user);
  }

  // ========================================================================
  // LOOKUP HELPERS (ported from VHM24-repo)
  // ========================================================================

  async findByTelegramId(telegramId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { telegramId } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return this.userRepository.find({ where: { id: In(ids) } });
  }

  async findByRole(
    role: UserRole,
    organizationId?: string,
    activeOnly = true,
  ): Promise<User[]> {
    const where: FindOptionsWhere<User> = { role };
    if (organizationId) where.organizationId = organizationId;
    if (activeOnly) where.status = UserStatus.ACTIVE;
    return this.userRepository.find({
      where,
      order: { createdAt: "DESC" },
    });
  }

  async findByRoles(
    roles: UserRole[],
    organizationId?: string,
    activeOnly = true,
  ): Promise<User[]> {
    if (roles.length === 0) return [];
    const query = this.userRepository
      .createQueryBuilder("user")
      .where("user.role IN (:...roles)", { roles });
    if (organizationId) {
      query.andWhere("user.organizationId = :organizationId", {
        organizationId,
      });
    }
    if (activeOnly) {
      query.andWhere("user.status = :status", { status: UserStatus.ACTIVE });
    }
    return query.orderBy("user.createdAt", "DESC").getMany();
  }

  async getAdminUserIds(organizationId?: string): Promise<string[]> {
    const admins = await this.findByRoles(
      [UserRole.OWNER, UserRole.ADMIN],
      organizationId,
    );
    return admins.map((u) => u.id);
  }

  async getManagerUserIds(organizationId?: string): Promise<string[]> {
    const managers = await this.findByRole(UserRole.MANAGER, organizationId);
    return managers.map((u) => u.id);
  }

  async getFirstAdminId(organizationId?: string): Promise<string | null> {
    const ids = await this.getAdminUserIds(organizationId);
    return ids[0] ?? null;
  }

  async findPendingUsers(organizationId?: string): Promise<User[]> {
    const where: FindOptionsWhere<User> = {
      status: UserStatus.PENDING,
    };
    if (organizationId) where.organizationId = organizationId;
    return this.userRepository.find({
      where,
      order: { createdAt: "DESC" },
    });
  }

  // ========================================================================
  // ACCOUNT STATE MANAGEMENT (ported from VHM24-repo)
  // ========================================================================

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    const hash = await bcrypt.hash(newPassword, 12);
    await this.userRepository.update(userId, {
      password: hash,
      passwordChangedAt: new Date(),
      mustChangePassword: false,
    });
  }

  async save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async blockUser(userId: string, reason?: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    user.status = UserStatus.SUSPENDED;
    if (reason) {
      user.preferences = {
        ...user.preferences,
        blockReason: reason,
      } as typeof user.preferences;
    }
    return this.userRepository.save(user);
  }

  async unblockUser(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    user.status = UserStatus.ACTIVE;
    user.loginAttempts = 0;
    user.lockedUntil = null as unknown as Date;
    return this.userRepository.save(user);
  }

  async deactivateUser(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    user.status = UserStatus.INACTIVE;
    return this.userRepository.save(user);
  }

  async activateUser(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    user.status = UserStatus.ACTIVE;
    return this.userRepository.save(user);
  }
}
