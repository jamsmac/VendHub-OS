import {
  FileUp,
  ClipboardList,
  Columns,
  ShieldCheck,
  Play,
} from "lucide-react";

import type { ImportDomain, ImportStatus, WizardStep } from "./import-types";

export const statusStyleConfig: Record<
  ImportStatus,
  { labelKey: string; color: string; bgColor: string }
> = {
  CREATED: {
    labelKey: "status_CREATED",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  UPLOADING: {
    labelKey: "status_UPLOADING",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  UPLOADED: {
    labelKey: "status_UPLOADED",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  CLASSIFYING: {
    labelKey: "status_CLASSIFYING",
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
  },
  CLASSIFIED: {
    labelKey: "status_CLASSIFIED",
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
  },
  MAPPING: {
    labelKey: "status_MAPPING",
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
  },
  MAPPED: {
    labelKey: "status_MAPPED",
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
  },
  VALIDATING: {
    labelKey: "status_VALIDATING",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  VALIDATED: {
    labelKey: "status_VALIDATED",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  AWAITING_APPROVAL: {
    labelKey: "status_AWAITING_APPROVAL",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  APPROVED: {
    labelKey: "status_APPROVED",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  REJECTED: {
    labelKey: "status_REJECTED",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
  EXECUTING: {
    labelKey: "status_EXECUTING",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  COMPLETED: {
    labelKey: "status_COMPLETED",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  COMPLETED_WITH_ERRORS: {
    labelKey: "status_COMPLETED_WITH_ERRORS",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  FAILED: {
    labelKey: "status_FAILED",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
};

export const domainStyleConfig: Record<
  ImportDomain,
  { labelKey: string; color: string; bgColor: string }
> = {
  PRODUCTS: {
    labelKey: "domain_PRODUCTS",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  MACHINES: {
    labelKey: "domain_MACHINES",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  USERS: {
    labelKey: "domain_USERS",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  EMPLOYEES: {
    labelKey: "domain_EMPLOYEES",
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
  },
  TRANSACTIONS: {
    labelKey: "domain_TRANSACTIONS",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  SALES: {
    labelKey: "domain_SALES",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
  },
  INVENTORY: {
    labelKey: "domain_INVENTORY",
    color: "text-teal-700",
    bgColor: "bg-teal-100",
  },
  CUSTOMERS: {
    labelKey: "domain_CUSTOMERS",
    color: "text-pink-700",
    bgColor: "bg-pink-100",
  },
  PRICES: {
    labelKey: "domain_PRICES",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  CATEGORIES: {
    labelKey: "domain_CATEGORIES",
    color: "text-cyan-700",
    bgColor: "bg-cyan-100",
  },
  LOCATIONS: {
    labelKey: "domain_LOCATIONS",
    color: "text-sky-700",
    bgColor: "bg-sky-100",
  },
  CONTRACTORS: {
    labelKey: "domain_CONTRACTORS",
    color: "text-slate-700",
    bgColor: "bg-slate-100",
  },
};

export const DOMAIN_KEYS: ImportDomain[] = [
  "PRODUCTS",
  "MACHINES",
  "USERS",
  "EMPLOYEES",
  "TRANSACTIONS",
  "SALES",
  "INVENTORY",
  "CUSTOMERS",
  "PRICES",
  "CATEGORIES",
  "LOCATIONS",
  "CONTRACTORS",
];

export const STATUS_KEYS: ImportStatus[] = [
  "CREATED",
  "UPLOADING",
  "UPLOADED",
  "CLASSIFYING",
  "CLASSIFIED",
  "MAPPING",
  "MAPPED",
  "VALIDATING",
  "VALIDATED",
  "AWAITING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "EXECUTING",
  "COMPLETED",
  "COMPLETED_WITH_ERRORS",
  "FAILED",
];

export const ACCEPTED_FORMATS = ".csv,.xls,.xlsx,.json";
export const PAGE_SIZE = 20;

export const wizardStepDefs: {
  id: WizardStep;
  labelKey: string;
  icon: React.ElementType;
}[] = [
  { id: "upload", labelKey: "step_upload", icon: FileUp },
  {
    id: "classification",
    labelKey: "step_classification",
    icon: ClipboardList,
  },
  { id: "mapping", labelKey: "step_mapping", icon: Columns },
  { id: "validation", labelKey: "step_validation", icon: ShieldCheck },
  { id: "approve", labelKey: "step_approve", icon: Play },
];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
