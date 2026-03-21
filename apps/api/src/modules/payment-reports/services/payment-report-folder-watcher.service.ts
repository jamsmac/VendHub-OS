import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import { PaymentReportsService } from "./payment-reports.service";

/**
 * Сервис авто-импорта отчётов из папки.
 *
 * Как использовать:
 *  1. Укажи в .env переменную:
 *       PAYMENT_REPORTS_WATCH_DIR=/path/to/incoming/reports
 *     (опционально — по умолчанию отключено)
 *
 *  2. Кладёшь файлы (.xlsx, .xls, .csv, .zip) в эту папку —
 *     система автоматически их подхватывает, парсит, определяет тип
 *     и сохраняет в базу.
 *
 *  3. После обработки файл перемещается в подпапку:
 *       __processed/  — если успешно
 *       __failed/     — если ошибка
 *
 * Интервал проверки: каждые 30 секунд (PAYMENT_REPORTS_WATCH_INTERVAL_MS).
 */
@Injectable()
export class PaymentReportFolderWatcherService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PaymentReportFolderWatcherService.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private watchDir: string | null = null;
  private isRunning = false;

  private readonly SUPPORTED_EXT = [".xlsx", ".xls", ".csv", ".zip"];

  constructor(
    private readonly config: ConfigService,
    private readonly reportsService: PaymentReportsService,
  ) {}

  onModuleInit() {
    const dir = this.config.get<string>("PAYMENT_REPORTS_WATCH_DIR");
    if (!dir) {
      this.logger.log(
        "PAYMENT_REPORTS_WATCH_DIR не задан — авто-импорт из папки отключён",
      );
      return;
    }

    if (!fs.existsSync(dir)) {
      this.logger.warn(`Watch dir не существует: ${dir} — создаю...`);
      fs.mkdirSync(dir, { recursive: true });
    }

    this.watchDir = dir;
    const intervalMs =
      this.config.get<number>("PAYMENT_REPORTS_WATCH_INTERVAL_MS") ?? 30_000;

    this.logger.log(
      `Авто-импорт отчётов включён: ${dir} (интервал ${intervalMs / 1000}с)`,
    );

    this.intervalHandle = setInterval(() => this.scanAndProcess(), intervalMs);

    // Первый прогон сразу при старте
    setTimeout(() => this.scanAndProcess(), 2000);
  }

  onModuleDestroy() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /** Публичный метод — можно вызвать вручную через API */
  async triggerScan(): Promise<{
    scanned: number;
    processed: number;
    failed: number;
  }> {
    return this.scanAndProcess();
  }

  private async scanAndProcess() {
    if (!this.watchDir || this.isRunning)
      return { scanned: 0, processed: 0, failed: 0 };
    this.isRunning = true;

    let scanned = 0;
    let processed = 0;
    let failed = 0;

    try {
      const files = fs.readdirSync(this.watchDir).filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return this.SUPPORTED_EXT.includes(ext) && !f.startsWith(".");
      });

      scanned = files.length;
      if (files.length === 0) return { scanned: 0, processed: 0, failed: 0 };

      this.logger.log(`Найдено ${files.length} файлов для обработки`);

      // Создаём подпапки
      const processedDir = path.join(this.watchDir, "__processed");
      const failedDir = path.join(this.watchDir, "__failed");
      fs.mkdirSync(processedDir, { recursive: true });
      fs.mkdirSync(failedDir, { recursive: true });

      for (const fileName of files) {
        const filePath = path.join(this.watchDir, fileName);
        try {
          const buffer = fs.readFileSync(filePath);
          const stats = fs.statSync(filePath);
          const ext = path.extname(fileName).toLowerCase();
          const mimeMap: Record<string, string> = {
            ".xlsx":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".xls": "application/vnd.ms-excel",
            ".csv": "text/csv",
            ".zip": "application/zip",
          };

          await this.reportsService.upload({
            buffer,
            fileName,
            mimeType: mimeMap[ext] ?? "application/octet-stream",
            fileSize: stats.size,
            uploadedBy: "folder-watcher",
          });

          // Успешно — перемещаем в __processed с временной меткой
          const destName = `${Date.now()}_${fileName}`;
          fs.renameSync(filePath, path.join(processedDir, destName));
          this.logger.log(`✓ Обработан: ${fileName}`);
          processed++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          // Дубликат — не ошибка, тоже перемещаем в processed
          if (
            msg.includes("уже загружен") ||
            msg.includes("existingUploadId")
          ) {
            const destName = `${Date.now()}_duplicate_${fileName}`;
            fs.renameSync(filePath, path.join(processedDir, destName));
            this.logger.log(`⚠ Дубликат (пропущен): ${fileName}`);
            processed++;
          } else {
            // Настоящая ошибка — перемещаем в __failed
            const destName = `${Date.now()}_${fileName}`;
            fs.renameSync(filePath, path.join(failedDir, destName));
            this.logger.error(`✗ Ошибка при обработке ${fileName}: ${msg}`);
            failed++;
          }
        }
      }
    } catch (err) {
      this.logger.error("Ошибка при сканировании папки", err);
    } finally {
      this.isRunning = false;
    }

    return { scanned, processed, failed };
  }
}
