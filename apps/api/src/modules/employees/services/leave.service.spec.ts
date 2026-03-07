/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { LeaveService } from "./leave.service";
import {
  LeaveRequest,
  LeaveType,
  LeaveStatus,
} from "../entities/leave-request.entity";
import { Employee } from "../entities/employee.entity";

const ORG_ID = "org-uuid-00000000-0000-0000-0000-000000000001";

describe("LeaveService", () => {
  let service: LeaveService;
  let leaveRequestRepo: any;
  let employeeRepo: any;
  let eventEmitter: any;

  const mockEmployee = {
    id: "emp-uuid-1",
    organizationId: ORG_ID,
    firstName: "Aziz",
    lastName: "Karimov",
  } as Employee;

  const mockLeaveRequest = {
    id: "leave-uuid-1",
    organizationId: ORG_ID,
    employeeId: "emp-uuid-1",
    leaveType: LeaveType.ANNUAL,
    startDate: new Date("2024-06-01"),
    endDate: new Date("2024-06-10"),
    totalDays: 10,
    reason: "Vacation",
    status: LeaveStatus.PENDING,
    approvedById: null,
    approvedAt: null,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as LeaveRequest;

  const mockLeaveQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getManyAndCount: jest.fn().mockResolvedValue([[mockLeaveRequest], 1]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockLeaveQueryBuilder.where.mockReturnThis();
    mockLeaveQueryBuilder.andWhere.mockReturnThis();
    mockLeaveQueryBuilder.orderBy.mockReturnThis();
    mockLeaveQueryBuilder.skip.mockReturnThis();
    mockLeaveQueryBuilder.take.mockReturnThis();
    mockLeaveQueryBuilder.getCount.mockResolvedValue(0);
    mockLeaveQueryBuilder.getManyAndCount.mockResolvedValue([
      [mockLeaveRequest],
      1,
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        {
          provide: getRepositoryToken(LeaveRequest),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest
              .fn()
              .mockReturnValue(mockLeaveQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LeaveService>(LeaveService);
    leaveRequestRepo = module.get(getRepositoryToken(LeaveRequest));
    employeeRepo = module.get(getRepositoryToken(Employee));
    eventEmitter = module.get(EventEmitter2);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createLeaveRequest", () => {
    it("should create a leave request successfully", async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      mockLeaveQueryBuilder.getCount.mockResolvedValue(0);
      leaveRequestRepo.create.mockReturnValue(mockLeaveRequest);
      leaveRequestRepo.save.mockResolvedValue(mockLeaveRequest);

      const dto = {
        employeeId: "emp-uuid-1",
        leaveType: LeaveType.ANNUAL,
        startDate: "2024-06-01",
        endDate: "2024-06-10",
        reason: "Vacation",
      };

      const result = await service.createLeaveRequest(ORG_ID, dto as any);

      expect(result).toBeDefined();
      expect(result.status).toBe(LeaveStatus.PENDING);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "leave.requested",
        expect.objectContaining({ employeeId: "emp-uuid-1" }),
      );
    });

    it("should throw NotFoundException when employee not found", async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      const dto = {
        employeeId: "non-existent",
        leaveType: LeaveType.ANNUAL,
        startDate: "2024-06-01",
        endDate: "2024-06-10",
      };

      await expect(
        service.createLeaveRequest(ORG_ID, dto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when end date is before start date", async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);

      const dto = {
        employeeId: "emp-uuid-1",
        leaveType: LeaveType.ANNUAL,
        startDate: "2024-06-10",
        endDate: "2024-06-01",
      };

      await expect(
        service.createLeaveRequest(ORG_ID, dto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException when overlapping leave exists", async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      mockLeaveQueryBuilder.getCount.mockResolvedValue(1);

      const dto = {
        employeeId: "emp-uuid-1",
        leaveType: LeaveType.ANNUAL,
        startDate: "2024-06-05",
        endDate: "2024-06-15",
      };

      await expect(
        service.createLeaveRequest(ORG_ID, dto as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("approveLeave", () => {
    it("should approve a pending leave request", async () => {
      leaveRequestRepo.findOne.mockResolvedValue({ ...mockLeaveRequest });
      leaveRequestRepo.save.mockImplementation(async (lr: any) => lr);

      const result = await service.approveLeave(
        "leave-uuid-1",
        ORG_ID,
        "approver-1",
      );

      expect(result.status).toBe(LeaveStatus.APPROVED);
      expect(result.approvedById).toBe("approver-1");
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "leave.approved",
        expect.objectContaining({ leaveRequestId: "leave-uuid-1" }),
      );
    });

    it("should throw NotFoundException when leave not found", async () => {
      leaveRequestRepo.findOne.mockResolvedValue(null);

      await expect(
        service.approveLeave("non-existent", ORG_ID, "approver-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when leave is not pending", async () => {
      leaveRequestRepo.findOne.mockResolvedValue({
        ...mockLeaveRequest,
        status: LeaveStatus.APPROVED,
      });

      await expect(
        service.approveLeave("leave-uuid-1", ORG_ID, "approver-1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("rejectLeave", () => {
    it("should reject a pending leave request with reason", async () => {
      leaveRequestRepo.findOne.mockResolvedValue({ ...mockLeaveRequest });
      leaveRequestRepo.save.mockImplementation(async (lr: any) => lr);

      const result = await service.rejectLeave(
        "leave-uuid-1",
        ORG_ID,
        "mgr-1",
        { reason: "Team shortage" } as any,
      );

      expect(result.status).toBe(LeaveStatus.REJECTED);
      expect(result.rejectionReason).toBe("Team shortage");
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "leave.rejected",
        expect.any(Object),
      );
    });

    it("should throw BadRequestException when leave is not pending", async () => {
      leaveRequestRepo.findOne.mockResolvedValue({
        ...mockLeaveRequest,
        status: LeaveStatus.REJECTED,
      });

      await expect(
        service.rejectLeave("leave-uuid-1", ORG_ID, "mgr-1", {
          reason: "No",
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("cancelLeave", () => {
    it("should cancel a pending leave request", async () => {
      leaveRequestRepo.findOne.mockResolvedValue({ ...mockLeaveRequest });
      leaveRequestRepo.save.mockImplementation(async (lr: any) => lr);

      const result = await service.cancelLeave("leave-uuid-1", ORG_ID);

      expect(result.status).toBe(LeaveStatus.CANCELLED);
    });

    it("should cancel an approved leave request", async () => {
      leaveRequestRepo.findOne.mockResolvedValue({
        ...mockLeaveRequest,
        status: LeaveStatus.APPROVED,
      });
      leaveRequestRepo.save.mockImplementation(async (lr: any) => lr);

      const result = await service.cancelLeave("leave-uuid-1", ORG_ID);

      expect(result.status).toBe(LeaveStatus.CANCELLED);
    });

    it("should throw BadRequestException when cancelling a rejected leave", async () => {
      leaveRequestRepo.findOne.mockResolvedValue({
        ...mockLeaveRequest,
        status: LeaveStatus.REJECTED,
      });

      await expect(service.cancelLeave("leave-uuid-1", ORG_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when leave not found", async () => {
      leaveRequestRepo.findOne.mockResolvedValue(null);

      await expect(service.cancelLeave("non-existent", ORG_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getLeaveRequests", () => {
    it("should return paginated leave requests", async () => {
      const result = await service.getLeaveRequests(ORG_ID, {
        page: 1,
        limit: 20,
      } as any);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should filter by employeeId", async () => {
      await service.getLeaveRequests(ORG_ID, {
        employeeId: "emp-uuid-1",
      } as any);

      expect(mockLeaveQueryBuilder.andWhere).toHaveBeenCalledWith(
        "lr.employeeId = :employeeId",
        { employeeId: "emp-uuid-1" },
      );
    });

    it("should filter by leaveType", async () => {
      await service.getLeaveRequests(ORG_ID, {
        leaveType: LeaveType.SICK,
      } as any);

      expect(mockLeaveQueryBuilder.andWhere).toHaveBeenCalledWith(
        "lr.leaveType = :leaveType",
        { leaveType: LeaveType.SICK },
      );
    });
  });

  describe("getLeaveBalance", () => {
    it("should return leave balance for current year", async () => {
      leaveRequestRepo.find.mockResolvedValue([
        { leaveType: LeaveType.ANNUAL, totalDays: 5 },
        { leaveType: LeaveType.ANNUAL, totalDays: 3 },
        { leaveType: LeaveType.SICK, totalDays: 2 },
      ]);

      const result = await service.getLeaveBalance(ORG_ID, "emp-uuid-1");

      expect(result.annualTotal).toBe(24);
      expect(result.annualUsed).toBe(8);
      expect(result.annualRemaining).toBe(16);
      expect(result.sickTotal).toBe(10);
      expect(result.sickUsed).toBe(2);
      expect(result.sickRemaining).toBe(8);
    });

    it("should return full balance when no leaves taken", async () => {
      leaveRequestRepo.find.mockResolvedValue([]);

      const result = await service.getLeaveBalance(ORG_ID, "emp-uuid-1", 2024);

      expect(result.annualRemaining).toBe(24);
      expect(result.sickRemaining).toBe(10);
      expect(result.year).toBe(2024);
    });

    it("should filter by specified year", async () => {
      leaveRequestRepo.find.mockResolvedValue([]);

      const result = await service.getLeaveBalance(ORG_ID, "emp-uuid-1", 2023);

      expect(result.year).toBe(2023);
    });
  });

  describe("mapLeaveRequestToDto", () => {
    it("should convert totalDays to number", () => {
      const lr = {
        ...mockLeaveRequest,
        totalDays: "10" as any,
      } as unknown as LeaveRequest;

      const dto = service.mapLeaveRequestToDto(lr);

      expect(typeof dto.totalDays).toBe("number");
      expect(dto.totalDays).toBe(10);
    });
  });
});
