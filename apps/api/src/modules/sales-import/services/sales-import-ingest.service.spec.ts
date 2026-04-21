import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";
import { readFileSync } from "fs";
import { join } from "path";
import { HiconParserService } from "./hicon-parser.service";
import { ParseSessionService } from "./parse-session.service";
import { SalesImportIngestService } from "./sales-import-ingest.service";
import {
  SalesImport,
  SalesImportFormat,
} from "../entities/sales-import.entity";
import { SalesTxnHash } from "../entities/sales-txn-hash.entity";
import { SalesAggregated } from "../entities/sales-aggregated.entity";
import { ParseSession } from "../entities/parse-session.entity";
import { Machine } from "../../machines/entities/machine.entity";
import { Product } from "../../products/entities/product.entity";
import { StockMovementsService } from "../../stock-movements/services/stock-movements.service";

// ─────────────────────────────────────────────────────────────────
// In-memory test doubles — enough to exercise dedup behavior.
// ─────────────────────────────────────────────────────────────────

interface HashRow {
  id: string;
  organizationId: string;
  hashKey: string;
  salesImportId: string;
}
interface AggRow {
  organizationId: string;
  reportDay: string;
  machineId: string;
  productId: string;
  qty: number;
  totalAmount: number;
  lastImportId: string | null;
  lastUpdate: Date;
}
interface SessionRow {
  id: string;
  organizationId: string;
  byUserId: string;
  format: string;
  fileName: string;
  storageKey: string | null;
  reportDay: string | null;
  rows: string[][];
  headers: string[];
  expiresAt: Date;
}

class InMemoryHashRepo {
  store: HashRow[] = [];
  private seq = 0;
  create(data: Partial<HashRow>): HashRow {
    return {
      id: `h-${++this.seq}`,
      organizationId: data.organizationId!,
      hashKey: data.hashKey!,
      salesImportId: data.salesImportId!,
    };
  }
  async find(opts: {
    where: { organizationId: string; hashKey: unknown };
  }): Promise<HashRow[]> {
    const { organizationId, hashKey } = opts.where;
    const list = Array.isArray((hashKey as { _value: string[] })?._value)
      ? (hashKey as { _value: string[] })._value
      : typeof hashKey === "string"
        ? [hashKey]
        : ((hashKey as string[]) ?? []);
    return this.store.filter(
      (h) => h.organizationId === organizationId && list.includes(h.hashKey),
    );
  }
  async save(entities: HashRow[] | HashRow): Promise<HashRow[] | HashRow> {
    const arr = Array.isArray(entities) ? entities : [entities];
    for (const e of arr) {
      if (!e.id) e.id = `h-${++this.seq}`;
      this.store.push(e);
    }
    return entities;
  }
}

class InMemoryAggRepo {
  store: AggRow[] = [];
  async find(opts: {
    where: {
      organizationId: string;
      reportDay: string;
      machineId: string;
    };
  }): Promise<AggRow[]> {
    const { organizationId, reportDay, machineId } = opts.where;
    return this.store.filter(
      (a) =>
        a.organizationId === organizationId &&
        a.reportDay === reportDay &&
        a.machineId === machineId,
    );
  }
}

class InMemorySessionRepo {
  store: SessionRow[] = [];
  private seq = 0;
  create(data: Partial<SessionRow>): SessionRow {
    return {
      id: `sess-${++this.seq}`,
      organizationId: data.organizationId!,
      byUserId: data.byUserId!,
      format: data.format!,
      fileName: data.fileName!,
      storageKey: data.storageKey ?? null,
      reportDay: data.reportDay ?? null,
      rows: data.rows!,
      headers: data.headers!,
      expiresAt: data.expiresAt!,
    };
  }
  async save(entity: SessionRow): Promise<SessionRow> {
    this.store.push(entity);
    return entity;
  }
  async findOne(opts: {
    where: { id: string; organizationId: string };
  }): Promise<SessionRow | null> {
    const { id, organizationId } = opts.where;
    return (
      this.store.find(
        (s) => s.id === id && s.organizationId === organizationId,
      ) ?? null
    );
  }
  async delete(_where: unknown): Promise<{ affected: number }> {
    return { affected: 0 };
  }
}

class InMemoryProductRepo {
  store: Array<{
    id: string;
    organizationId: string;
    name: string;
    nameUz: string | null;
  }> = [];
  async find(_opts: unknown): Promise<typeof this.store> {
    return this.store;
  }
}

class InMemoryMachineRepo {
  store: Array<{
    id: string;
    organizationId: string;
    locationId: string;
  }> = [];
  async findOne(opts: {
    where: { id: string; organizationId: string };
  }): Promise<(typeof this.store)[number] | null> {
    const { id, organizationId } = opts.where;
    return (
      this.store.find(
        (m) => m.id === id && m.organizationId === organizationId,
      ) ?? null
    );
  }
}

interface StoredImport {
  id: string;
  organizationId: string;
  imported: number;
  skipped: number;
  unmapped: number;
  deltaAdjusted: number;
  totalQty: number;
  totalRevenue: number;
}

class InMemoryImportRepo {
  store: StoredImport[] = [];
  private seq = 0;
  create(data: Partial<StoredImport>): StoredImport {
    return {
      id: `imp-${++this.seq}`,
      organizationId: data.organizationId!,
      imported: data.imported ?? 0,
      skipped: data.skipped ?? 0,
      unmapped: data.unmapped ?? 0,
      deltaAdjusted: data.deltaAdjusted ?? 0,
      totalQty: data.totalQty ?? 0,
      totalRevenue: data.totalRevenue ?? 0,
    };
  }
  async save(entity: StoredImport): Promise<StoredImport> {
    this.store.push(entity);
    return entity;
  }
}

function buildTransactionRunner(deps: {
  hashRepo: InMemoryHashRepo;
  aggRepo: InMemoryAggRepo;
  importRepo: InMemoryImportRepo;
}) {
  return async <T>(
    work: (manager: {
      create: (entity: unknown, data: Partial<unknown>) => unknown;
      save: (...args: unknown[]) => Promise<unknown>;
      createQueryBuilder: () => unknown;
    }) => Promise<T>,
  ): Promise<T> => {
    const manager = {
      create: (entity: unknown, data: Partial<unknown>) => {
        if (entity === SalesImport)
          return deps.importRepo.create(data as Partial<StoredImport>);
        if (entity === SalesTxnHash)
          return deps.hashRepo.create(data as Partial<HashRow>);
        return data;
      },
      save: async (entityOrTarget: unknown, maybeData?: unknown) => {
        // Two forms: save(entity) and save(Target, data[])
        if (maybeData === undefined) {
          const obj = entityOrTarget as Record<string, unknown>;
          // Determine type by shape
          if (
            obj &&
            typeof obj === "object" &&
            "imported" in obj &&
            "totalRevenue" in obj
          ) {
            return deps.importRepo.save(obj as unknown as StoredImport);
          }
          if (obj && typeof obj === "object" && "hashKey" in obj) {
            return deps.hashRepo.save(obj as unknown as HashRow);
          }
          return obj;
        }
        if (entityOrTarget === SalesTxnHash) {
          return deps.hashRepo.save(maybeData as HashRow[]);
        }
        return maybeData;
      },
      createQueryBuilder: () => {
        const state = { values: null as AggRow | null };
        const qb: Record<string, unknown> = {};
        qb.insert = () => qb;
        qb.into = () => qb;
        qb.values = (v: AggRow) => {
          state.values = v;
          return qb;
        };
        qb.orUpdate = () => qb;
        qb.execute = async () => {
          if (state.values) {
            const v = state.values;
            const idx = deps.aggRepo.store.findIndex(
              (a) =>
                a.organizationId === v.organizationId &&
                a.reportDay === v.reportDay &&
                a.machineId === v.machineId &&
                a.productId === v.productId,
            );
            if (idx >= 0) deps.aggRepo.store[idx] = v;
            else deps.aggRepo.store.push(v);
          }
          return { affected: 1 };
        };
        return qb;
      },
    };
    return work(manager);
  };
}

// ─────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────

describe("SalesImportIngestService — 3-level dedup", () => {
  const ORG = "00000000-0000-0000-0000-000000000001";
  const USER = "00000000-0000-0000-0000-000000000002";
  const MACHINE = "00000000-0000-0000-0000-00000000000a";
  const LOC = "00000000-0000-0000-0000-00000000000b";
  const DAY = "2026-04-21";

  let service: SalesImportIngestService;
  let parseSessionService: ParseSessionService;
  let hashRepo: InMemoryHashRepo;
  let aggRepo: InMemoryAggRepo;
  let sessionRepo: InMemorySessionRepo;
  let importRepo: InMemoryImportRepo;
  let machineRepo: InMemoryMachineRepo;
  let productRepo: InMemoryProductRepo;
  let stockMovementsService: { recordBatch: jest.Mock };

  const FIXTURE = readFileSync(
    join(
      __dirname,
      "../../../../../..",
      "docs",
      "inventory-platform",
      "Product_name2026-4-21_15_34_44.csv",
    ),
    "utf-8",
  );

  beforeEach(async () => {
    hashRepo = new InMemoryHashRepo();
    aggRepo = new InMemoryAggRepo();
    sessionRepo = new InMemorySessionRepo();
    importRepo = new InMemoryImportRepo();
    machineRepo = new InMemoryMachineRepo();
    productRepo = new InMemoryProductRepo();
    stockMovementsService = { recordBatch: jest.fn().mockResolvedValue([]) };

    machineRepo.store.push({
      id: MACHINE,
      organizationId: ORG,
      locationId: LOC,
    });
    productRepo.store.push(
      {
        id: "p-fusetea",
        organizationId: ORG,
        name: "FuseTea Tea",
        nameUz: null,
      },
      {
        id: "p-fanta",
        organizationId: ORG,
        name: "Fanta Classic CAN 250ml",
        nameUz: null,
      },
      {
        id: "p-coca",
        organizationId: ORG,
        name: "CocaCola Classic CAN 250ml",
        nameUz: null,
      },
    );

    const runTx = buildTransactionRunner({ hashRepo, aggRepo, importRepo });
    const dataSource = { transaction: runTx } as unknown as DataSource;

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        SalesImportIngestService,
        HiconParserService,
        ParseSessionService,
        {
          provide: getRepositoryToken(SalesImport),
          useValue: importRepo,
        },
        {
          provide: getRepositoryToken(SalesTxnHash),
          useValue: hashRepo,
        },
        {
          provide: getRepositoryToken(SalesAggregated),
          useValue: aggRepo,
        },
        {
          provide: getRepositoryToken(ParseSession),
          useValue: sessionRepo,
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: machineRepo,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: productRepo,
        },
        {
          provide: StockMovementsService,
          useValue: stockMovementsService,
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = mod.get(SalesImportIngestService);
    parseSessionService = mod.get(ParseSessionService);
  });

  async function uploadFixture(): Promise<string> {
    const res = await service.uploadAndParse(ORG, USER, {
      fileName: "Product_name2026-4-21.csv",
      fileContent: FIXTURE,
    });
    return res.sessionId;
  }

  function buildProductMap(): Record<string, string> {
    return {
      "FuseTea Tea": "p-fusetea",
      "Fanta Classic CAN 250ml": "p-fanta",
      "CocaCola Classic CAN 250ml": "p-coca",
    };
  }

  it("uploadAndParse detects HICON and returns a session", async () => {
    const res = await service.uploadAndParse(ORG, USER, {
      fileName: "Product_name2026-4-21.csv",
      fileContent: FIXTURE,
    });
    expect(res.format).toBe(SalesImportFormat.HICON);
    expect(res.totalRows).toBe(3);
    expect(res.sessionId).toBeDefined();
    expect(res.guessedMapping.productCol).toBe(2);
  });

  it("first import: N movements, 0 skipped", async () => {
    const sessionId = await uploadFixture();
    const res = await service.execute(ORG, USER, {
      sessionId,
      machineId: MACHINE,
      reportDay: DAY,
      productMap: buildProductMap(),
    });
    expect(res.imported).toBe(3);
    expect(res.skipped).toBe(0);
    expect(res.unmapped).toBe(0);
    expect(res.deltaAdjusted).toBe(0);
    expect(stockMovementsService.recordBatch).toHaveBeenCalledTimes(1);
    const movements = stockMovementsService.recordBatch.mock.calls[0][0];
    expect(movements).toHaveLength(3);
  });

  it("re-upload of the same file: 0 imported, all skipped (L1 row hash)", async () => {
    // First import
    const sess1 = await uploadFixture();
    await service.execute(ORG, USER, {
      sessionId: sess1,
      machineId: MACHINE,
      reportDay: DAY,
      productMap: buildProductMap(),
    });

    // Re-upload same file
    stockMovementsService.recordBatch.mockClear();
    const sess2 = await uploadFixture();
    const res = await service.execute(ORG, USER, {
      sessionId: sess2,
      machineId: MACHINE,
      reportDay: DAY,
      productMap: buildProductMap(),
    });
    // All rows collide with prior row hashes
    // (HICON delta also fires — whichever L1 or L3 skips first)
    expect(res.imported).toBe(0);
    expect(res.skipped).toBe(3);
    expect(stockMovementsService.recordBatch).not.toHaveBeenCalled();
  });

  it("HICON delta (L3): cumulative qty grows from 1 → 3 → imports only +2", async () => {
    // Day 1: qty=1 for Fanta
    const csv1 =
      "ProductID,code,Product name,Pay,Qty,Profit,Proportion,Total amount,Total quantity\n" +
      "499,499,Fanta Classic CAN 250ml,10000,1,0,25,10000,1,\n";
    const s1 = await service.uploadAndParse(ORG, USER, {
      fileName: "f1.csv",
      fileContent: csv1,
    });
    const r1 = await service.execute(ORG, USER, {
      sessionId: s1.sessionId,
      machineId: MACHINE,
      reportDay: DAY,
      productMap: { "Fanta Classic CAN 250ml": "p-fanta" },
    });
    expect(r1.imported).toBe(1);
    expect(r1.totalQty).toBe(1);

    // Day 1 (same day!), new upload with qty=3 (cumulative). Delta should be +2.
    const csv2 =
      "ProductID,code,Product name,Pay,Qty,Profit,Proportion,Total amount,Total quantity\n" +
      "499,499,Fanta Classic CAN 250ml,10000,3,0,25,30000,3,\n";
    stockMovementsService.recordBatch.mockClear();
    const s2 = await service.uploadAndParse(ORG, USER, {
      fileName: "f2.csv",
      fileContent: csv2,
    });
    const r2 = await service.execute(ORG, USER, {
      sessionId: s2.sessionId,
      machineId: MACHINE,
      reportDay: DAY,
      productMap: { "Fanta Classic CAN 250ml": "p-fanta" },
    });
    expect(r2.imported).toBe(1);
    expect(r2.deltaAdjusted).toBe(1);
    expect(r2.totalQty).toBe(2); // delta, not cumulative
    const movements = stockMovementsService.recordBatch.mock.calls[0][0];
    expect(movements[0].quantity).toBe(2);
  });

  it("in-batch dedup: duplicate rows in the same file are deduplicated", async () => {
    const csv =
      "ProductID,code,Product name,Pay,Qty,Profit,Proportion,Total amount,Total quantity\n" +
      "499,499,Fanta Classic CAN 250ml,10000,1,0,25,10000,1,\n" +
      "499,499,Fanta Classic CAN 250ml,10000,1,0,25,10000,1,\n";
    const s = await service.uploadAndParse(ORG, USER, {
      fileName: "dup.csv",
      fileContent: csv,
    });
    const r = await service.execute(ORG, USER, {
      sessionId: s.sessionId,
      machineId: MACHINE,
      reportDay: DAY,
      productMap: { "Fanta Classic CAN 250ml": "p-fanta" },
    });
    expect(r.imported).toBe(1);
    expect(r.skipped).toBe(1);
  });

  it("unmapped products are counted and listed", async () => {
    const sessionId = await uploadFixture();
    const res = await service.execute(ORG, USER, {
      sessionId,
      machineId: MACHINE,
      reportDay: DAY,
      productMap: { "FuseTea Tea": "p-fusetea" }, // only one mapped
    });
    expect(res.imported).toBe(1);
    expect(res.unmapped).toBe(2);
    expect(res.unmappedNames.sort()).toEqual(
      ["CocaCola Classic CAN 250ml", "Fanta Classic CAN 250ml"].sort(),
    );
  });

  it("confirmMapping suggests products via fuzzy match", async () => {
    const sessionId = await uploadFixture();
    const res = await service.confirmMapping(ORG, {
      sessionId,
      machineId: MACHINE,
      reportDay: DAY,
    });
    expect(res.uniqueNames.length).toBe(3);
    expect(res.matchedMap["FuseTea Tea"]?.productId).toBe("p-fusetea");
    expect(res.matchedMap["Fanta Classic CAN 250ml"]?.productId).toBe(
      "p-fanta",
    );
    expect(res.matchedMap["CocaCola Classic CAN 250ml"]?.productId).toBe(
      "p-coca",
    );
  });

  it("parseSessionService is injected (smoke)", () => {
    expect(parseSessionService).toBeDefined();
  });
});

// Suppress unused-imports warning for `In` (kept for InMemoryHashRepo signature parity)
void In;
