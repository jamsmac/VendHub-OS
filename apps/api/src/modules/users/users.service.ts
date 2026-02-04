import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
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
    const query = this.userRepository.createQueryBuilder('user');

    if (organizationId) {
      query.where('user.organization_id = :organizationId', { organizationId });
    }

    if (role) {
      query.andWhere('user.role = :role', { role });
    }

    if (status) {
      query.andWhere('user.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await query.getCount();

    query.orderBy('user.created_at', 'DESC');
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
      relations: ['organization'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['organization'],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    Object.assign(user, updateUserDto);
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
      relations: ['organization', 'roles'],
    });
  }

  async approveUser(userId: string, approvedById: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException('User is not in pending status');
    }

    user.status = UserStatus.ACTIVE;
    user.approvedAt = new Date();
    user.approvedById = approvedById;

    return this.userRepository.save(user);
  }

  async rejectUser(userId: string, rejectedById: string, reason: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException('User is not in pending status');
    }

    user.status = UserStatus.REJECTED;
    user.rejectedAt = new Date();
    user.rejectedById = rejectedById;
    user.rejectionReason = reason;

    return this.userRepository.save(user);
  }
}
