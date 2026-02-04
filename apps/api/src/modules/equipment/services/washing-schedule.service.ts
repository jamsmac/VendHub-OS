/**
 * Washing Schedule Service
 * Business logic for washing/cleaning schedule management
 */

import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

import { WashingSchedule } from '../entities/equipment-component.entity';
import {
  CreateWashingScheduleDto,
  UpdateWashingScheduleDto,
  WashingScheduleQueryDto,
} from '../dto/create-washing-schedule.dto';

@Injectable()
export class WashingScheduleService {
  private readonly logger = new Logger(WashingScheduleService.name);

  constructor(
    @InjectRepository(WashingSchedule)
    private readonly washingScheduleRepository: Repository<WashingSchedule>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateWashingScheduleDto,
  ): Promise<WashingSchedule> {
    const schedule = this.washingScheduleRepository.create({
      organizationId,
      created_by_id: userId,
      ...dto,
    });

    const saved = await this.washingScheduleRepository.save(schedule);
    this.logger.log(`Washing schedule created: ${saved.id} for machine ${dto.machineId}`);

    return saved;
  }

  async findAll(
    organizationId: string,
    query: WashingScheduleQueryDto,
  ): Promise<{ data: WashingSchedule[]; total: number; page: number; limit: number }> {
    const {
      machineId,
      activeOnly = true,
      dueWithinDays,
      overdueOnly,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.washingScheduleRepository
      .createQueryBuilder('w')
      .where('w.organizationId = :organizationId', { organizationId })
      .andWhere('w.deleted_at IS NULL');

    if (activeOnly) {
      qb.andWhere('w.isActive = true');
    }
    if (machineId) {
      qb.andWhere('w.machineId = :machineId', { machineId });
    }
    if (dueWithinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + dueWithinDays);
      qb.andWhere('w.nextWashDate <= :futureDate', { futureDate });
    }
    if (overdueOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      qb.andWhere('w.nextWashDate < :today', { today });
    }

    qb.orderBy('w.nextWashDate', 'ASC');

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(organizationId: string, id: string): Promise<WashingSchedule> {
    const schedule = await this.washingScheduleRepository.findOne({
      where: { id, organizationId },
    });

    if (!schedule) {
      throw new NotFoundException(`Washing schedule ${id} not found`);
    }

    return schedule;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateWashingScheduleDto,
  ): Promise<WashingSchedule> {
    const schedule = await this.findOne(organizationId, id);
    Object.assign(schedule, dto);
    return this.washingScheduleRepository.save(schedule);
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await this.findOne(organizationId, id);
    await this.washingScheduleRepository.softDelete(id);
  }

  /**
   * Mark a wash as completed and advance the next wash date
   */
  async completeWash(
    organizationId: string,
    id: string,
  ): Promise<WashingSchedule> {
    const schedule = await this.findOne(organizationId, id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    schedule.lastWashDate = today;

    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + schedule.frequencyDays);
    schedule.nextWashDate = nextDate;

    const saved = await this.washingScheduleRepository.save(schedule);

    this.eventEmitter.emit('equipment.washing.completed', { schedule: saved });
    this.logger.log(`Wash completed for schedule ${id}, next wash: ${nextDate.toISOString()}`);

    return saved;
  }

  /**
   * Cron job: check for overdue washes and emit events
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async checkOverdueWashes(): Promise<void> {
    this.logger.log('Checking for overdue washing schedules...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueSchedules = await this.washingScheduleRepository.find({
      where: {
        isActive: true,
        nextWashDate: LessThan(today),
      },
    });

    for (const schedule of overdueSchedules) {
      this.eventEmitter.emit('equipment.washing.overdue', { schedule });
    }

    this.logger.log(`Found ${overdueSchedules.length} overdue washing schedules`);
  }
}
