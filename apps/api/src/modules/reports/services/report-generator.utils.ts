/**
 * Shared utility methods for VendHub Report Generators
 * Extracted from vendhub-report-generator.service.ts
 */

export class ReportGeneratorUtils {
  static generateReportId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `VHR-${timestamp}-${random}`.toUpperCase();
  }

  static getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  static getDateKey(date: Date): string {
    return date.toISOString().split("T")[0]!;
  }

  static getMonthName(date: Date): string {
    const months = [
      "Январь",
      "Февраль",
      "Март",
      "Апрель",
      "Май",
      "Июнь",
      "Июль",
      "Август",
      "Сентябрь",
      "Октябрь",
      "Ноябрь",
      "Декабрь",
    ];
    return `${months[date.getMonth()] ?? ""} ${date.getFullYear()}`;
  }

  static getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }
}
