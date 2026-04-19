/**
 * Tenant Isolation Contract Tests
 *
 * Verifies that organizationId-scoped queries never leak data across tenants.
 * These tests use mocked repositories to verify the WHERE clause includes
 * organizationId — the service layer is the tenant boundary, not the guard.
 */

import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { NotFoundException } from "@nestjs/common";
import { ComplaintsCoreService } from "../../modules/complaints/complaints-core.service";
import {
  Complaint,
  ComplaintComment,
  ComplaintAction,
  ComplaintAutomationRule,
  ComplaintStatus,
} from "../../modules/complaints/entities/complaint.entity";

const ORG_A = "aaaa0000-0000-0000-0000-000000000001";
const ORG_B = "bbbb0000-0000-0000-0000-000000000002";

const complaintOrgA = {
  id: "complaint-a-1",
  organizationId: ORG_A,
  status: ComplaintStatus.NEW,
  ticketNumber: "CMP-A-001",
} as Complaint;

describe("Tenant Isolation Contract", () => {
  let complaintsCoreService: ComplaintsCoreService;
  let complaintRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    complaintRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplaintsCoreService,
        { provide: getRepositoryToken(Complaint), useValue: complaintRepo },
        {
          provide: getRepositoryToken(ComplaintComment),
          useValue: { findOne: jest.fn(), find: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(ComplaintAction),
          useValue: { findOne: jest.fn(), save: jest.fn(), create: jest.fn() },
        },
        {
          provide: getRepositoryToken(ComplaintAutomationRule),
          useValue: { findOne: jest.fn(), find: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((fn: any) => fn({ save: jest.fn() })),
          },
        },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn(), verifyAsync: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("test-secret-32chars!!") },
        },
      ],
    }).compile();

    complaintsCoreService = module.get(ComplaintsCoreService);
  });

  describe("cross-tenant read prevention", () => {
    it("findById with wrong organizationId returns NotFoundException", async () => {
      complaintRepo.findOne.mockResolvedValue(null);

      await expect(
        complaintsCoreService.findById(complaintOrgA.id, ORG_B),
      ).rejects.toThrow(NotFoundException);

      expect(complaintRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: complaintOrgA.id,
            organizationId: ORG_B,
          }),
        }),
      );
    });

    it("findById with correct organizationId returns complaint", async () => {
      complaintRepo.findOne.mockResolvedValue(complaintOrgA);

      const result = await complaintsCoreService.findById(
        complaintOrgA.id,
        ORG_A,
      );

      expect(result).toEqual(complaintOrgA);
      expect(complaintRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: complaintOrgA.id,
            organizationId: ORG_A,
          }),
        }),
      );
    });

    it("findByNumber with wrong organizationId returns NotFoundException", async () => {
      complaintRepo.findOne.mockResolvedValue(null);

      await expect(
        complaintsCoreService.findByNumber("CMP-A-001", ORG_B),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("cross-tenant mutation prevention", () => {
    it("update with wrong organizationId throws NotFoundException", async () => {
      complaintRepo.findOne.mockResolvedValue(null);

      await expect(
        complaintsCoreService.update(
          complaintOrgA.id,
          { status: ComplaintStatus.IN_PROGRESS },
          "user-b-1",
          ORG_B,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("resolve with wrong organizationId throws NotFoundException", async () => {
      complaintRepo.findOne.mockResolvedValue(null);

      await expect(
        complaintsCoreService.resolve(
          complaintOrgA.id,
          "Fixed",
          "user-b-1",
          ORG_B,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("assign with wrong organizationId throws NotFoundException", async () => {
      complaintRepo.findOne.mockResolvedValue(null);

      await expect(
        complaintsCoreService.assign(
          complaintOrgA.id,
          "user-b-1",
          "user-b-1",
          ORG_B,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("organizationId always in WHERE clause", () => {
    it("query() filters by organizationId", async () => {
      const qb = complaintRepo.createQueryBuilder();

      await complaintsCoreService.query({
        organizationId: ORG_A,
        page: 1,
        limit: 10,
      });

      expect(qb.where).toHaveBeenCalledWith(
        "c.organizationId = :organizationId",
        { organizationId: ORG_A },
      );
    });
  });
});
