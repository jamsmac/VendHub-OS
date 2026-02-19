export interface ImportSession {
  id: string;
  session_number?: string;
  domain: ImportDomain;
  status: ImportStatus;
  file_name: string;
  file_size?: number;
  total_rows: number;
  processed_rows: number;
  errors_count: number;
  warnings_count: number;
  inserts_count?: number;
  updates_count?: number;
  classification_confidence?: number;
  detected_domain?: ImportDomain;
  column_mappings?: ColumnMapping[];
  validation_errors?: ValidationError[];
  validation_warnings?: ValidationWarning[];
  reject_reason?: string;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
}

export interface ColumnMapping {
  source_column: string;
  target_column: string;
  auto_detected: boolean;
  confidence?: number;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface ValidationWarning {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  table_name: string;
  row_id?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  created_at: string;
}

export interface SessionsResponse {
  data: ImportSession[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type ImportDomain =
  | "PRODUCTS"
  | "MACHINES"
  | "USERS"
  | "EMPLOYEES"
  | "TRANSACTIONS"
  | "SALES"
  | "INVENTORY"
  | "CUSTOMERS"
  | "PRICES"
  | "CATEGORIES"
  | "LOCATIONS"
  | "CONTRACTORS";

export type ImportStatus =
  | "CREATED"
  | "UPLOADING"
  | "UPLOADED"
  | "CLASSIFYING"
  | "CLASSIFIED"
  | "MAPPING"
  | "MAPPED"
  | "VALIDATING"
  | "VALIDATED"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "EXECUTING"
  | "COMPLETED"
  | "COMPLETED_WITH_ERRORS"
  | "FAILED";

export type WizardStep =
  | "upload"
  | "classification"
  | "mapping"
  | "validation"
  | "approve";
