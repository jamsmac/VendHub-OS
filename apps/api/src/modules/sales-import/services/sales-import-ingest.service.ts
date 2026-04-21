import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";
import { Machine } from "../../machines/entities/machine.entity";
import { Product } from "../../products/entities/product.entity";
import {
  MovementReferenceType,
  MovementType,
} from "../../stock-movements/entities/stock-movement.entity";
import {
  RecordMovementInput,
  StockMovementsService,
} from "../../stock-movements/services/stock-movements.service";
import {
  ImportFileType,
  ImportStatus,
  SalesImport,
  SalesImportFormat,
} from "../entities/sales-import.entity";
import { SalesAggregated } from "../entities/sales-aggregated.entity";
import { SalesTxnHash } from "../entities/sales-txn-hash.entity";
import { hashRow, hashTxn } from "../utils/hash";
import { MatchCandidate, matchProductName } from "../utils/fuzzy-matcher";
import { HiconParserService } from "./hicon-parser.service";
import { ParseSessionService } from "./parse-session.service";

export interface UploadAndParseInput {
  fileName: string;
  fileContent: string;
  format?: SalesImportFormat;
}

export interface UploadAndParseResult {
  sessionId: string;
  expiresAt: Date;
  format: SalesImportFormat;
  headers: string[];
  sample: string[][];
  totalRows: number;
  skippedServiceRows: number;
  guessedMapping: {
    productCol: number;
    quantityCol: number;
    totalAmountCol: number;
    txnIdCol: number;
  };
}

export interface ConfirmMappingInput {
  sessionId: string;
  machineId: string;
  reportDay: string;
  productCol?: number;
  quantityCol?: number;
  totalAmountCol?: number;
  txnIdCol?: number;
}

export interface ConfirmMappingResult {
  uniqueNames: string[];
  matchedMap: Record<
    string,
    { productId: string | null; score: number; matchedName: string | null }
  >;
}

export interface ExecuteImportInput {
  sessionId: string;
  machineId: string;
  reportDay: string;
  productMap: Record<string, string>;
  productCol?: number;
  txnIdCol?: number;
  unmappedNames?: string[];
}

export interface ExecuteImportResult {
  importId: string;
  imported: number;
  skipped: number;
  unmapped: number;
  deltaAdjusted: number;
  totalQty: number;
  totalRevenue: number;
  unmappedNames: string[];
}

const HICON_COLS = {
  productId: 0,
  commodityCode: 1,
  productName: 2,
  payByCash: 3,
  quantity: 4,
  totalAmount: 7,
} as const;

/**
 * Sales import ingestion service — upload → parse → confirm → execute.
 * Implements 3-level dedup (row hash L1 + txn hash L2 + HICON delta L3),
 * batched existence-check + in-batch dedup (v1.2 Patch 15, v1.3 Patch 20).
 */
@Injectable()
export class SalesImportIngestService {
  private readonly logger = new Logger(SalesImportIngestService.name);

  constructor(
    @InjectRepository(SalesImport)
    private readonly importRepo: Repository<SalesImport>,
    @InjectRepository(SalesTxnHash)
    private readonly hashRepo: Repository<SalesTxnHash>,
    @InjectRepository(SalesAggregated)
    private readonly aggRepo: Repository<SalesAggregated>,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly hiconParser: HiconParserService,
    private readonly parseSessionService: ParseSessionService,
    private readonly stockMovementsService: StockMovementsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Step 1: upload + parse → create parse session.
   * Auto-detects format by filename/headers if not provided.
   */
  async uploadAndParse(
    organizationId: string,
    userId: string,
    input: UploadAndParseInput,
  ): Promise<UploadAndParseResult> {
    const format =
      input.format ?? this.detectFormat(input.fileName, input.fileContent);

    const parsed = this.hiconParser.parse(input.fileContent);
    if (parsed.rows.length === 0) {
      throw new BadRequestException(
        "File contains no data rows (after filtering service rows)",
      );
    }

    const rowsForSession = parsed.rows.map((r) => [...r.rawRow]);
    const { sessionId, expiresAt } = await this.parseSessionService.create({
      organizationId,
      userId,
      format,
      fileName: input.fileName,
      rows: rowsForSession,
      headers: [...parsed.headers],
    });

    return {
      sessionId,
      expiresAt,
      format,
      headers: [...parsed.headers],
      sample: rowsForSession.slice(0, 5),
      totalRows: rowsForSession.length,
      skippedServiceRows: parsed.skippedServiceRows,
      guessedMapping: {
        productCol: HICON_COLS.productName,
        quantityCol: HICON_COLS.quantity,
        totalAmountCol: HICON_COLS.totalAmount,
        txnIdCol: -1, // HICON has no txn ID
      },
    };
  }

  /**
   * Step 2: confirm mapping → fuzzy-match each unique CSV product name
   * against the org's product catalog. Returns suggestions for the UI.
   */
  async confirmMapping(
    organizationId: string,
    input: ConfirmMappingInput,
  ): Promise<ConfirmMappingResult> {
    const session = await this.parseSessionService.get(
      input.sessionId,
      organizationId,
    );
    const productCol = input.productCol ?? HICON_COLS.productName;

    const uniqueNames = Array.from(
      new Set(
        session.rows
          .map((row) => row[productCol]?.trim() ?? "")
          .filter((name) => name.length > 0),
      ),
    );

    const products = await this.productRepo.find({
      where: { organizationId },
      select: ["id", "name", "nameUz"],
    });

    const candidates: MatchCandidate[] = products.flatMap((p) => {
      const out: MatchCandidate[] = [{ productId: p.id, name: p.name }];
      if (p.nameUz) out.push({ productId: p.id, name: p.nameUz });
      return out;
    });

    const productNameById = new Map(products.map((p) => [p.id, p.name]));
    const matchedMap: ConfirmMappingResult["matchedMap"] = {};

    for (const name of uniqueNames) {
      const match = matchProductName(name, candidates);
      matchedMap[name] = match
        ? {
            productId: match.productId,
            score: Number(match.score.toFixed(3)),
            matchedName: productNameById.get(match.productId) ?? null,
          }
        : { productId: null, score: 0, matchedName: null };
    }

    return { uniqueNames, matchedMap };
  }

  /**
   * Step 3: execute → apply 3-level dedup, record stock movements,
   * persist hash index + aggregate snapshots, return summary.
   */
  async execute(
    organizationId: string,
    userId: string,
    input: ExecuteImportInput,
  ): Promise<ExecuteImportResult> {
    const session = await this.parseSessionService.get(
      input.sessionId,
      organizationId,
    );

    const machine = await this.machineRepo.findOne({
      where: { id: input.machineId, organizationId },
    });
    if (!machine) throw new NotFoundException("Machine not found");
    if (!machine.locationId) {
      throw new BadRequestException(
        "Machine has no locationId — cannot record stock movement",
      );
    }
    const machineLocationId = machine.locationId;

    const productCol = input.productCol ?? HICON_COLS.productName;
    const txnIdCol = input.txnIdCol ?? -1;
    const quantityCol = HICON_COLS.quantity;
    const totalAmountCol = HICON_COLS.totalAmount;
    const unitPriceCol = HICON_COLS.payByCash;

    const format =
      (session.format as SalesImportFormat) ?? SalesImportFormat.HICON;

    // Precompute all candidate hashes for this batch — L1 (row) + L2 (txn).
    const rowHashes: string[] = [];
    const txnHashes: string[] = [];
    for (const row of session.rows) {
      rowHashes.push(hashRow(input.reportDay, input.machineId, row));
      if (txnIdCol >= 0) {
        const txnRaw = (row[txnIdCol] ?? "").trim();
        const productName = (row[productCol] ?? "").trim();
        const productId = input.productMap[productName];
        if (productId && this.isPlausibleTxnId(txnRaw)) {
          txnHashes.push(hashTxn(txnRaw, productId));
        }
      }
    }
    const candidateHashes = Array.from(new Set([...rowHashes, ...txnHashes]));

    // Batched existence check — ONE query for the whole upload (v1.2 Patch 15).
    const existingSet = new Set<string>();
    if (candidateHashes.length > 0) {
      const existing = await this.hashRepo.find({
        where: {
          organizationId,
          hashKey: In(candidateHashes),
        },
        select: ["hashKey"],
      });
      for (const e of existing) existingSet.add(e.hashKey);
    }

    // For HICON L3 delta: load prior aggregates for this (org, day, machine).
    const prevAggs =
      format === SalesImportFormat.HICON
        ? await this.aggRepo.find({
            where: {
              organizationId,
              reportDay: input.reportDay,
              machineId: input.machineId,
            },
          })
        : [];
    const aggMap = new Map(prevAggs.map((a) => [a.productId, a]));

    // In-batch dedup set (v1.3 Patch 20).
    const batchHashes = new Set<string>();
    const movements: RecordMovementInput[] = [];
    const newHashEntries: Array<{ hashKey: string }> = [];
    const aggNewState = new Map<
      string,
      { productId: string; qty: number; totalAmount: number }
    >();
    const unmappedNamesSet = new Set<string>(input.unmappedNames ?? []);
    const deltaLog: string[] = [];

    let imported = 0;
    let skipped = 0;
    let unmapped = 0;
    let deltaAdjusted = 0;
    let totalQty = 0;
    let totalRevenue = 0;

    for (let i = 0; i < session.rows.length; i++) {
      const row = session.rows[i]!;
      const productName = (row[productCol] ?? "").trim();
      const productId = input.productMap[productName];

      if (!productName) {
        skipped++;
        continue;
      }

      if (!productId) {
        unmapped++;
        unmappedNamesSet.add(productName);
        continue;
      }

      // L1: row hash dedup (existing + in-batch)
      const rowHashKey = hashRow(input.reportDay, input.machineId, row);
      if (existingSet.has(rowHashKey) || batchHashes.has(rowHashKey)) {
        skipped++;
        continue;
      }
      batchHashes.add(rowHashKey);

      // L2: txn ID dedup (when mapped + plausible ID)
      if (txnIdCol >= 0) {
        const txnRaw = (row[txnIdCol] ?? "").trim();
        if (this.isPlausibleTxnId(txnRaw)) {
          const txnKey = hashTxn(txnRaw, productId);
          if (existingSet.has(txnKey) || batchHashes.has(txnKey)) {
            skipped++;
            continue;
          }
          batchHashes.add(txnKey);
          newHashEntries.push({ hashKey: txnKey });
        }
      }

      // Parse row numerics
      const rowQtyParsed = parseFloat(row[quantityCol] ?? "1");
      const rowQty = Math.max(
        1,
        Math.round(Number.isFinite(rowQtyParsed) ? rowQtyParsed : 1),
      );
      const rowTotalParsed = parseFloat(row[totalAmountCol] ?? "0");
      const rowTotal = Number.isFinite(rowTotalParsed) ? rowTotalParsed : 0;
      const rowUnitParsed = parseFloat(row[unitPriceCol] ?? "0");
      const rowUnit =
        Number.isFinite(rowUnitParsed) && rowUnitParsed > 0
          ? rowUnitParsed
          : rowQty > 0
            ? rowTotal / rowQty
            : 0;

      // L3: HICON delta — HICON reports cumulative counters per day.
      // If a prior aggregate exists for the same (day, machine, product),
      // only record the increase since last snapshot.
      let effectiveQty = rowQty;
      let effectiveRevenue = rowTotal;
      if (format === SalesImportFormat.HICON) {
        const prev = aggMap.get(productId);
        if (prev) {
          const qtyDelta = rowQty - Number(prev.qty);
          if (qtyDelta <= 0) {
            skipped++;
            deltaLog.push(
              `${productName}: qty ${rowQty} <= prev ${Number(prev.qty)}, skipped`,
            );
            continue;
          }
          effectiveQty = qtyDelta;
          const amountDelta = rowTotal - Number(prev.totalAmount);
          effectiveRevenue = amountDelta > 0 ? amountDelta : 0;
          deltaAdjusted++;
          deltaLog.push(
            `${productName}: qty ${rowQty} → +${qtyDelta} (prev ${Number(prev.qty)})`,
          );
        }
      }

      // Aggregate new state — always store the *cumulative* qty/amount
      // from the upload (HICON semantics), so next upload computes delta correctly.
      const priorAgg = aggNewState.get(productId);
      aggNewState.set(productId, {
        productId,
        qty: Math.max(priorAgg?.qty ?? 0, rowQty),
        totalAmount: Math.max(priorAgg?.totalAmount ?? 0, rowTotal),
      });

      movements.push({
        organizationId,
        productId,
        fromLocationId: machineLocationId,
        toLocationId: null,
        quantity: effectiveQty,
        movementType: MovementType.SALE,
        unitPrice: rowUnit,
        referenceType: MovementReferenceType.SALES_IMPORT,
        referenceId: null,
        note: `${format.toUpperCase()} import ${session.fileName}`,
        byUserId: userId,
        at: new Date(`${input.reportDay}T12:00:00+05:00`),
      });

      newHashEntries.push({ hashKey: rowHashKey });
      imported++;
      totalQty += effectiveQty;
      totalRevenue += effectiveRevenue;
    }

    // Persist in one transaction (SalesImport → hashes → aggregates → movements).
    const result = await this.dataSource.transaction(async (manager) => {
      const importRecord = manager.create(SalesImport, {
        organizationId,
        uploadedByUserId: userId,
        filename: session.fileName,
        fileType: ImportFileType.CSV,
        fileId: null,
        status:
          imported > 0
            ? ImportStatus.COMPLETED
            : unmapped > 0
              ? ImportStatus.PARTIAL
              : ImportStatus.COMPLETED,
        totalRows: session.rows.length,
        successRows: imported,
        failedRows: 0,
        errors: [],
        summary: {
          totalAmount: totalRevenue,
          transactionsCreated: imported,
          machinesProcessed: imported > 0 ? 1 : 0,
        },
        startedAt: new Date(),
        completedAt: new Date(),
        message: `Imported ${imported}, skipped ${skipped}, unmapped ${unmapped}, delta-adjusted ${deltaAdjusted}`,
        metadata: {},
        format,
        reportDay: input.reportDay,
        machineId: input.machineId,
        imported,
        skipped,
        unmapped,
        deltaAdjusted,
        totalQty,
        totalRevenue,
        deltaLog,
        unmappedNames: Array.from(unmappedNamesSet),
        createdById: userId,
      });
      const savedImport = await manager.save(importRecord);

      // Patch references now that we know the import ID.
      for (const m of movements) m.referenceId = savedImport.id;

      if (newHashEntries.length > 0) {
        const hashEntities = newHashEntries.map((h) =>
          manager.create(SalesTxnHash, {
            organizationId,
            hashKey: h.hashKey,
            salesImportId: savedImport.id,
            createdById: userId,
          }),
        );
        // Dedup within batch (in case rowHash == txnHash collision, rare but safe).
        const seen = new Set<string>();
        const dedupedHashes = hashEntities.filter((h) => {
          if (seen.has(h.hashKey)) return false;
          seen.add(h.hashKey);
          return true;
        });
        await manager.save(SalesTxnHash, dedupedHashes);
      }

      for (const agg of aggNewState.values()) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(SalesAggregated)
          .values({
            organizationId,
            reportDay: input.reportDay,
            machineId: input.machineId,
            productId: agg.productId,
            qty: agg.qty,
            totalAmount: agg.totalAmount,
            lastImportId: savedImport.id,
            lastUpdate: new Date(),
          })
          .orUpdate(
            ["qty", "total_amount", "last_import_id", "last_update"],
            ["organization_id", "report_day", "machine_id", "product_id"],
          )
          .execute();
      }

      return savedImport;
    });

    if (movements.length > 0) {
      await this.stockMovementsService.recordBatch(movements);
    }

    // Destroy session now that it's consumed.
    await this.parseSessionService
      .delete(input.sessionId, organizationId)
      .catch(() => undefined);

    this.logger.log(
      `Sales import executed: id=${result.id}, imported=${imported}, skipped=${skipped}, unmapped=${unmapped}, delta=${deltaAdjusted}`,
    );

    return {
      importId: result.id,
      imported,
      skipped,
      unmapped,
      deltaAdjusted,
      totalQty,
      totalRevenue,
      unmappedNames: Array.from(unmappedNamesSet),
    };
  }

  private detectFormat(
    fileName: string,
    fileContent: string,
  ): SalesImportFormat {
    const lower = fileName.toLowerCase();
    if (
      lower.includes("hicon") ||
      lower.startsWith("product_name") ||
      /Proportion/.test(fileContent.slice(0, 200))
    ) {
      return SalesImportFormat.HICON;
    }
    if (lower.includes("multikassa")) return SalesImportFormat.MULTIKASSA;
    if (lower.includes("click")) return SalesImportFormat.CLICK;
    if (lower.includes("payme")) return SalesImportFormat.PAYME;
    if (lower.includes("uzum")) return SalesImportFormat.UZUM;
    return SalesImportFormat.CUSTOM;
  }

  /** Heuristic: require >6 chars OR at least one non-digit to treat as txn ID. */
  private isPlausibleTxnId(raw: string): boolean {
    if (!raw) return false;
    return raw.length > 6 || /[a-zA-Z\-_]/.test(raw);
  }
}
