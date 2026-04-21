import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { QuantitySyncService } from "./quantity-sync.service";
import { Machine, MachineSlot } from "../../machines/entities/machine.entity";
import {
  Transaction,
  TransactionItem,
} from "../../transactions/entities/transaction.entity";
import { StockMovementsService } from "../../stock-movements/services/stock-movements.service";
import { MovementType } from "../../stock-movements/entities/stock-movement.entity";

function makeQb() {
  const executeMock = jest.fn().mockResolvedValue({ affected: 1 });
  const qb = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: executeMock,
  };
  return { qb, executeMock };
}

describe("QuantitySyncService", () => {
  let service: QuantitySyncService;
  let slotRepo: { createQueryBuilder: jest.Mock };
  let itemRepo: { find: jest.Mock };
  let machineRepo: { findOne: jest.Mock };
  let stockMovementsService: { record: jest.Mock };

  beforeEach(async () => {
    const { qb } = makeQb();

    slotRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    itemRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    machineRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: "machine-1",
        locationId: "location-1",
      }),
    };

    stockMovementsService = {
      record: jest.fn().mockResolvedValue({ id: "movement-1" }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuantitySyncService,
        { provide: getRepositoryToken(MachineSlot), useValue: slotRepo },
        { provide: getRepositoryToken(TransactionItem), useValue: itemRepo },
        { provide: getRepositoryToken(Machine), useValue: machineRepo },
        { provide: StockMovementsService, useValue: stockMovementsService },
      ],
    }).compile();

    service = module.get(QuantitySyncService);
  });

  // =========================================================================
  // handleTransactionCreated — dual-write (MachineSlot UPDATE + SALE movement)
  // =========================================================================

  describe("handleTransactionCreated", () => {
    it("should execute UPDATE query with GREATEST when sale has items", async () => {
      const items: Partial<TransactionItem>[] = [
        { productId: "product-1", quantity: 3, unitPrice: 10000 },
      ];
      itemRepo.find.mockResolvedValue(items);

      const { qb, executeMock } = makeQb();
      slotRepo.createQueryBuilder.mockReturnValue(qb);

      const tx = {
        id: "tx-1",
        machineId: "machine-1",
        organizationId: "org-1",
        transactionDate: new Date("2026-04-20T10:00:00Z"),
      } as Transaction;
      await service.handleTransactionCreated(tx);

      expect(itemRepo.find).toHaveBeenCalledWith({
        where: { transactionId: "tx-1" },
        select: ["productId", "quantity", "unitPrice"],
      });

      expect(slotRepo.createQueryBuilder).toHaveBeenCalled();
      expect(qb.update).toHaveBeenCalledWith(MachineSlot);
      expect(qb.where).toHaveBeenCalledWith(
        "machine_id = :machineId AND product_id = :productId",
        { machineId: "machine-1", productId: "product-1" },
      );
      expect(executeMock).toHaveBeenCalledTimes(1);

      const setArg = qb.set.mock.calls[0][0] as {
        currentQuantity: () => string;
      };
      const sql = setArg.currentQuantity();
      expect(sql).toMatch(/GREATEST/);
      expect(sql).toMatch(/3/);
    });

    it("should record a SALE stock movement when machine has locationId", async () => {
      const items: Partial<TransactionItem>[] = [
        { productId: "product-1", quantity: 2, unitPrice: 5500 },
      ];
      itemRepo.find.mockResolvedValue(items);

      const tx = {
        id: "tx-sale-1",
        machineId: "machine-1",
        organizationId: "org-1",
        transactionDate: new Date("2026-04-20T10:00:00Z"),
      } as Transaction;
      await service.handleTransactionCreated(tx);

      expect(stockMovementsService.record).toHaveBeenCalledTimes(1);
      expect(stockMovementsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          productId: "product-1",
          fromLocationId: "location-1",
          toLocationId: null,
          quantity: 2,
          movementType: MovementType.SALE,
          unitPrice: 5500,
          referenceId: "tx-sale-1",
        }),
      );
    });

    it("should NOT record stock movement when machine has no locationId", async () => {
      machineRepo.findOne.mockResolvedValue({
        id: "machine-1",
        locationId: null,
      });
      const items: Partial<TransactionItem>[] = [
        { productId: "product-1", quantity: 1, unitPrice: 1000 },
      ];
      itemRepo.find.mockResolvedValue(items);

      const tx = {
        id: "tx-no-loc",
        machineId: "machine-1",
        organizationId: "org-1",
      } as Transaction;
      await service.handleTransactionCreated(tx);

      expect(stockMovementsService.record).not.toHaveBeenCalled();
      // But MachineSlot UPDATE still runs (dual-write cache)
      expect(slotRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it("should NOT break MachineSlot update when stock movement record throws", async () => {
      stockMovementsService.record.mockRejectedValue(new Error("db down"));
      const items: Partial<TransactionItem>[] = [
        { productId: "product-1", quantity: 4, unitPrice: 2000 },
      ];
      itemRepo.find.mockResolvedValue(items);

      const tx = {
        id: "tx-fail",
        machineId: "machine-1",
        organizationId: "org-1",
      } as Transaction;
      await expect(service.handleTransactionCreated(tx)).resolves.not.toThrow();
      expect(slotRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it("should execute UPDATE and record movement for each item when multiple items", async () => {
      const items: Partial<TransactionItem>[] = [
        { productId: "product-1", quantity: 2, unitPrice: 1000 },
        { productId: "product-2", quantity: 1, unitPrice: 2000 },
      ];
      itemRepo.find.mockResolvedValue(items);

      const { qb, executeMock } = makeQb();
      slotRepo.createQueryBuilder.mockReturnValue(qb);

      const tx = {
        id: "tx-2",
        machineId: "machine-1",
        organizationId: "org-2",
      } as Transaction;
      await service.handleTransactionCreated(tx);

      expect(executeMock).toHaveBeenCalledTimes(2);
      expect(stockMovementsService.record).toHaveBeenCalledTimes(2);
    });

    it("should not execute any query when machineId is undefined", async () => {
      const tx = { id: "tx-3", machineId: undefined } as unknown as Transaction;
      await service.handleTransactionCreated(tx);

      expect(itemRepo.find).not.toHaveBeenCalled();
      expect(slotRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(stockMovementsService.record).not.toHaveBeenCalled();
    });

    it("should not execute any query when machineId is null", async () => {
      const tx = { id: "tx-4", machineId: null } as unknown as Transaction;
      await service.handleTransactionCreated(tx);

      expect(itemRepo.find).not.toHaveBeenCalled();
      expect(slotRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("should not execute any query when organizationId is missing", async () => {
      const tx = {
        id: "tx-no-org",
        machineId: "machine-x",
        organizationId: undefined,
      } as unknown as Transaction;
      await service.handleTransactionCreated(tx);

      expect(itemRepo.find).not.toHaveBeenCalled();
      expect(slotRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("should not execute any query when items array is empty", async () => {
      itemRepo.find.mockResolvedValue([]);

      const { qb, executeMock } = makeQb();
      slotRepo.createQueryBuilder.mockReturnValue(qb);

      const tx = {
        id: "tx-5",
        machineId: "machine-5",
        organizationId: "org-5",
      } as Transaction;
      await service.handleTransactionCreated(tx);

      expect(executeMock).not.toHaveBeenCalled();
      expect(stockMovementsService.record).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // resetOnRefill
  // =========================================================================

  describe("resetOnRefill", () => {
    it("should set currentQuantity = capacity via UPDATE query", async () => {
      const { qb, executeMock } = makeQb();
      slotRepo.createQueryBuilder.mockReturnValue(qb);

      await service.resetOnRefill("machine-1", "product-1");

      expect(slotRepo.createQueryBuilder).toHaveBeenCalled();
      expect(qb.update).toHaveBeenCalledWith(MachineSlot);
      expect(qb.where).toHaveBeenCalledWith(
        "machine_id = :machineId AND product_id = :productId",
        { machineId: "machine-1", productId: "product-1" },
      );
      expect(executeMock).toHaveBeenCalledTimes(1);

      const setArg = qb.set.mock.calls[0][0] as {
        currentQuantity: () => string;
      };
      expect(setArg.currentQuantity()).toBe("capacity");
    });
  });
});
