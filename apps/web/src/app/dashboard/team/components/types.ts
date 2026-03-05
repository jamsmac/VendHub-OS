import type { Employee as BaseEmployee } from "@/types";
import type { EmployeeStatus } from "./constants";

export interface ExtendedEmployee extends Omit<BaseEmployee, "status"> {
  avatar?: string;
  department?: string;
  position?: string;
  rating?: number;
  tasksCompleted?: number;
  lastActive?: string;
  joinedAt?: string;
  telegramId?: string;
  sessions?: number;
  status: EmployeeStatus;
}

export interface TeamStats {
  total: number;
  active: number;
  away: number;
  inactive: number;
  avgRating: number;
}

export interface ActivityLog {
  id: number;
  userId: number;
  userName: string;
  action: "create" | "edit" | "delete" | "role_change" | "login";
  target: string;
  details: string;
  timestamp: string;
}
