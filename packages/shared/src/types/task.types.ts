/**
 * Task Types for VendHub OS
 * Task management with photo validation, workflow states, and offline support
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum TaskType {
  // Basic operations
  REFILL = 'refill',                    // Stock replenishment
  COLLECTION = 'collection',            // Cash collection
  CLEANING = 'cleaning',                // Machine cleaning/washing
  REPAIR = 'repair',                    // Repair/maintenance
  INSTALL = 'install',                  // Machine installation
  REMOVAL = 'removal',                  // Machine removal/decommission
  AUDIT = 'audit',                      // Inventory audit
  INSPECTION = 'inspection',            // Machine inspection

  // Component replacement
  REPLACE_HOPPER = 'replace_hopper',    // Hopper replacement
  REPLACE_GRINDER = 'replace_grinder',  // Grinder replacement
  REPLACE_BREW_UNIT = 'replace_brew_unit', // Brew unit replacement
  REPLACE_MIXER = 'replace_mixer',      // Mixer replacement
}

export enum TaskStatus {
  PENDING = 'pending',          // Awaiting assignment
  ASSIGNED = 'assigned',        // Assigned to operator
  IN_PROGRESS = 'in_progress',  // Being executed
  COMPLETED = 'completed',      // Successfully completed
  REJECTED = 'rejected',        // Rejected by admin (rollback done)
  POSTPONED = 'postponed',      // Postponed by operator
  CANCELLED = 'cancelled',      // Cancelled
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum ComponentRole {
  OLD = 'old',        // Component being removed
  NEW = 'new',        // Component being installed
  TARGET = 'target',  // Target component (for inspection)
}

export enum TaskPhotoCategory {
  BEFORE = 'before',
  AFTER = 'after',
  DURING = 'during',
  OTHER = 'other',
}

// ============================================================================
// VALID TRANSITIONS
// ============================================================================

export const VALID_TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.PENDING]: [TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
  [TaskStatus.ASSIGNED]: [TaskStatus.IN_PROGRESS, TaskStatus.POSTPONED, TaskStatus.CANCELLED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.POSTPONED, TaskStatus.CANCELLED],
  [TaskStatus.POSTPONED]: [TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
  [TaskStatus.COMPLETED]: [TaskStatus.REJECTED],
  [TaskStatus.CANCELLED]: [],
  [TaskStatus.REJECTED]: [],
};

// ============================================================================
// INTERFACES
// ============================================================================

export interface ITask {
  id: string;
  organizationId: string;
  taskNumber: string;
  typeCode: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  machineId: string;
  assignedToUserId?: string;
  createdByUserId: string;

  // Scheduling
  scheduledDate?: Date;
  dueDate?: Date;

  // Execution tracking
  startedAt?: Date;
  completedAt?: Date;
  operationDate?: Date; // For offline/historical

  // Description
  description?: string;
  completionNotes?: string;
  postponeReason?: string;

  // Checklist
  checklist?: ITaskChecklistItem[];

  // For COLLECTION tasks
  expectedCashAmount?: number;
  actualCashAmount?: number;

  // Photo validation
  hasPhotoBefore: boolean;
  hasPhotoAfter: boolean;
  requiresPhotoBefore: boolean;
  requiresPhotoAfter: boolean;
  photoBeforeUrl?: string;
  photoAfterUrl?: string;

  // Offline mode
  pendingPhotos: boolean;
  offlineCompleted: boolean;

  // Location verification
  completedLatitude?: number;
  completedLongitude?: number;

  // Rejection
  rejectedByUserId?: string;
  rejectedAt?: Date;
  rejectionReason?: string;

  // Duration
  estimatedDuration?: number;
  actualDuration?: number;

  // Metadata
  metadata?: Record<string, any>;

  // Relations (optional, populated on request)
  items?: ITaskItem[];
  comments?: ITaskComment[];
  components?: ITaskComponent[];
  photos?: ITaskPhoto[];

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  // Computed
  canStart?: boolean;
  canComplete?: boolean;
  isOverdue?: boolean;
  photosReady?: boolean;
}

export interface ITaskChecklistItem {
  item: string;
  completed: boolean;
  completedAt?: Date;
}

export interface ITaskItem {
  id: string;
  taskId: string;
  productId: string;
  plannedQuantity: number;
  actualQuantity?: number;
  slotNumber?: string;
  unitOfMeasure?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskComment {
  id: string;
  taskId: string;
  userId: string;
  comment: string;
  isInternal: boolean;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskComponent {
  id: string;
  taskId: string;
  componentId: string;
  role: ComponentRole;
  serialNumber?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskPhoto {
  id: string;
  taskId: string;
  category: TaskPhotoCategory;
  url: string;
  thumbnailUrl?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  latitude?: number;
  longitude?: number;
  uploadedByUserId: string;
  description?: string;
  createdAt: Date;
}

// ============================================================================
// CREATE/UPDATE DTOs
// ============================================================================

export interface ITaskCreate {
  organizationId: string;
  typeCode: TaskType;
  machineId: string;
  assignedToUserId?: string;
  priority?: TaskPriority;
  description?: string;
  scheduledDate?: Date;
  dueDate?: Date;
  estimatedDuration?: number;
  requiresPhotoBefore?: boolean;
  requiresPhotoAfter?: boolean;
  items?: ITaskItemCreate[];
  components?: ITaskComponentCreate[];
  checklist?: ITaskChecklistItem[];
  metadata?: Record<string, any>;
}

export interface ITaskUpdate {
  assignedToUserId?: string;
  priority?: TaskPriority;
  description?: string;
  scheduledDate?: Date;
  dueDate?: Date;
  estimatedDuration?: number;
  checklist?: ITaskChecklistItem[];
  metadata?: Record<string, any>;
}

export interface ITaskItemCreate {
  productId: string;
  plannedQuantity: number;
  slotNumber?: string;
  unitOfMeasure?: string;
  notes?: string;
}

export interface ITaskComponentCreate {
  componentId: string;
  role: ComponentRole;
  serialNumber?: string;
  notes?: string;
}

export interface ITaskAssign {
  assignedToUserId: string;
}

export interface ITaskStart {
  latitude?: number;
  longitude?: number;
}

export interface ITaskComplete {
  items?: Array<{
    taskItemId: string;
    actualQuantity: number;
    notes?: string;
  }>;
  actualCashAmount?: number;
  completionNotes?: string;
  latitude?: number;
  longitude?: number;
  skipPhotos?: boolean; // For offline mode (admin only)
  operationDate?: Date; // For historical data entry
}

export interface ITaskPostpone {
  postponeReason: string;
  rescheduleDate?: Date;
}

export interface ITaskReject {
  rejectionReason: string;
}

export interface ITaskCommentCreate {
  comment: string;
  isInternal?: boolean;
  attachments?: string[];
}

// ============================================================================
// FILTER & STATS
// ============================================================================

export interface ITaskFilter {
  organizationId: string;
  typeCode?: TaskType | TaskType[];
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  machineId?: string;
  assignedToUserId?: string;
  createdByUserId?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  isOverdue?: boolean;
  pendingPhotos?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'dueDate' | 'createdAt' | 'priority' | 'status';
  sortOrder?: 'ASC' | 'DESC';
}

export interface ITaskStats {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byType: Record<TaskType, number>;
  byPriority: Record<TaskPriority, number>;
  overdue: number;
  pendingPhotos: number;
  avgCompletionTime: number; // minutes
  completedToday: number;
  completedThisWeek: number;
  completedThisMonth: number;
}

export interface IOperatorTaskStats {
  operatorId: string;
  operatorName: string;
  totalAssigned: number;
  completed: number;
  pending: number;
  inProgress: number;
  avgCompletionTime: number;
  overdueCount: number;
}

// ============================================================================
// LABELS (Russian)
// ============================================================================

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  [TaskType.REFILL]: 'Пополнение',
  [TaskType.COLLECTION]: 'Инкассация',
  [TaskType.CLEANING]: 'Мойка',
  [TaskType.REPAIR]: 'Ремонт',
  [TaskType.INSTALL]: 'Установка',
  [TaskType.REMOVAL]: 'Снятие',
  [TaskType.AUDIT]: 'Ревизия',
  [TaskType.INSPECTION]: 'Осмотр',
  [TaskType.REPLACE_HOPPER]: 'Замена бункера',
  [TaskType.REPLACE_GRINDER]: 'Замена гриндера',
  [TaskType.REPLACE_BREW_UNIT]: 'Замена вар. блока',
  [TaskType.REPLACE_MIXER]: 'Замена миксера',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: 'Ожидает',
  [TaskStatus.ASSIGNED]: 'Назначена',
  [TaskStatus.IN_PROGRESS]: 'Выполняется',
  [TaskStatus.COMPLETED]: 'Завершена',
  [TaskStatus.REJECTED]: 'Отклонена',
  [TaskStatus.POSTPONED]: 'Отложена',
  [TaskStatus.CANCELLED]: 'Отменена',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'Низкий',
  [TaskPriority.NORMAL]: 'Обычный',
  [TaskPriority.HIGH]: 'Высокий',
  [TaskPriority.URGENT]: 'Срочный',
};

// ============================================================================
// LABELS (Uzbek)
// ============================================================================

export const TASK_TYPE_LABELS_UZ: Record<TaskType, string> = {
  [TaskType.REFILL]: 'To\'ldirish',
  [TaskType.COLLECTION]: 'Inkassatsiya',
  [TaskType.CLEANING]: 'Yuvish',
  [TaskType.REPAIR]: 'Ta\'mirlash',
  [TaskType.INSTALL]: 'O\'rnatish',
  [TaskType.REMOVAL]: 'Olib tashlash',
  [TaskType.AUDIT]: 'Reviziya',
  [TaskType.INSPECTION]: 'Ko\'rik',
  [TaskType.REPLACE_HOPPER]: 'Bunker almashtirish',
  [TaskType.REPLACE_GRINDER]: 'Grinder almashtirish',
  [TaskType.REPLACE_BREW_UNIT]: 'Qaynatgich almashtirish',
  [TaskType.REPLACE_MIXER]: 'Mikser almashtirish',
};

export const TASK_STATUS_LABELS_UZ: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: 'Kutmoqda',
  [TaskStatus.ASSIGNED]: 'Tayinlangan',
  [TaskStatus.IN_PROGRESS]: 'Bajarilmoqda',
  [TaskStatus.COMPLETED]: 'Tugallangan',
  [TaskStatus.REJECTED]: 'Rad etilgan',
  [TaskStatus.POSTPONED]: 'Kechiktirilgan',
  [TaskStatus.CANCELLED]: 'Bekor qilingan',
};

// ============================================================================
// ICONS
// ============================================================================

export const TASK_TYPE_ICONS: Record<TaskType, string> = {
  [TaskType.REFILL]: '📦',
  [TaskType.COLLECTION]: '💰',
  [TaskType.CLEANING]: '🧹',
  [TaskType.REPAIR]: '🔧',
  [TaskType.INSTALL]: '🏗️',
  [TaskType.REMOVAL]: '📤',
  [TaskType.AUDIT]: '📋',
  [TaskType.INSPECTION]: '🔍',
  [TaskType.REPLACE_HOPPER]: '🪣',
  [TaskType.REPLACE_GRINDER]: '⚙️',
  [TaskType.REPLACE_BREW_UNIT]: '☕',
  [TaskType.REPLACE_MIXER]: '🌀',
};

export const TASK_PRIORITY_ICONS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: '🔵',
  [TaskPriority.NORMAL]: '🟢',
  [TaskPriority.HIGH]: '🟠',
  [TaskPriority.URGENT]: '🔴',
};

// ============================================================================
// COLORS FOR UI
// ============================================================================

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: 'bg-gray-100 text-gray-800',
  [TaskStatus.ASSIGNED]: 'bg-blue-100 text-blue-800',
  [TaskStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800',
  [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [TaskStatus.REJECTED]: 'bg-red-100 text-red-800',
  [TaskStatus.POSTPONED]: 'bg-orange-100 text-orange-800',
  [TaskStatus.CANCELLED]: 'bg-gray-100 text-gray-500',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'bg-gray-100 text-gray-800',
  [TaskPriority.NORMAL]: 'bg-blue-100 text-blue-800',
  [TaskPriority.HIGH]: 'bg-orange-100 text-orange-800',
  [TaskPriority.URGENT]: 'bg-red-100 text-red-800',
};

export const TASK_TYPE_COLORS: Record<TaskType, string> = {
  [TaskType.REFILL]: 'bg-green-100 text-green-800',
  [TaskType.COLLECTION]: 'bg-yellow-100 text-yellow-800',
  [TaskType.CLEANING]: 'bg-cyan-100 text-cyan-800',
  [TaskType.REPAIR]: 'bg-red-100 text-red-800',
  [TaskType.INSTALL]: 'bg-purple-100 text-purple-800',
  [TaskType.REMOVAL]: 'bg-gray-100 text-gray-800',
  [TaskType.AUDIT]: 'bg-indigo-100 text-indigo-800',
  [TaskType.INSPECTION]: 'bg-blue-100 text-blue-800',
  [TaskType.REPLACE_HOPPER]: 'bg-orange-100 text-orange-800',
  [TaskType.REPLACE_GRINDER]: 'bg-orange-100 text-orange-800',
  [TaskType.REPLACE_BREW_UNIT]: 'bg-orange-100 text-orange-800',
  [TaskType.REPLACE_MIXER]: 'bg-orange-100 text-orange-800',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if status transition is valid
 */
export function isValidTaskTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TASK_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get task types that require inventory items
 */
export function requiresInventoryItems(taskType: TaskType): boolean {
  return [TaskType.REFILL, TaskType.AUDIT].includes(taskType);
}

/**
 * Get task types that require cash handling
 */
export function requiresCashHandling(taskType: TaskType): boolean {
  return taskType === TaskType.COLLECTION;
}

/**
 * Get task types that require component tracking
 */
export function requiresComponentTracking(taskType: TaskType): boolean {
  return [
    TaskType.REPLACE_HOPPER,
    TaskType.REPLACE_GRINDER,
    TaskType.REPLACE_BREW_UNIT,
    TaskType.REPLACE_MIXER,
    TaskType.REPAIR,
  ].includes(taskType);
}

/**
 * Get default photo requirements for task type
 */
export function getDefaultPhotoRequirements(taskType: TaskType): {
  requiresPhotoBefore: boolean;
  requiresPhotoAfter: boolean;
} {
  switch (taskType) {
    case TaskType.COLLECTION:
      return { requiresPhotoBefore: false, requiresPhotoAfter: true };
    case TaskType.INSPECTION:
      return { requiresPhotoBefore: false, requiresPhotoAfter: false };
    default:
      return { requiresPhotoBefore: true, requiresPhotoAfter: true };
  }
}
