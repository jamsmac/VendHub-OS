import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { SlotHistoryService } from "./slot-history.service";
import {
  SlotHistory,
  SlotHistoryAction,
} from "../entities/slot-history.entity";

describe("SlotHistoryService", () => {
  let service: SlotHistoryService;
  let historyRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findAndCount: jest.Mock;
  };

  beforeEach(async () => {
    historyRepo = {
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) => Promise.resolve({ id: "hist-1", ...entity })),
      findAndCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotHistoryService,
        { provide: getRepositoryToken(SlotHistory), useValue: historyRepo },
      ],
    }).compile();

    service = module.get(SlotHistoryService);
  });

  describe("log", () => {
    it("saves with required fields and nulls for unspecified optional fields", async () => {
      const result = await service.log({
        organizationId: "org-1",
        machineId: "machine-1",
        slotNumber: "A1",
        action: SlotHistoryAction.SET,
        newProductId: "product-1",
      });

      expect(historyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          machineId: "machine-1",
          slotNumber: "A1",
          action: SlotHistoryAction.SET,
          prevProductId: null,
          newProductId: "product-1",
          prevQuantity: null,
          newQuantity: null,
          prevPrice: null,
          newPrice: null,
          note: null,
          byUserId: null,
        }),
      );
      const createCall = historyRepo.create.mock.calls[0]?.[0] as {
        at: Date;
      };
      expect(createCall.at).toBeInstanceOf(Date);
      expect(result).toHaveProperty("id", "hist-1");
    });

    it("preserves explicit values for all optional fields", async () => {
      const at = new Date("2026-04-20T10:00:00Z");
      await service.log({
        organizationId: "org-1",
        machineId: "machine-1",
        slotNumber: "A2",
        action: SlotHistoryAction.UPDATE_PRICE,
        prevProductId: "p-old",
        newProductId: "p-new",
        prevQuantity: 5,
        newQuantity: 8,
        prevPrice: 1000,
        newPrice: 1500,
        note: "price bump",
        byUserId: "user-1",
        at,
      });

      expect(historyRepo.create).toHaveBeenCalledWith({
        organizationId: "org-1",
        machineId: "machine-1",
        slotNumber: "A2",
        action: SlotHistoryAction.UPDATE_PRICE,
        prevProductId: "p-old",
        newProductId: "p-new",
        prevQuantity: 5,
        newQuantity: 8,
        prevPrice: 1000,
        newPrice: 1500,
        note: "price bump",
        byUserId: "user-1",
        at,
      });
    });
  });

  describe("listByMachine", () => {
    it("queries with org + machine filter, returns sorted by at DESC", async () => {
      const rows = [
        { id: "h-1", at: new Date("2026-04-20T12:00:00Z") },
        { id: "h-2", at: new Date("2026-04-20T10:00:00Z") },
      ];
      historyRepo.findAndCount.mockResolvedValue([rows, 2]);

      const result = await service.listByMachine({
        organizationId: "org-1",
        machineId: "machine-1",
      });

      expect(historyRepo.findAndCount).toHaveBeenCalledWith({
        where: { organizationId: "org-1", machineId: "machine-1" },
        order: { at: "DESC" },
        skip: 0,
        take: 50,
        relations: ["prevProduct", "newProduct", "byUser"],
      });
      expect(result).toEqual({ data: rows, total: 2 });
    });

    it("caps limit at 200", async () => {
      historyRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listByMachine({
        organizationId: "org-1",
        machineId: "machine-1",
        limit: 9999,
        offset: 100,
      });

      expect(historyRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 100,
          take: 200,
        }),
      );
    });
  });
});
