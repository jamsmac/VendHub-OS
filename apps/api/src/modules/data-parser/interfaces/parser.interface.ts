export enum FileFormat {
  CSV = "csv",
  EXCEL = "excel",
  JSON = "json",
  UNKNOWN = "unknown",
}

export interface ParsedRow {
  [key: string]: string | number | boolean | null;
}

export interface ParsedData {
  format: FileFormat;
  headers: string[];
  rows: ParsedRow[];
  totalRows: number;
  errors: string[];
  metadata?: Record<string, unknown>;
}

export interface ValidationError {
  row: number;
  column: string;
  value: unknown;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  validRows: number;
  totalRows: number;
}

export interface ParserOptions {
  delimiter?: string;
  encoding?: BufferEncoding;
  sheetIndex?: number;
  headerRow?: number;
  maxRows?: number;
  skipEmptyRows?: boolean;
  trimValues?: boolean;
}

export interface FormatDetectionResult {
  format: FileFormat;
  confidence: number;
  mimeType?: string;
  encoding?: string;
}
