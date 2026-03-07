/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";

import { DepartmentService } from "./department.service";
import { Department } from "../entities/department.entity";

const ORG_ID = "org-uuid-00000000-0000-0000-0000-000000000001";

describe("DepartmentService", () => {
  let service: DepartmentService;
  let departmentRepo: any;

  const mockDepartment = {
    id: "dept-uuid-1",
    organizationId: ORG_ID,
    name: "Operations",
    code: "OPS",
    description: "Operations department",
    managerId: "mgr-uuid-1",
    parentDepartmentId: null,
    isActive: true,
    sortOrder: 0,
    subDepartments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Department;

  const mockSubDepartment = {
    id: "dept-uuid-2",
    organizationId: ORG_ID,
    name: "Field Ops",
    code: "FOPS",
    description: null,
    managerId: null,
    parentDepartmentId: "dept-uuid-1",
    isActive: true,
    sortOrder: 1,
    subDepartments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Department;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockDepartment], 1]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    mockQueryBuilder.leftJoinAndSelect.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.addOrderBy.mockReturnThis();
    mockQueryBuilder.skip.mockReturnThis();
    mockQueryBuilder.take.mockReturnThis();
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockDepartment], 1]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentService,
        {
          provide: getRepositoryToken(Department),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softRemove: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<DepartmentService>(DepartmentService);
    departmentRepo = module.get(getRepositoryToken(Department));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createDepartment", () => {
    it("should create a department successfully", async () => {
      departmentRepo.findOne.mockResolvedValue(null);
      departmentRepo.create.mockReturnValue(mockDepartment);
      departmentRepo.save.mockResolvedValue(mockDepartment);

      const dto = { name: "Operations", code: "OPS" } as any;

      const result = await service.createDepartment(ORG_ID, dto);

      expect(result).toBeDefined();
      expect(result.id).toBe("dept-uuid-1");
      expect(result.name).toBe("Operations");
    });

    it("should throw ConflictException when code already exists", async () => {
      departmentRepo.findOne.mockResolvedValue(mockDepartment);

      const dto = { name: "Duplicate", code: "OPS" } as any;

      await expect(service.createDepartment(ORG_ID, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should validate parent department exists", async () => {
      departmentRepo.findOne
        .mockResolvedValueOnce(null) // code check - no duplicate
        .mockResolvedValueOnce(null); // parent check - not found

      const dto = {
        name: "Sub Dept",
        code: "SUB",
        parentDepartmentId: "non-existent",
      } as any;

      await expect(service.createDepartment(ORG_ID, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should create a child department with valid parent", async () => {
      departmentRepo.findOne
        .mockResolvedValueOnce(null) // code check
        .mockResolvedValueOnce(mockDepartment); // parent exists
      departmentRepo.create.mockReturnValue(mockSubDepartment);
      departmentRepo.save.mockResolvedValue(mockSubDepartment);

      const dto = {
        name: "Field Ops",
        code: "FOPS",
        parentDepartmentId: "dept-uuid-1",
      } as any;

      const result = await service.createDepartment(ORG_ID, dto);

      expect(result).toBeDefined();
      expect(result.parentDepartmentId).toBe("dept-uuid-1");
    });

    it("should default isActive to true", async () => {
      departmentRepo.findOne.mockResolvedValue(null);
      departmentRepo.create.mockReturnValue(mockDepartment);
      departmentRepo.save.mockResolvedValue(mockDepartment);

      const dto = { name: "Test", code: "TST" } as any;

      await service.createDepartment(ORG_ID, dto);

      expect(departmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });
  });

  describe("updateDepartment", () => {
    it("should update department fields", async () => {
      departmentRepo.findOne.mockResolvedValue({ ...mockDepartment });
      departmentRepo.save.mockImplementation(async (d: any) => d);

      const result = await service.updateDepartment("dept-uuid-1", ORG_ID, {
        name: "Operations v2",
      } as any);

      expect(result).toBeDefined();
      expect(departmentRepo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException when department not found", async () => {
      departmentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateDepartment("non-existent", ORG_ID, {
          name: "New",
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when changing to duplicate code", async () => {
      departmentRepo.findOne
        .mockResolvedValueOnce({ ...mockDepartment, code: "OLD" })
        .mockResolvedValueOnce({ id: "other-dept", code: "TAKEN" });

      await expect(
        service.updateDepartment("dept-uuid-1", ORG_ID, {
          code: "TAKEN",
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it("should prevent circular parent reference", async () => {
      departmentRepo.findOne.mockResolvedValue({ ...mockDepartment });

      await expect(
        service.updateDepartment("dept-uuid-1", ORG_ID, {
          parentDepartmentId: "dept-uuid-1",
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getDepartments", () => {
    it("should return paginated departments", async () => {
      const result = await service.getDepartments(ORG_ID, {
        page: 1,
        limit: 20,
      } as any);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should filter by search term", async () => {
      await service.getDepartments(ORG_ID, { search: "Ops" } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "(d.name ILIKE :search OR d.code ILIKE :search)",
        { search: "%Ops%" },
      );
    });

    it("should filter by parentId", async () => {
      await service.getDepartments(ORG_ID, { parentId: "dept-uuid-1" } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "d.parentDepartmentId = :parentId",
        { parentId: "dept-uuid-1" },
      );
    });

    it("should filter by isActive", async () => {
      await service.getDepartments(ORG_ID, { isActive: false } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "d.isActive = :isActive",
        { isActive: false },
      );
    });

    it("should join subDepartments relation", async () => {
      await service.getDepartments(ORG_ID, {} as any);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        "d.subDepartments",
        "sub",
      );
    });
  });

  describe("getDepartment", () => {
    it("should return a single department with sub-departments", async () => {
      departmentRepo.findOne.mockResolvedValue({
        ...mockDepartment,
        subDepartments: [mockSubDepartment],
      });

      const result = await service.getDepartment("dept-uuid-1", ORG_ID);

      expect(result.id).toBe("dept-uuid-1");
      expect(result.subDepartments).toHaveLength(1);
    });

    it("should throw NotFoundException when department not found", async () => {
      departmentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getDepartment("non-existent", ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteDepartment", () => {
    it("should soft delete a department", async () => {
      departmentRepo.findOne.mockResolvedValue(mockDepartment);
      departmentRepo.softRemove.mockResolvedValue(mockDepartment);

      await service.deleteDepartment("dept-uuid-1", ORG_ID);

      expect(departmentRepo.softRemove).toHaveBeenCalledWith(mockDepartment);
    });

    it("should throw NotFoundException when department not found", async () => {
      departmentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteDepartment("non-existent", ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("mapDepartmentToDto", () => {
    it("should map department with sub-departments recursively", () => {
      const dept = {
        ...mockDepartment,
        subDepartments: [mockSubDepartment],
      } as unknown as Department;

      const dto = service.mapDepartmentToDto(dept);

      expect(dto.id).toBe("dept-uuid-1");
      expect(dto.subDepartments).toHaveLength(1);
      expect(dto.subDepartments![0].code).toBe("FOPS");
    });

    it("should return undefined subDepartments when not loaded", () => {
      const dept = {
        ...mockDepartment,
        subDepartments: undefined,
      } as unknown as Department;

      const dto = service.mapDepartmentToDto(dept);

      expect(dto.subDepartments).toBeUndefined();
    });
  });
});
