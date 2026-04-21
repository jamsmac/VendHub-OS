import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { QuantitySyncService } from "./quantity-sync.service";
import { MachineSlot } from "../../machines/entities/machine.entity";
import {
  Transaction,
  TransactionItem,
} from "../../transactions/entities/transaction.entity";

// Helper: build a mock QueryBuilder chain used by createQueryBuilder().update()...
function makeQbMock() {
  const executeMock = jest.fn().mockResolvedValue({ affected: 1 });
  const qb = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: executeMock,
  };
  return { qb, executeMock };
}

describe("QuantitySyncService", () => {
  let service: QuantitySyncService;
  let slotRepo: {
    createQueryBuilder: jest.Mock;
  };
  let itemRepo: {
    find: jest.Mock;
  };

  beforeEach(async () => {
    const { qb } = makeQbMock();

    slotRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    itemRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuantitySyncService,
        {
          provide: getRepositoryToken(MachineSlot),
          useValue: slotRepo,
        },
        {
          provide: getRepositoryToken(TransactionItem),
          useValue: itemRepo,
        },
      ],
    }).compile();

    service = module.get(QuantitySyncService);
  });

  // =========================================================================
  // handleTransactionCreated
  // =========================================================================

  describe("handleTransactionCreated", () => {
    it("should execute UPDATE query with GREATEST when sale has items", async () => {
      const items: Partial<TransactionItem>[] = [
        { productId: "product-1", quantity: 3 },
      ];
      itemRepo.find.mockResolvedValue(items);

      // Re-create the QB mock so we can capture the execute call
      const executeMock = jest.fn().mockResolvedValue({ affected: 1 });
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: executeMock,
      };
      slotRepo.createQueryBuilder.mockReturnValue(qb);

      const tx = { id: "tx-1", machineId: "machine-1" } as Transaction;
      await service.handleTransactionCreated(tx);

      expect(itemRepo.find).toHaveBeenCalledWith({
        where: { transactionId: "tx-1" },
        select: ["productId", "quantity"],
      });

      expect(slotRepo.createQueryBuilder).toHaveBeenCalled();
      expect(qb.update).toHaveBeenCalledWith(MachineSlot);
      expect(qb.where).toHaveBeenCalledWith(
        "machine_id = :machineId AND product_id = :productId",
        { machineId: "machine-1", productId: "product-1" },
      );
      expect(executeMock).toHaveBeenCalledTimes(1);

      // Verify the set() lambda produces a GREATEST expression
      const setArg = qb.set.mock.calls[0][0] as {
        currentQuantity: () => string;
      };
      const sql = setArg.currentQuantity();
      expect(sql).toMatch(/GREATEST/);
      expect(sql).toMatch(/3/); // quantity rounded
    });

    it("should execute UPDATE for each item when there are multiple items", async () => {
      const items: Partial<TransactionItem>[] = [
        { productId: "product-1", quantity: 2 },
        { productId: "product-2", quantity: 1 },
      ];
      itemRepo.find.mockResolvedValue(items);

      const executeMock = jest.fn().mockResolvedValue({ affected: 1 });
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: executeMock,
      };
      slotRepo.createQueryBuilder.mockReturnValue(qb);

      const tx = { id: "tx-2", machineId: "machine-2" } as Transaction;
      await service.handleTransactionCreated(tx);

      expect(executeMock).toHaveBeenCalledTimes(2);
    });

    it("should not execute any query when machineId is undefined", async () => {
      const tx = { id: "tx-3", machineId: undefined } as unknown as Transaction;
      await service.handleTransactionCreated(tx);

      expect(itemRepo.find).not.toHaveBeenCalled();
      expect(slotRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("should not execute any query when machineId is null", async () => {
      const tx = { id: "tx-4", machineId: null } as unknown as Transaction;
      await service.handleTransactionCreated(tx);

      expect(itemRepo.find).not.toHaveBeenCalled();
      expect(slotRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("should not execute any query when items array is empty", async () => {
      itemRepo.find.mockResolvedValue([]);

      const executeMock = jest.fn();
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: executeMock,
      };
      slotRepo.createQueryBuilder.mockReturnValue(qb);

      const tx = { id: "tx-5", machineId: "machine-5" } as Transaction;
      await service.handleTransactionCreated(tx);

      expect(executeMock).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // resetOnRefill
  // =========================================================================

  describe("resetOnRefill", () => {
    it("should set currentQuantity = capacity via UPDATE query", async () => {
      const executeMock = jest.fn().mockResolvedValue({ affected: 1 });
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: executeMock,
      };
      slotRepo.createQueryBuilder.mockReturnValue(qb);

      await service.resetOnRefill("machine-1", "product-1");

      expect(slotRepo.createQueryBuilder).toHaveBeenCalled();
      expect(qb.update).toHaveBeenCalledWith(MachineSlot);
      expect(qb.where).toHaveBeenCalledWith(
        "machine_id = :machineId AND product_id = :productId",
        { machineId: "machine-1", productId: "product-1" },
      );
      expect(executeMock).toHaveBeenCalledTimes(1);

      // Verify set() lambda returns "capacity"
      const setArg = qb.set.mock.calls[0][0] as {
        currentQuantity: () => string;
      };
      expect(setArg.currentQuantity()).toBe("capacity");
    });
  });
});
