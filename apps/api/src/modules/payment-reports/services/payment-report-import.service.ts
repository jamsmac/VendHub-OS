/**
 * Payment Report Import Service
 * Orchestrates conversion of parsed PaymentReportRows → HwImportedSale → Transaction
 *
 * Pipeline:
 *   1. Load non-imported, non-duplicate rows from upload
 *   2. Convert to HwImportedSale via ReconciliationService.importHwSales()
 *   3. Batch-resolve machineCode → machineId (single SQL query)
 *   4. Create Transaction for each resolved HwImportedSale
 *   5. Update import stats on upload + rows
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { PaymentReportRow } from "../entities/payment-report-row.entity";
import {
  PaymentReportUpload,
  ReportType,
  UploadStatus,
} from "../entities/payment-report-upload.entity";
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from "../../transactions/entities/transaction.entity";
import { Machine } from "../../machines/entities/machine.entity";
import {
  HwImportedSale,
  HwImportSource,
} from "../../reconciliation/entities/reconciliation.entity";
import { ReconciliationService } from "../../reconciliation/reconciliation.service";

// ─────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────

export interface ImportResult {
  uploadId: string;
  batchId: string | null;
  totalRows: number;
  imported: number;
  skipped: number;
  machineNotFound: number;
  duplicateTransactions: number;
  errors: ImportError[];
}

export interface ImportError {
  rowId: string;
  rowIndex: number;
  machineCode: string | null;
  reason:
    | "machine_not_found"
    | "duplicate_transaction"
    | "invalid_data"
    | "db_error";
  details?: string;
}

export interface ImportStatus {
  uploadId: string;
  totalRows: number;
  importedRows: number;
  pendingRows: number;
  errorRows: number;
  importedAt: Date | null;
  importedBy: string | null;
}

// ─────────────────────────────────────────────
// Payment method mapping
// ─────────────────────────────────────────────

const PAYMENT_METHOD_MAP: Record<string, PaymentMethod> = {
  // Кириллица (Payme, Kassa reports)
  узкард: PaymentMethod.UZCARD,
  хумо: PaymentMethod.HUMO,
  наличные: PaymentMethod.CASH,
  карта: PaymentMethod.CARD,
  перевод: PaymentMethod.CARD,
  // Латиница
  uzcard: PaymentMethod.UZCARD,
  humo: PaymentMethod.HUMO,
  cash: PaymentMethod.CASH,
  card: PaymentMethod.CARD,
  click: PaymentMethod.CLICK,
  payme: PaymentMethod.PAYME,
  qr: PaymentMethod.QR,
  nfc: PaymentMethod.NFC,
  visa: PaymentMethod.VISA,
  mastercard: PaymentMethod.MASTERCARD,
  uzum: PaymentMethod.UZUM,
  telegram: PaymentMethod.TELEGRAM,
};

/** Default payment method per report type (when row has no paymentMethod) */
const REPORT_TYPE_DEFAULT_METHOD: Record<ReportType, PaymentMethod> = {
  [ReportType.PAYME]: PaymentMethod.PAYME,
  [ReportType.CLICK]: PaymentMethod.CLICK,
  [ReportType.KASSA_FISCAL]: PaymentMethod.CASH,
  [ReportType.VENDHUB_ORDERS]: PaymentMethod.CARD,
  [ReportType.VENDHUB_CSV]: PaymentMethod.CARD,
  [ReportType.UNKNOWN]: PaymentMethod.CARD,
};

const BATCH_SIZE = 500;

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

@Injectable()
export class PaymentReportImportService {
  private readonly logger = new Logger(PaymentReportImportService.name);

  constructor(
    @InjectRepository(PaymentReportRow)
    private readonly rowRepo: Repository<PaymentReportRow>,
    @InjectRepository(PaymentReportUpload)
    private readonly uploadRepo: Repository<PaymentReportUpload>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
    @InjectRepository(HwImportedSale)
    private readonly hwSaleRepo: Repository<HwImportedSale>,
    private readonly reconciliationService: ReconciliationService,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  // ════════════════════════════════════════════
  // PUBLIC: Import all rows from an upload
  // ════════════════════════════════════════════

  async importUpload(
    organizationId: string,
    uploadId: string,
    importedBy: string,
  ): Promise<ImportResult> {
    // Step 1: Validate upload and load rows
    const upload = await this.uploadRepo.findOne({
      where: { id: uploadId, organizationId },
    });

    if (!upload) {
      throw new NotFoundException("Upload not found");
    }

    if (upload.status !== UploadStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot import upload with status ${upload.status}. Only COMPLETED uploads can be imported.`,
      );
    }

    const rows = await this.rowRepo.find({
      where: {
        uploadId,
        isDuplicate: false,
        isImported: false,
      },
      order: { rowIndex: "ASC" },
    });

    if (rows.length === 0) {
      return {
        uploadId,
        batchId: null,
        totalRows: 0,
        imported: 0,
        skipped: 0,
        machineNotFound: 0,
        duplicateTransactions: 0,
        errors: [],
      };
    }

    this.logger.log(
      `Starting import for upload ${uploadId}: ${rows.length} rows`,
    );

    // Step 2: Import rows as HwImportedSale via ReconciliationService
    const hwSalesDto = this.convertRowsToHwSalesInput(rows, upload);
    const { batchId } = await this.reconciliationService.importHwSales(
      organizationId,
      importedBy,
      hwSalesDto,
    );

    // Step 3: Batch resolve machineCode → machineId
    const machineMap = await this.buildMachineMap(organizationId);

    // Load the created HwImportedSale records
    const hwSales = await this.hwSaleRepo.find({
      where: { importBatchId: batchId },
      order: { importRowNumber: "ASC" },
    });

    // Update machineId on HwImportedSale records
    for (const hwSale of hwSales) {
      const machineId = this.resolveMachineId(hwSale.machineCode, machineMap);
      if (machineId) {
        hwSale.machineId = machineId;
      }
    }
    await this.hwSaleRepo.save(hwSales);

    // Step 4: Create Transactions in batches
    const result: ImportResult = {
      uploadId,
      batchId,
      totalRows: rows.length,
      imported: 0,
      skipped: 0,
      machineNotFound: 0,
      duplicateTransactions: 0,
      errors: [],
    };

    // Build a map from (orderNumber/externalId) → PaymentReportRow for back-linking
    const rowByOrderKey = new Map<string, PaymentReportRow>();
    for (const row of rows) {
      const key = row.orderNumber || row.externalId || `row-${row.id}`;
      rowByOrderKey.set(key, row);
    }

    for (let i = 0; i < hwSales.length; i += BATCH_SIZE) {
      const batch = hwSales.slice(i, i + BATCH_SIZE);

      await this.dataSource.transaction(async (manager) => {
        const txnRepo = manager.getRepository(Transaction);
        const hwRepo = manager.getRepository(HwImportedSale);
        const rowRepoTx = manager.getRepository(PaymentReportRow);

        for (const hwSale of batch) {
          const matchingRow =
            rowByOrderKey.get(
              hwSale.orderNumber ||
                `row-${rows[hwSale.importRowNumber! - 1]?.id}`,
            ) || rows[hwSale.importRowNumber! - 1];

          // Check: machine resolved?
          if (!hwSale.machineId) {
            result.machineNotFound++;
            result.errors.push({
              rowId: matchingRow?.id || "",
              rowIndex: hwSale.importRowNumber || 0,
              machineCode: hwSale.machineCode,
              reason: "machine_not_found",
              details: `Machine code '${hwSale.machineCode}' not found in organization`,
            });
            if (matchingRow) {
              matchingRow.importError = `machine_not_found: ${hwSale.machineCode}`;
              await rowRepoTx.save(matchingRow);
            }
            continue;
          }

          // Check: duplicate transaction?
          const paymentId = hwSale.orderNumber || hwSale.id;
          const existingTxn = await txnRepo.findOne({
            where: {
              organizationId,
              paymentId,
            },
            select: ["id"],
          });

          if (existingTxn) {
            result.duplicateTransactions++;
            result.skipped++;
            if (matchingRow) {
              matchingRow.isImported = true;
              matchingRow.importedTransactionId = existingTxn.id;
              await rowRepoTx.save(matchingRow);
            }
            hwSale.transactionId = existingTxn.id;
            await hwRepo.save(hwSale);
            continue;
          }

          // Create Transaction
          const paymentMethod = this.mapPaymentMethod(
            hwSale.paymentMethod,
            upload.reportType,
          );

          const transaction = txnRepo.create({
            organizationId,
            machineId: hwSale.machineId,
            type: TransactionType.SALE,
            status: TransactionStatus.COMPLETED,
            paymentMethod,
            amount: Number(hwSale.amount),
            totalAmount: Number(hwSale.amount),
            currency: hwSale.currency || "UZS",
            transactionDate: hwSale.saleDate,
            saleDate: hwSale.saleDate,
            paymentId,
            metadata: {
              sourceUploadId: uploadId,
              sourceRowId: matchingRow?.id,
              sourceBatchId: batchId,
              sourceReportType: upload.reportType,
              importedAt: new Date().toISOString(),
            },
          });

          const savedTxn = await txnRepo.save(transaction);

          // Link HwImportedSale → Transaction
          hwSale.transactionId = savedTxn.id;
          await hwRepo.save(hwSale);

          // Mark PaymentReportRow as imported
          if (matchingRow) {
            matchingRow.isImported = true;
            matchingRow.importedTransactionId = savedTxn.id;
            matchingRow.importError = null;
            await rowRepoTx.save(matchingRow);
          }

          result.imported++;
        }
      });
    }

    // Step 5: Update upload stats
    upload.importedRows = result.imported + result.skipped;
    upload.importErrors = result.machineNotFound + result.errors.length;
    upload.importedAt = new Date();
    upload.importedBy = importedBy;
    await this.uploadRepo.save(upload);

    this.logger.log(
      `Import completed for upload ${uploadId}: ` +
        `${result.imported} imported, ${result.skipped} skipped, ` +
        `${result.machineNotFound} machine not found, ` +
        `${result.duplicateTransactions} duplicate transactions`,
    );

    this.eventEmitter.emit("payment-report.imported", {
      ...result,
      organizationId,
    });

    return result;
  }

  // ════════════════════════════════════════════
  // PUBLIC: Import a single row
  // ════════════════════════════════════════════

  async importSingleRow(
    organizationId: string,
    rowId: string,
  ): Promise<Transaction | null> {
    const row = await this.rowRepo.findOne({
      where: { id: rowId, organizationId },
    });

    if (!row) {
      throw new NotFoundException("Payment report row not found");
    }

    if (row.isImported) {
      throw new BadRequestException("Row is already imported");
    }

    if (row.isDuplicate) {
      throw new BadRequestException("Cannot import a duplicate row");
    }

    const upload = await this.uploadRepo.findOne({
      where: { id: row.uploadId },
    });

    if (!upload) {
      throw new NotFoundException("Upload not found");
    }

    // Resolve machine
    const machineMap = await this.buildMachineMap(organizationId);
    const machineId = this.resolveMachineId(row.machineCode, machineMap);

    if (!machineId) {
      row.importError = `machine_not_found: ${row.machineCode}`;
      await this.rowRepo.save(row);
      throw new BadRequestException(
        `Machine with code '${row.machineCode}' not found`,
      );
    }

    // Check duplicate
    const paymentId = row.orderNumber || row.externalId || row.id;
    const existingTxn = await this.transactionRepo.findOne({
      where: { organizationId, paymentId },
      select: ["id"],
    });

    if (existingTxn) {
      row.isImported = true;
      row.importedTransactionId = existingTxn.id;
      await this.rowRepo.save(row);
      return existingTxn;
    }

    // Create transaction
    const paymentMethod = this.mapPaymentMethod(
      row.paymentMethod,
      upload.reportType,
    );

    const transaction = this.transactionRepo.create({
      organizationId,
      machineId,
      type: TransactionType.SALE,
      status: TransactionStatus.COMPLETED,
      paymentMethod,
      amount: Number(row.amount),
      totalAmount: Number(row.amount),
      currency: "UZS",
      transactionDate: row.paymentTime,
      saleDate: row.paymentTime,
      paymentId,
      metadata: {
        sourceUploadId: row.uploadId,
        sourceRowId: row.id,
        sourceReportType: upload.reportType,
        importedAt: new Date().toISOString(),
      },
    });

    const savedTxn = await this.transactionRepo.save(transaction);

    // Mark row imported
    row.isImported = true;
    row.importedTransactionId = savedTxn.id;
    row.importError = null;
    await this.rowRepo.save(row);

    // Update upload stats
    upload.importedRows = (upload.importedRows || 0) + 1;
    await this.uploadRepo.save(upload);

    return savedTxn;
  }

  // ════════════════════════════════════════════
  // PUBLIC: Get import status for an upload
  // ════════════════════════════════════════════

  async getImportStatus(
    organizationId: string,
    uploadId: string,
  ): Promise<ImportStatus> {
    const upload = await this.uploadRepo.findOne({
      where: { id: uploadId, organizationId },
    });

    if (!upload) {
      throw new NotFoundException("Upload not found");
    }

    // Count rows by import status
    const [importedRows, errorRows, totalNonDuplicate] = await Promise.all([
      this.rowRepo.count({
        where: { uploadId, isImported: true },
      }),
      this.rowRepo
        .createQueryBuilder("r")
        .where("r.uploadId = :uploadId", { uploadId })
        .andWhere("r.import_error IS NOT NULL")
        .andWhere("r.is_imported = false")
        .getCount(),
      this.rowRepo.count({
        where: { uploadId, isDuplicate: false },
      }),
    ]);

    return {
      uploadId,
      totalRows: totalNonDuplicate,
      importedRows,
      pendingRows: totalNonDuplicate - importedRows - errorRows,
      errorRows,
      importedAt: upload.importedAt,
      importedBy: upload.importedBy,
    };
  }

  // ════════════════════════════════════════════
  // PRIVATE: Helpers
  // ════════════════════════════════════════════

  /** Convert PaymentReportRows to ImportHwSalesDto format */
  private convertRowsToHwSalesInput(
    rows: PaymentReportRow[],
    upload: PaymentReportUpload,
  ) {
    const importSource = upload.mimeType?.includes("csv")
      ? HwImportSource.CSV
      : HwImportSource.EXCEL;

    return {
      sales: rows.map((row) => ({
        saleDate: (row.paymentTime || new Date()).toISOString(),
        machineCode: row.machineCode || "UNKNOWN",
        amount: Number(row.amount) || 0,
        paymentMethod: row.paymentMethod || undefined,
        orderNumber: row.orderNumber || row.externalId || undefined,
        productName: row.goodsName || undefined,
        quantity: 1,
      })),
      importSource,
      importFilename: upload.fileName,
    };
  }

  /**
   * Build machine lookup maps: machineNumber→id AND serialNumber→id.
   * Single SQL query — avoids N+1.
   */
  private async buildMachineMap(
    organizationId: string,
  ): Promise<{ byNumber: Map<string, string>; bySerial: Map<string, string> }> {
    const machines = await this.machineRepo.find({
      where: { organizationId },
      select: ["id", "machineNumber", "serialNumber"],
    });

    const byNumber = new Map<string, string>();
    const bySerial = new Map<string, string>();

    for (const m of machines) {
      if (m.machineNumber) {
        byNumber.set(m.machineNumber, m.id);
        byNumber.set(m.machineNumber.toLowerCase(), m.id);
      }
      if (m.serialNumber) {
        bySerial.set(m.serialNumber, m.id);
        bySerial.set(m.serialNumber.toLowerCase(), m.id);
      }
    }

    return { byNumber, bySerial };
  }

  /** Resolve a machine code to a machine ID using prebuilt maps */
  private resolveMachineId(
    machineCode: string | null,
    maps: { byNumber: Map<string, string>; bySerial: Map<string, string> },
  ): string | null {
    if (!machineCode) return null;

    const code = machineCode.trim();
    return (
      maps.byNumber.get(code) ||
      maps.byNumber.get(code.toLowerCase()) ||
      maps.bySerial.get(code) ||
      maps.bySerial.get(code.toLowerCase()) ||
      null
    );
  }

  /** Map raw payment method string to PaymentMethod enum */
  private mapPaymentMethod(
    rawMethod: string | null | undefined,
    reportType: ReportType,
  ): PaymentMethod {
    if (!rawMethod) {
      return REPORT_TYPE_DEFAULT_METHOD[reportType] || PaymentMethod.CARD;
    }

    const normalized = rawMethod.trim().toLowerCase();
    return (
      PAYMENT_METHOD_MAP[normalized] ||
      REPORT_TYPE_DEFAULT_METHOD[reportType] ||
      PaymentMethod.CARD
    );
  }
}
