import { Injectable } from "@nestjs/common";
import {
  ParsedRow,
  ValidationResult,
  ValidationError,
} from "../interfaces/parser.interface";

@Injectable()
export class DataValidationService {
  // ==========================================
  // UZ-specific format validators
  // ==========================================

  /** Phone: +998XXXXXXXXX (12 digits total) */
  isValidPhone(value: string): boolean {
    return /^\+998\d{9}$/.test(value.replace(/[\s\-()]/g, ""));
  }

  /** INN: 9 digits (company) or 14 digits (individual) */
  isValidInn(value: string): boolean {
    const digits = value.replace(/\D/g, "");
    return digits.length === 9 || digits.length === 14;
  }

  /** Passport: AA1234567 (2 letters + 7 digits) */
  isValidPassport(value: string): boolean {
    return /^[A-Z]{2}\d{7}$/.test(value.replace(/\s/g, "").toUpperCase());
  }

  /** Bank account: 20 digits */
  isValidBankAccount(value: string): boolean {
    const digits = value.replace(/\D/g, "");
    return digits.length === 20;
  }

  /** MFO (bank code): 5 digits */
  isValidMfo(value: string): boolean {
    return /^\d{5}$/.test(value.replace(/\D/g, ""));
  }

  /** Amount: positive number, max 1B UZS */
  isValidAmount(value: unknown): boolean {
    const num = typeof value === "number" ? value : parseFloat(String(value));
    return !isNaN(num) && num > 0 && num <= 1_000_000_000;
  }

  /** Email: basic format check */
  isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  // ==========================================
  // Row-level validation for domain-specific imports
  // ==========================================

  validateSalesRows(rows: ParsedRow[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let validRows = 0;

    rows.forEach((row, idx) => {
      const rowNum = idx + 1;
      let rowValid = true;

      // Must have either amount or quantity
      if (!row.amount && !row.quantity) {
        errors.push({
          row: rowNum,
          column: "amount/quantity",
          value: null,
          message: "Either amount or quantity is required",
        });
        rowValid = false;
      }

      // Validate amount if present
      if (row.amount && !this.isValidAmount(row.amount)) {
        errors.push({
          row: rowNum,
          column: "amount",
          value: row.amount,
          message: "Invalid amount (must be > 0 and <= 1,000,000,000 UZS)",
        });
        rowValid = false;
      }

      // Date should be parseable
      if (row.date) {
        const parsed = this.parseDate(String(row.date));
        if (!parsed) {
          warnings.push({
            row: rowNum,
            column: "date",
            value: row.date,
            message:
              "Unrecognized date format (expected DD.MM.YYYY, YYYY-MM-DD, or DD/MM/YYYY)",
          });
        }
      }

      if (rowValid) validRows++;
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      validRows,
      totalRows: rows.length,
    };
  }

  validateCounterpartyRows(rows: ParsedRow[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let validRows = 0;

    rows.forEach((row, idx) => {
      const rowNum = idx + 1;
      let rowValid = true;

      // Name is required
      if (!row.name) {
        errors.push({
          row: rowNum,
          column: "name",
          value: null,
          message: "Company/person name is required",
        });
        rowValid = false;
      }

      // INN validation
      if (row.inn && !this.isValidInn(String(row.inn))) {
        errors.push({
          row: rowNum,
          column: "inn",
          value: row.inn,
          message: "Invalid INN (must be 9 or 14 digits)",
        });
        rowValid = false;
      }

      // Phone validation
      if (row.phone && !this.isValidPhone(String(row.phone))) {
        warnings.push({
          row: rowNum,
          column: "phone",
          value: row.phone,
          message: "Invalid phone format (expected +998XXXXXXXXX)",
        });
      }

      // Bank account
      if (
        row.bankAccount &&
        !this.isValidBankAccount(String(row.bankAccount))
      ) {
        warnings.push({
          row: rowNum,
          column: "bankAccount",
          value: row.bankAccount,
          message: "Invalid bank account (expected 20 digits)",
        });
      }

      // MFO
      if (row.mfo && !this.isValidMfo(String(row.mfo))) {
        warnings.push({
          row: rowNum,
          column: "mfo",
          value: row.mfo,
          message: "Invalid MFO code (expected 5 digits)",
        });
      }

      if (rowValid) validRows++;
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      validRows,
      totalRows: rows.length,
    };
  }

  validateInventoryRows(rows: ParsedRow[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let validRows = 0;

    rows.forEach((row, idx) => {
      const rowNum = idx + 1;
      let rowValid = true;

      // Product name or SKU is required
      if (!row.name && !row.sku && !row.productName) {
        errors.push({
          row: rowNum,
          column: "name/sku",
          value: null,
          message: "Product name or SKU is required",
        });
        rowValid = false;
      }

      // Quantity must be valid
      if (row.quantity !== undefined && row.quantity !== null) {
        const qty =
          typeof row.quantity === "number"
            ? row.quantity
            : parseFloat(String(row.quantity));
        if (isNaN(qty) || qty < 0) {
          errors.push({
            row: rowNum,
            column: "quantity",
            value: row.quantity,
            message: "Quantity must be a non-negative number",
          });
          rowValid = false;
        }
      }

      // Price validation
      if (row.price && !this.isValidAmount(row.price)) {
        warnings.push({
          row: rowNum,
          column: "price",
          value: row.price,
          message: "Invalid price value",
        });
      }

      if (rowValid) validRows++;
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      validRows,
      totalRows: rows.length,
    };
  }

  // ==========================================
  // Date parsing (supports common RU/UZ formats)
  // ==========================================

  parseDate(value: string): Date | null {
    if (!value) return null;
    const trimmed = value.trim();

    // DD.MM.YYYY (Russian/UZ standard)
    const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dotMatch) {
      const date = new Date(+dotMatch[3]!, +dotMatch[2]! - 1, +dotMatch[1]!);
      return isNaN(date.getTime()) ? null : date;
    }

    // DD/MM/YYYY
    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const date = new Date(
        +slashMatch[3]!,
        +slashMatch[2]! - 1,
        +slashMatch[1]!,
      );
      return isNaN(date.getTime()) ? null : date;
    }

    // YYYY-MM-DD (ISO)
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const date = new Date(+isoMatch[1]!, +isoMatch[2]! - 1, +isoMatch[3]!);
      return isNaN(date.getTime()) ? null : date;
    }

    // Fallback
    const fallback = new Date(trimmed);
    return isNaN(fallback.getTime()) ? null : fallback;
  }
}
