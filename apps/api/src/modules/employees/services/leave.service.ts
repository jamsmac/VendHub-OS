/**
 * Leave Sub-Service
 * Handles leave requests, approval workflow, and balance calculations
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Employee } from "../entities/employee.entity";
import {
  LeaveRequest,
  LeaveType,
  LeaveStatus,
} from "../entities/leave-request.entity";
import {
  CreateLeaveRequestDto,
  RejectLeaveDto,
  QueryLeaveRequestsDto,
  LeaveRequestDto,
  LeaveRequestListDto,
  LeaveBalanceDto,
} from "../dto/leave-request.dto";

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepo: Repository<LeaveRequest>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a leave request
   */
  async createLeaveRequest(
    organizationId: string,
    dto: CreateLeaveRequestDto,
  ): Promise<LeaveRequestDto> {
    await this.findEmployee(dto.employeeId, organizationId);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException("End date must be after start date");
    }

    // Calculate total days (simple calculation, excludes weekends)
    const diffMs = endDate.getTime() - startDate.getTime();
    const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;

    // Check for overlapping leave requests
    const overlapping = await this.leaveRequestRepo
      .createQueryBuilder("lr")
      .where("lr.employeeId = :employeeId", { employeeId: dto.employeeId })
      .andWhere("lr.organizationId = :organizationId", { organizationId })
      .andWhere("lr.status IN (:...statuses)", {
        statuses: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
      })
      .andWhere("(lr.startDate <= :endDate AND lr.endDate >= :startDate)", {
        startDate: dto.startDate,
        endDate: dto.endDate,
      })
      .getCount();

    if (overlapping > 0) {
      throw new ConflictException(
        "Leave request overlaps with an existing request",
      );
    }

    const leaveRequest = this.leaveRequestRepo.create({
      organizationId,
      employeeId: dto.employeeId,
      leaveType: dto.leaveType,
      startDate,
      endDate,
      totalDays,
      reason: dto.reason || null,
      status: LeaveStatus.PENDING,
    });

    await this.leaveRequestRepo.save(leaveRequest);

    this.logger.log(`Leave request created for employee ${dto.employeeId}`);

    this.eventEmitter.emit("leave.requested", {
      leaveRequestId: leaveRequest.id,
      employeeId: dto.employeeId,
      organizationId,
    });

    return this.mapLeaveRequestToDto(leaveRequest);
  }

  /**
   * Approve a leave request
   */
  async approveLeave(
    leaveId: string,
    organizationId: string,
    approvedById: string,
  ): Promise<LeaveRequestDto> {
    const leaveRequest = await this.leaveRequestRepo.findOne({
      where: { id: leaveId, organizationId },
    });
    if (!leaveRequest) {
      throw new NotFoundException("Leave request not found");
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException("Leave request is not in pending status");
    }

    leaveRequest.status = LeaveStatus.APPROVED;
    leaveRequest.approvedById = approvedById;
    leaveRequest.approvedAt = new Date();

    await this.leaveRequestRepo.save(leaveRequest);

    this.eventEmitter.emit("leave.approved", {
      leaveRequestId: leaveRequest.id,
      employeeId: leaveRequest.employeeId,
      organizationId,
    });

    return this.mapLeaveRequestToDto(leaveRequest);
  }

  /**
   * Reject a leave request
   */
  async rejectLeave(
    leaveId: string,
    organizationId: string,
    approvedById: string,
    dto: RejectLeaveDto,
  ): Promise<LeaveRequestDto> {
    const leaveRequest = await this.leaveRequestRepo.findOne({
      where: { id: leaveId, organizationId },
    });
    if (!leaveRequest) {
      throw new NotFoundException("Leave request not found");
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException("Leave request is not in pending status");
    }

    leaveRequest.status = LeaveStatus.REJECTED;
    leaveRequest.approvedById = approvedById;
    leaveRequest.approvedAt = new Date();
    leaveRequest.rejectionReason = dto.reason;

    await this.leaveRequestRepo.save(leaveRequest);

    this.eventEmitter.emit("leave.rejected", {
      leaveRequestId: leaveRequest.id,
      employeeId: leaveRequest.employeeId,
      organizationId,
    });

    return this.mapLeaveRequestToDto(leaveRequest);
  }

  /**
   * Cancel a leave request (by employee)
   */
  async cancelLeave(
    leaveId: string,
    organizationId: string,
  ): Promise<LeaveRequestDto> {
    const leaveRequest = await this.leaveRequestRepo.findOne({
      where: { id: leaveId, organizationId },
    });
    if (!leaveRequest) {
      throw new NotFoundException("Leave request not found");
    }

    if (
      ![LeaveStatus.PENDING, LeaveStatus.APPROVED].includes(leaveRequest.status)
    ) {
      throw new BadRequestException("Leave request cannot be cancelled");
    }

    leaveRequest.status = LeaveStatus.CANCELLED;
    await this.leaveRequestRepo.save(leaveRequest);

    return this.mapLeaveRequestToDto(leaveRequest);
  }

  /**
   * Get leave requests (paginated)
   */
  async getLeaveRequests(
    organizationId: string,
    query: QueryLeaveRequestsDto,
  ): Promise<LeaveRequestListDto> {
    const {
      page = 1,
      limit = 20,
      employeeId,
      status,
      leaveType,
      dateFrom,
      dateTo,
    } = query;

    const qb = this.leaveRequestRepo
      .createQueryBuilder("lr")
      .where("lr.organizationId = :organizationId", { organizationId });

    if (employeeId) {
      qb.andWhere("lr.employeeId = :employeeId", { employeeId });
    }

    if (status) {
      qb.andWhere("lr.status = :status", { status });
    }

    if (leaveType) {
      qb.andWhere("lr.leaveType = :leaveType", { leaveType });
    }

    if (dateFrom) {
      qb.andWhere("lr.startDate >= :dateFrom", { dateFrom });
    }

    if (dateTo) {
      qb.andWhere("lr.endDate <= :dateTo", { dateTo });
    }

    const [items, total] = await qb
      .orderBy("lr.created_at", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((lr) => this.mapLeaveRequestToDto(lr)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get leave balance for an employee
   */
  async getLeaveBalance(
    organizationId: string,
    employeeId: string,
    year?: number,
  ): Promise<LeaveBalanceDto> {
    const currentYear = year || new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    const approvedLeaves = await this.leaveRequestRepo.find({
      where: {
        organizationId,
        employeeId,
        status: LeaveStatus.APPROVED,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        startDate: MoreThanOrEqual(startOfYear) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        endDate: LessThanOrEqual(endOfYear) as any,
      },
    });

    // Default allocations (can be made configurable)
    const annualTotal = 24; // 24 days annual leave (Uzbekistan standard)
    const sickTotal = 10; // 10 days sick leave

    let annualUsed = 0;
    let sickUsed = 0;

    for (const leave of approvedLeaves) {
      if (leave.leaveType === LeaveType.ANNUAL) {
        annualUsed += Number(leave.totalDays);
      } else if (leave.leaveType === LeaveType.SICK) {
        sickUsed += Number(leave.totalDays);
      }
    }

    return {
      employeeId,
      annualTotal,
      annualUsed,
      annualRemaining: annualTotal - annualUsed,
      sickTotal,
      sickUsed,
      sickRemaining: sickTotal - sickUsed,
      year: currentYear,
    };
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

  mapLeaveRequestToDto(leaveRequest: LeaveRequest): LeaveRequestDto {
    return {
      id: leaveRequest.id,
      organizationId: leaveRequest.organizationId,
      employeeId: leaveRequest.employeeId,
      leaveType: leaveRequest.leaveType,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      totalDays: Number(leaveRequest.totalDays),
      reason: leaveRequest.reason,
      status: leaveRequest.status,
      approvedById: leaveRequest.approvedById,
      approvedAt: leaveRequest.approvedAt,
      rejectionReason: leaveRequest.rejectionReason,
      createdAt: leaveRequest.created_at,
      updatedAt: leaveRequest.updated_at,
    };
  }
}
