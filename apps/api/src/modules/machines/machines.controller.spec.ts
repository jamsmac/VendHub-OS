import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { MachinesController } from "./machines.controller";
import { MachinesService } from "./machines.service";
import {
  MachineStatus,
  MachineType,
  MachineConnectionStatus,
} from "./entities/machine.entity";
import { UserRole } from "../../common/enums";

// ============================================================================
// Mock service — every public method the controller calls
// ============================================================================

const mockMachinesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  getStatsByOrganization: jest.fn(),
  getMachinesForMap: jest.fn(),
  findAllSimple: jest.fn(),
  getOfflineMachines: jest.fn(),
  findByMachineNumber: jest.fn(),
  findByQrCode: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  updateTelemetry: jest.fn(),
  remove: jest.fn(),
  // Slots
  getSlots: jest.fn(),
  createSlot: jest.fn(),
  updateSlot: jest.fn(),
  refillSlot: jest.fn(),
  // Location
  moveToLocation: jest.fn(),
  getLocationHistory: jest.fn(),
  // Components
  getComponents: jest.fn(),
  installComponent: jest.fn(),
  removeComponent: jest.fn(),
  // Errors
  getErrorHistory: jest.fn(),
  logError: jest.fn(),
  resolveError: jest.fn(),
  // Maintenance
  getUpcomingMaintenance: jest.fn(),
  scheduleMaintenance: jest.fn(),
  completeMaintenance: jest.fn(),
  // Analytics / QR / depreciation
  getConnectivityStats: jest.fn(),
  generateQrCode: jest.fn(),
  getDepreciation: jest.fn(),
  runDepreciationBatch: jest.fn(),
  updateConnectivity: jest.fn(),
};

// ============================================================================
// Reusable factories
// ============================================================================

function makeUser(
  overrides: Partial<{
    id: string;
    organizationId: string;
    role: UserRole;
  }> = {},
) {
  return {
    id: "user-1",
    organizationId: "org-1",
    role: UserRole.MANAGER,
    ...overrides,
  };
}

function makeMachine(
  overrides: Partial<{ id: string; organizationId: string; status: MachineStatus }> = {},
) {
  return {
    id: "mc-1",
    organizationId: "org-1",
    machineNumber: "VM-001",
    status: MachineStatus.ACTIVE,
    type: MachineType.COFFEE,
    ...overrides,
  };
}

// ============================================================================
// Test suite
// ============================================================================

describe("MachinesController (unit)", () => {
  let controller: MachinesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MachinesController],
      providers: [{ provide: MachinesService, useValue: mockMachinesService }],
    })
      .overrideGuard(require("../auth/guards/jwt-auth.guard").JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require("../../common/guards").RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MachinesController>(MachinesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ==========================================================================
  // create
  // ==========================================================================

  describe("create", () => {
    it("should use user.organizationId for non-OWNER", async () => {
      const user = makeUser();
      const dto = {
        machineNumber: "VM-001",
        type: MachineType.COFFEE,
        organizationId: "other-org", // should be ignored
      } as any;
      const mockMachine = makeMachine();
      mockMachinesService.create.mockResolvedValue(mockMachine);

      const result = await controller.create(dto, user as any);

      expect(mockMachinesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: "org-1" }),
      );
      expect(result).toEqual(mockMachine);
    });

    it("should use dto.organizationId when user is OWNER", async () => {
      const user = makeUser({ role: UserRole.OWNER });
      const dto = {
        machineNumber: "VM-002",
        organizationId: "other-org",
      } as any;
      mockMachinesService.create.mockResolvedValue(
        makeMachine({ organizationId: "other-org" }),
      );

      await controller.create(dto, user as any);

      expect(mockMachinesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: "other-org" }),
      );
    });

    it("should fall back to user.organizationId when OWNER provides no organizationId", async () => {
      const user = makeUser({ role: UserRole.OWNER });
      const dto = { machineNumber: "VM-003" } as any;
      mockMachinesService.create.mockResolvedValue(makeMachine());

      await controller.create(dto, user as any);

      expect(mockMachinesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: "org-1" }),
      );
    });
  });

  // ==========================================================================
  // findAll
  // ==========================================================================

  describe("findAll", () => {
    it("should pass user.organizationId to service for non-OWNER", async () => {
      const user = makeUser();
      const mockList = { data: [makeMachine()], total: 1, page: 1, limit: 20 };
      mockMachinesService.findAll.mockResolvedValue(mockList);

      const result = await controller.findAll(user as any, {} as any);

      expect(mockMachinesService.findAll).toHaveBeenCalledWith(
        "org-1",
        expect.any(Object),
      );
      expect(result).toEqual(mockList);
    });

    it("should use query.organizationId for OWNER", async () => {
      const user = makeUser({ role: UserRole.OWNER });
      const query = { organizationId: "tenant-2" } as any;
      mockMachinesService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await controller.findAll(user as any, query);

      expect(mockMachinesService.findAll).toHaveBeenCalledWith(
        "tenant-2",
        expect.any(Object),
      );
    });
  });

  // ==========================================================================
  // getStats / getMachinesForMap / findAllSimple
  // ==========================================================================

  describe("getStats", () => {
    it("should delegate with organizationId", async () => {
      const user = makeUser();
      const stats = { total: 5, active: 4, offline: 1 };
      mockMachinesService.getStatsByOrganization.mockResolvedValue(stats);

      const result = await controller.getStats(user as any);

      expect(mockMachinesService.getStatsByOrganization).toHaveBeenCalledWith(
        "org-1",
      );
      expect(result).toEqual(stats);
    });
  });

  describe("getMachinesForMap", () => {
    it("should delegate with organizationId", async () => {
      const user = makeUser();
      const mapData = [{ id: "mc-1", lat: 41.3 }];
      mockMachinesService.getMachinesForMap.mockResolvedValue(mapData);

      const result = await controller.getMachinesForMap(user as any);

      expect(mockMachinesService.getMachinesForMap).toHaveBeenCalledWith(
        "org-1",
      );
      expect(result).toEqual(mapData);
    });
  });

  describe("findAllSimple", () => {
    it("should delegate with organizationId", async () => {
      const user = makeUser();
      const simple = [{ id: "mc-1", machineNumber: "VM-001" }];
      mockMachinesService.findAllSimple.mockResolvedValue(simple);

      const result = await controller.findAllSimple(user as any);

      expect(mockMachinesService.findAllSimple).toHaveBeenCalledWith("org-1");
      expect(result).toEqual(simple);
    });
  });

  // ==========================================================================
  // getOfflineMachines — Number() conversion
  // ==========================================================================

  describe("getOfflineMachines", () => {
    it("should convert string minutes to Number", async () => {
      const user = makeUser();
      const offline = [makeMachine({ id: "mc-offline" })];
      mockMachinesService.getOfflineMachines.mockResolvedValue(offline);

      const result = await controller.getOfflineMachines(
        user as any,
        "30" as any,
      );

      expect(mockMachinesService.getOfflineMachines).toHaveBeenCalledWith(
        "org-1",
        30,
      );
      expect(result).toEqual(offline);
    });

    it("should pass undefined when minutes not provided", async () => {
      const user = makeUser();
      mockMachinesService.getOfflineMachines.mockResolvedValue([]);

      await controller.getOfflineMachines(user as any, undefined);

      expect(mockMachinesService.getOfflineMachines).toHaveBeenCalledWith(
        "org-1",
        undefined,
      );
    });
  });

  // ==========================================================================
  // findByMachineNumber
  // ==========================================================================

  describe("findByMachineNumber", () => {
    it("should return machine when found", async () => {
      const user = makeUser();
      const machine = makeMachine();
      mockMachinesService.findByMachineNumber.mockResolvedValue(machine);

      const result = await controller.findByMachineNumber(
        "VM-001",
        user as any,
      );

      expect(mockMachinesService.findByMachineNumber).toHaveBeenCalledWith(
        "VM-001",
        "org-1",
      );
      expect(result).toEqual(machine);
    });

    it("should throw NotFoundException when machine not found", async () => {
      const user = makeUser();
      mockMachinesService.findByMachineNumber.mockResolvedValue(null);

      await expect(
        controller.findByMachineNumber("UNKNOWN", user as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // findByQrCode
  // ==========================================================================

  describe("findByQrCode", () => {
    it("should return machine for same-org user", async () => {
      const user = makeUser();
      const machine = makeMachine();
      mockMachinesService.findByQrCode.mockResolvedValue(machine);

      const result = await controller.findByQrCode("QR123", user as any);

      expect(mockMachinesService.findByQrCode).toHaveBeenCalledWith(
        "QR123",
        "org-1",
      );
      expect(result).toEqual(machine);
    });

    it("should throw NotFoundException when machine not found by QR", async () => {
      const user = makeUser();
      mockMachinesService.findByQrCode.mockResolvedValue(null);

      await expect(
        controller.findByQrCode("BADQR", user as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException for cross-org machine when not OWNER", async () => {
      const user = makeUser({ organizationId: "org-1" });
      // service is expected to filter by org at DB level and return null
      mockMachinesService.findByQrCode.mockResolvedValue(null);

      await expect(
        controller.findByQrCode("QR-CROSS", user as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("should allow OWNER to access cross-org machine via QR", async () => {
      const user = makeUser({ role: UserRole.OWNER, organizationId: "org-1" });
      const machine = makeMachine({ organizationId: "org-2" });
      mockMachinesService.findByQrCode.mockResolvedValue(machine);

      const result = await controller.findByQrCode("QR-CROSS", user as any);

      expect(result).toEqual(machine);
    });
  });

  // ==========================================================================
  // findOne — inline cross-org check
  // ==========================================================================

  describe("findOne", () => {
    it("should return machine for same-org user", async () => {
      const user = makeUser();
      const machine = makeMachine();
      mockMachinesService.findById.mockResolvedValue(machine);

      const result = await controller.findOne("mc-1", user as any);

      expect(mockMachinesService.findById).toHaveBeenCalledWith("mc-1");
      expect(result).toEqual(machine);
    });

    it("should throw ForbiddenException for cross-org machine when not OWNER", async () => {
      const user = makeUser({ organizationId: "org-1" });
      const machine = makeMachine({ organizationId: "org-2" });
      mockMachinesService.findById.mockResolvedValue(machine);

      await expect(controller.findOne("mc-cross", user as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should allow OWNER to access cross-org machine", async () => {
      const user = makeUser({ role: UserRole.OWNER, organizationId: "org-1" });
      const machine = makeMachine({ organizationId: "org-2" });
      mockMachinesService.findById.mockResolvedValue(machine);

      const result = await controller.findOne("mc-cross", user as any);

      expect(result).toEqual(machine);
    });
  });

  // ==========================================================================
  // update — inline cross-org check
  // ==========================================================================

  describe("update", () => {
    it("should delegate to service for same-org user", async () => {
      const user = makeUser();
      const machine = makeMachine();
      const updated = { ...machine, machineNumber: "VM-999" };
      mockMachinesService.findById.mockResolvedValue(machine);
      mockMachinesService.update.mockResolvedValue(updated);

      const dto = { machineNumber: "VM-999" } as any;
      const result = await controller.update("mc-1", dto, user as any);

      // Controller uses owner-bypass pattern: non-OWNER passes organizationId
      expect(mockMachinesService.update).toHaveBeenCalledWith(
        "mc-1",
        dto,
        "org-1",
      );
      expect(result).toEqual(updated);
    });

    it("should pass undefined organizationId for OWNER", async () => {
      const user = makeUser({ role: UserRole.OWNER });
      const machine = makeMachine();
      const updated = { ...machine, machineNumber: "VM-999" };
      mockMachinesService.findById.mockResolvedValue(machine);
      mockMachinesService.update.mockResolvedValue(updated);

      const dto = { machineNumber: "VM-999" } as any;
      await controller.update("mc-1", dto, user as any);

      // OWNER passes undefined organizationId (no org filtering)
      expect(mockMachinesService.update).toHaveBeenCalledWith("mc-1", dto, undefined);
    });

    it("should pass organizationId to service for cross-org filtering (non-OWNER)", async () => {
      const user = makeUser({ organizationId: "org-1" });
      mockMachinesService.update.mockResolvedValue(makeMachine());

      const dto = { machineNumber: "VM-999" } as any;
      await controller.update("mc-cross", dto, user as any);

      // Controller now delegates org check to service via organizationId
      expect(mockMachinesService.update).toHaveBeenCalledWith(
        "mc-cross",
        dto,
        "org-1",
      );
    });
  });

  // ==========================================================================
  // updateStatus — inline cross-org check
  // ==========================================================================

  describe("updateStatus", () => {
    it("should call service.updateStatus with id, status, and organizationId for non-OWNER", async () => {
      const user = makeUser();
      const machine = makeMachine();
      mockMachinesService.findById.mockResolvedValue(machine);
      mockMachinesService.updateStatus.mockResolvedValue({
        ...machine,
        status: MachineStatus.OFFLINE,
      });

      const dto = { status: MachineStatus.OFFLINE } as any;
      const result = await controller.updateStatus("mc-1", dto, user as any);

      // Controller uses owner-bypass pattern: non-OWNER passes organizationId
      expect(mockMachinesService.updateStatus).toHaveBeenCalledWith(
        "mc-1",
        MachineStatus.OFFLINE,
        "org-1",
      );
      expect(result.status).toBe(MachineStatus.OFFLINE);
    });

    it("should call service.updateStatus with undefined organizationId for OWNER", async () => {
      const user = makeUser({ role: UserRole.OWNER });
      const machine = makeMachine();
      mockMachinesService.findById.mockResolvedValue(machine);
      mockMachinesService.updateStatus.mockResolvedValue({
        ...machine,
        status: MachineStatus.OFFLINE,
      });

      const dto = { status: MachineStatus.OFFLINE } as any;
      await controller.updateStatus("mc-1", dto, user as any);

      // OWNER passes undefined organizationId (no org filtering)
      expect(mockMachinesService.updateStatus).toHaveBeenCalledWith(
        "mc-1",
        MachineStatus.OFFLINE,
        undefined,
      );
    });

    it("should pass organizationId to service for cross-org filtering (non-OWNER)", async () => {
      const user = makeUser({ organizationId: "org-1" });
      mockMachinesService.updateStatus.mockResolvedValue(
        makeMachine({ status: MachineStatus.OFFLINE }),
      );

      const dto = { status: MachineStatus.OFFLINE } as any;
      await controller.updateStatus("mc-cross", dto, user as any);

      // Controller now delegates org check to service via organizationId
      expect(mockMachinesService.updateStatus).toHaveBeenCalledWith(
        "mc-cross",
        MachineStatus.OFFLINE,
        "org-1",
      );
    });
  });

  // ==========================================================================
  // updateTelemetry — inline cross-org check
  // ==========================================================================

  describe("updateTelemetry", () => {
    it("should delegate to service.updateTelemetry", async () => {
      const user = makeUser();
      const machine = makeMachine();
      const telemetry = { temperature: 22, humidity: 55 };
      mockMachinesService.findById.mockResolvedValue(machine);
      mockMachinesService.updateTelemetry.mockResolvedValue({
        ...machine,
        telemetry,
      });

      const result = await controller.updateTelemetry(
        "mc-1",
        telemetry as any,
        user as any,
      );

      expect(mockMachinesService.updateTelemetry).toHaveBeenCalledWith(
        "mc-1",
        telemetry,
      );
      expect(result).toMatchObject({ telemetry });
    });

    it("should throw ForbiddenException for cross-org access", async () => {
      const user = makeUser({ organizationId: "org-1" });
      mockMachinesService.findById.mockResolvedValue(
        makeMachine({ organizationId: "org-2" }),
      );

      await expect(
        controller.updateTelemetry("mc-cross", {} as any, user as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================================================
  // remove — inline cross-org check
  // ==========================================================================

  describe("remove", () => {
    it("should call service.remove with id and organizationId", async () => {
      const user = makeUser();
      mockMachinesService.remove.mockResolvedValue(undefined);

      await controller.remove("mc-1", user as any);

      // Controller always passes user.organizationId (no owner-bypass for delete)
      expect(mockMachinesService.remove).toHaveBeenCalledWith(
        "mc-1",
        "org-1",
      );
    });
  });

  // ==========================================================================
  // Slots — all use verifyMachineAccess (findById internally)
  // ==========================================================================

  describe("getSlots", () => {
    it("should return slots for accessible machine", async () => {
      const user = makeUser();
      const slots = [{ id: "slot-1", position: 1 }];
      mockMachinesService.findById.mockResolvedValue(makeMachine());
      mockMachinesService.getSlots.mockResolvedValue(slots);

      const result = await controller.getSlots("mc-1", user as any);

      expect(mockMachinesService.findById).toHaveBeenCalledWith("mc-1");
      expect(mockMachinesService.getSlots).toHaveBeenCalledWith("mc-1");
      expect(result).toEqual(slots);
    });

    it("should throw ForbiddenException for cross-org machine", async () => {
      const user = makeUser({ organizationId: "org-1" });
      mockMachinesService.findById.mockResolvedValue(
        makeMachine({ organizationId: "org-2" }),
      );

      await expect(
        controller.getSlots("mc-cross", user as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("createSlot", () => {
    it("should pass user.id to service.createSlot", async () => {
      const user = makeUser({ id: "user-99" });
      const dto = { position: 1, capacity: 10 } as any;
      const slot = { id: "slot-new", position: 1 };
      mockMachinesService.findById.mockResolvedValue(makeMachine());
      mockMachinesService.createSlot.mockResolvedValue(slot);

      const result = await controller.createSlot("mc-1", dto, user as any);

      expect(mockMachinesService.createSlot).toHaveBeenCalledWith(
        "mc-1",
        dto,
        "user-99",
      );
      expect(result).toEqual(slot);
    });
  });

  describe("updateSlot", () => {
    it("should pass slotId and user.id to service.updateSlot", async () => {
      const user = makeUser({ id: "user-1" });
      const dto = { capacity: 15 } as any;
      mockMachinesService.findById.mockResolvedValue(makeMachine());
      mockMachinesService.updateSlot.mockResolvedValue({
        id: "slot-1",
        capacity: 15,
      });

      await controller.updateSlot("mc-1", "slot-1", dto, user as any);

      expect(mockMachinesService.updateSlot).toHaveBeenCalledWith(
        "slot-1",
        dto,
        "user-1",
      );
    });
  });

  describe("refillSlot", () => {
    it("should pass slotId and user.id to service.refillSlot", async () => {
      const user = makeUser({ id: "user-1" });
      const dto = { quantity: 5 } as any;
      mockMachinesService.findById.mockResolvedValue(makeMachine());
      mockMachinesService.refillSlot.mockResolvedValue({
        id: "slot-1",
        currentQuantity: 5,
      });

      await controller.refillSlot("mc-1", "slot-1", dto, user as any);

      expect(mockMachinesService.refillSlot).toHaveBeenCalledWith(
        "slot-1",
        dto,
        "user-1",
      );
    });
  });

  // ==========================================================================
  // Location
  // ==========================================================================

  describe("moveToLocation", () => {
    it("should pass user.id to service.moveToLocation", async () => {
      const user = makeUser({ id: "user-1" });
      const dto = { locationId: "loc-1", reason: "RELOCATION" } as any;
      mockMachinesService.findById.mockResolvedValue(makeMachine());
      mockMachinesService.moveToLocation.mockResolvedValue({ success: true });

      const result = await controller.moveToLocation("mc-1", dto, user as any);

      expect(mockMachinesService.moveToLocation).toHaveBeenCalledWith(
        "mc-1",
        dto,
        "user-1",
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe("getLocationHistory", () => {
    it("should return location history for accessible machine", async () => {
      const user = makeUser();
      const history = [{ id: "lh-1", movedAt: new Date() }];
      mockMachinesService.findById.mockResolvedValue(makeMachine());
      mockMachinesService.getLocationHistory.mockResolvedValue(history);

      const result = await controller.getLocationHistory("mc-1", user as any);

      expect(mockMachinesService.getLocationHistory).toHaveBeenCalledWith(
        "mc-1",
      );
      expect(result).toEqual(history);
    });
  });

  // ==========================================================================
  // Components
  // ==========================================================================

  describe("getComponents", () => {
    it("should return components for accessible machine", async () => {
      const user = makeUser();
      const components = [{ id: "comp-1", type: "GRINDER" }];
      mockMachinesService.findById.mockResolvedValue(makeMachine());
      mockMachinesService.getComponents.mockResolvedValue(components);

      const result = await controller.getComponents("mc-1", user as any);

      expect(mockMachinesService.getComponents).toHaveBeenCalledWith("mc-1");
      expect(result).toEqual(components);
    });
  });

  describe("installComponent", () => {
    it("should pass user.id to service.installComponent", async () => {
      const user = makeUser({ id: "user-1" });
      const dto = { type: "GRINDER", serialNumber: "GR-001" } as any;
      mockMachinesService.findById.mockResolvedValue(makeMachine());
      mockMachinesService.installComponent.mockResolvedValue({
        id: "comp-new",
      });

      await controller.installComponent("mc-1", dto, user as any);

      expect(mockMachinesService.installComponent).toHaveBeenCalledWith(
        "mc-1",
        dto,
        "user-1",
      );
    });
  });

  describe("removeComponent", () => {
    it("should pass componentId and user.id to service.removeComponent", async () => {
      const user = makeUser({ id: "user-1" });
      mockMachinesService.findById.mockResolvedValue(makeMachine());
      mockMachinesService.removeComponent.mockResolvedValue(undefined);

      await controller.removeComponent("mc-1", "comp-1", user as any);

      expect(mockMachinesService.removeComponent).toHaveBeenCalledWith(
        "comp-1",
        "user-1",
      );
    });
  });

  // ==========================================================================
  // Error history
  // ==========================================================================

  describe("getErrorHistory", () => {
    it("should return error history for accessible machine", async () => {
      const user = makeUser();
      const errors = [{ id: "err-1", severity: "critical" }];
      mockMachinesService.findById.mockResolvedValue(makeMachine());
      mockMachinesService.getErrorHistory.mockResolvedValue(errors);

      const result = await controller.getErrorHistory("mc-1", user as any);

      expect(mockMachinesService.getErrorHistory).toHaveBeenCalledWith("mc-1");
      expect(result).toEqual(errors);
    });
  });

  describe("logError", () => {
    it("should pass user.id to service.logError", async () => {
      const user = makeUser({ id: "user-1" });
      const dto = { severity: "ERROR", description: "Motor jam" } as any;
      mockMachinesService.findById.mockResolvedValue(makeMachine());
      mockMachinesService.logError.mockResolvedValue({ id: "err-new" });

      await controller.logError("mc-1", dto, user as any);

      expect(mockMachinesService.logError).toHaveBeenCalledWith(
        "mc-1",
        dto,
        "user-1",
      );
    });
  });

  describe("resolveError", () => {
    it("should pass errorId and user.id to service.resolveError", async () => {
      const user = makeUser({ id: "user-1" });
      const dto = { resolution: "Cleared jam manually" } as any;
      mockMachinesService.findById.mockResolvedValue(makeMachine());
      mockMachinesService.resolveError.mockResolvedValue({
        id: "err-1",
        resolvedAt: new Date(),
      });

      await controller.resolveError("mc-1", "err-1", dto, user as any);

      expect(mockMachinesService.resolveError).toHaveBeenCalledWith(
        "err-1",
        dto,
        "user-1",
      );
    });
  });

  // ==========================================================================
  // Maintenance
  // ==========================================================================

  describe("getUpcomingMaintenance", () => {
    it("should return upcoming maintenance for accessible machine", async () => {
      const user = makeUser();
      const maintenance = [{ id: "maint-1", scheduledAt: new Date() }];
      mockMachinesService.findById.mockResolvedValue(makeMachine());
      mockMachinesService.getUpcomingMaintenance.mockResolvedValue(maintenance);

      const result = await controller.getUpcomingMaintenance(
        "mc-1",
        user as any,
      );

      expect(mockMachinesService.getUpcomingMaintenance).toHaveBeenCalledWith(
        "mc-1",
      );
      expect(result).toEqual(maintenance);
    });
  });

  describe("scheduleMaintenance", () => {
    it("should pass user.id to service.scheduleMaintenance", async () => {
      const user = makeUser({ id: "user-1" });
      const dto = { type: "CLEANING", scheduledAt: "2025-06-01" } as any;
      mockMachinesService.findById.mockResolvedValue(makeMachine());
      mockMachinesService.scheduleMaintenance.mockResolvedValue({
        id: "maint-new",
      });

      await controller.scheduleMaintenance("mc-1", dto, user as any);

      expect(mockMachinesService.scheduleMaintenance).toHaveBeenCalledWith(
        "mc-1",
        dto,
        "user-1",
      );
    });
  });

  describe("completeMaintenance", () => {
    it("should pass scheduleId and user.id to service.completeMaintenance", async () => {
      const user = makeUser({ id: "user-1" });
      const dto = { notes: "Cleaned grinder" } as any;
      mockMachinesService.findById.mockResolvedValue(makeMachine());
      mockMachinesService.completeMaintenance.mockResolvedValue({
        id: "maint-1",
        completedAt: new Date(),
      });

      await controller.completeMaintenance("mc-1", "maint-1", dto, user as any);

      expect(mockMachinesService.completeMaintenance).toHaveBeenCalledWith(
        "maint-1",
        dto,
        "user-1",
      );
    });
  });

  // ==========================================================================
  // getConnectivityStats — no verifyMachineAccess, uses org directly
  // ==========================================================================

  describe("getConnectivityStats", () => {
    it("should delegate with organizationId", async () => {
      const user = makeUser();
      const stats = {
        online: 10,
        offline: 2,
        unstable: 1,
        unknown: 0,
      };
      mockMachinesService.getConnectivityStats.mockResolvedValue(stats);

      const result = await controller.getConnectivityStats(user as any);

      expect(mockMachinesService.getConnectivityStats).toHaveBeenCalledWith(
        "org-1",
      );
      expect(result).toEqual(stats);
    });
  });

  // ==========================================================================
  // generateQrCode — passes user.organizationId (not user.id)
  // ==========================================================================

  describe("generateQrCode", () => {
    it("should pass user.organizationId (not user.id) to service", async () => {
      const user = makeUser({ id: "user-42", organizationId: "org-1" });
      const qrData = { qrCode: "QR-GENERATED", url: "https://vh.uz/mc-1" };
      mockMachinesService.findById.mockResolvedValue(makeMachine());
      mockMachinesService.generateQrCode.mockResolvedValue(qrData);

      const result = await controller.generateQrCode("mc-1", user as any);

      // IMPORTANT: second arg is organizationId, NOT userId
      expect(mockMachinesService.generateQrCode).toHaveBeenCalledWith(
        "mc-1",
        "org-1",
      );
      expect(result).toEqual(qrData);
    });

    it("should throw ForbiddenException for cross-org machine", async () => {
      const user = makeUser({ organizationId: "org-1" });
      mockMachinesService.findById.mockResolvedValue(
        makeMachine({ organizationId: "org-2" }),
      );

      await expect(
        controller.generateQrCode("mc-cross", user as any),
      ).rejects.toThrow(ForbiddenException);

      expect(mockMachinesService.generateQrCode).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getDepreciation — uses verifyMachineAccess
  // ==========================================================================

  describe("getDepreciation", () => {
    it("should return depreciation data for accessible machine", async () => {
      const user = makeUser();
      const depreciation = {
        bookValue: 5000000,
        accumulatedDepreciation: 1000000,
      };
      mockMachinesService.findById.mockResolvedValue(makeMachine());
      mockMachinesService.getDepreciation.mockResolvedValue(depreciation);

      const result = await controller.getDepreciation("mc-1", user as any);

      expect(mockMachinesService.getDepreciation).toHaveBeenCalledWith("mc-1");
      expect(result).toEqual(depreciation);
    });
  });

  // ==========================================================================
  // runDepreciationBatch — no verifyMachineAccess, uses org directly
  // ==========================================================================

  describe("runDepreciationBatch", () => {
    it("should delegate with organizationId", async () => {
      const user = makeUser();
      const batchResult = { processed: 5, updated: 4 };
      mockMachinesService.runDepreciationBatch.mockResolvedValue(batchResult);

      const result = await controller.runDepreciationBatch(user as any);

      expect(mockMachinesService.runDepreciationBatch).toHaveBeenCalledWith(
        "org-1",
      );
      expect(result).toEqual(batchResult);
    });
  });

  // ==========================================================================
  // pingMachine — no @Roles, no user param, no cross-org check
  // ==========================================================================

  describe("pingMachine", () => {
    it("should call service.updateConnectivity with machine id only", async () => {
      const connectivity = {
        id: "mc-1",
        connectionStatus: MachineConnectionStatus.ONLINE,
        lastPingAt: new Date(),
      };
      mockMachinesService.updateConnectivity.mockResolvedValue(connectivity);

      const result = await controller.pingMachine("mc-1");

      expect(mockMachinesService.updateConnectivity).toHaveBeenCalledWith(
        "mc-1",
      );
      expect(result).toEqual(connectivity);
    });

    it("should work without any user context", async () => {
      mockMachinesService.updateConnectivity.mockResolvedValue({ id: "mc-2" });

      // No user argument — pingMachine is a public endpoint
      await controller.pingMachine("mc-2");

      expect(mockMachinesService.updateConnectivity).toHaveBeenCalledWith(
        "mc-2",
      );
    });
  });

  // ==========================================================================
  // verifyMachineAccess cross-cutting: OWNER can access any org
  // ==========================================================================

  describe("verifyMachineAccess — OWNER bypass", () => {
    it("should allow OWNER to access sub-resources of another org's machine", async () => {
      const owner = makeUser({
        role: UserRole.OWNER,
        organizationId: "org-main",
      });
      const crossOrgMachine = makeMachine({ organizationId: "org-tenant" });
      mockMachinesService.findById.mockResolvedValue(crossOrgMachine);
      mockMachinesService.getSlots.mockResolvedValue([]);

      // Should NOT throw — OWNER has global access
      const result = await controller.getSlots("mc-cross", owner as any);

      expect(result).toEqual([]);
    });

    it("should throw ForbiddenException for non-OWNER cross-org sub-resource access", async () => {
      const user = makeUser({
        role: UserRole.MANAGER,
        organizationId: "org-1",
      });
      const crossOrgMachine = makeMachine({ organizationId: "org-2" });
      mockMachinesService.findById.mockResolvedValue(crossOrgMachine);

      await expect(
        controller.getSlots("mc-cross", user as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
