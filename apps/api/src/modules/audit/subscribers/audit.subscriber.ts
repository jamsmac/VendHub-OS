// @ts-nocheck -- Railway build cache workaround
/**
 * Audit Subscriber for VendHub OS
 * Automatically logs entity changes to audit trail
 */

import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  SoftRemoveEvent,
  RecoverEvent,
  DataSource,
  EntityManager,
  ObjectLiteral,
} from "typeorm";
import { Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { ClsService } from "nestjs-cls";
import {
  AuditLog,
  AuditSnapshot,
  AuditAction,
  AuditEventType,
  AuditCategory,
  AuditSeverity,
  AuditChanges,
  SENSITIVE_FIELDS,
  AUDITED_ENTITIES,
} from "../entities/audit.entity";

/**
 * Map AuditAction → AuditEventType for the subscriber.
 * The DB column event_type is NOT NULL, so every audit log must have one.
 */
const ACTION_TO_EVENT_TYPE: Record<AuditAction, AuditEventType> = {
  [AuditAction.CREATE]: AuditEventType.ACCOUNT_CREATED,
  [AuditAction.UPDATE]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.DELETE]: AuditEventType.ACCOUNT_DELETED,
  [AuditAction.SOFT_DELETE]: AuditEventType.ACCOUNT_DELETED,
  [AuditAction.RESTORE]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.LOGIN]: AuditEventType.LOGIN_SUCCESS,
  [AuditAction.LOGOUT]: AuditEventType.LOGOUT,
  [AuditAction.LOGIN_FAILED]: AuditEventType.LOGIN_FAILED,
  [AuditAction.PASSWORD_CHANGE]: AuditEventType.PASSWORD_CHANGED,
  [AuditAction.PASSWORD_RESET]: AuditEventType.PASSWORD_RESET_COMPLETED,
  [AuditAction.PERMISSION_CHANGE]: AuditEventType.PERMISSION_CHANGED,
  [AuditAction.SETTINGS_CHANGE]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.EXPORT]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.IMPORT]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.BULK_UPDATE]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.BULK_DELETE]: AuditEventType.ACCOUNT_DELETED,
  [AuditAction.API_CALL]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.WEBHOOK_RECEIVED]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.PAYMENT_PROCESSED]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.REFUND_ISSUED]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.REPORT_GENERATED]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.NOTIFICATION_SENT]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.TASK_ASSIGNED]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.TASK_COMPLETED]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.MACHINE_STATUS_CHANGE]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.INVENTORY_ADJUSTMENT]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.FISCAL_OPERATION]: AuditEventType.ACCOUNT_UPDATED,
};

// Interface for request context stored in CLS
interface RequestContext {
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
  sessionId?: string;
}

@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  private readonly logger = new Logger(AuditSubscriber.name);

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private readonly cls: ClsService,
  ) {
    // Guard: TypeORM's own container may instantiate this before NestJS DI is ready
    if (dataSource?.subscribers) {
      dataSource.subscribers.push(this);
    }
  }

  /**
   * Called after entity insertion
   */
  async afterInsert(event: InsertEvent<ObjectLiteral>): Promise<void> {
    if (!this.shouldAudit(event.metadata.tableName)) {
      return;
    }

    try {
      await this.createAuditLog(event.manager, {
        action: AuditAction.CREATE,
        entityType: event.metadata.tableName,
        entityId: event.entity?.id,
        entityName: this.getEntityName(event.entity),
        newValues: this.sanitizeValues(event.entity),
        category: AuditCategory.DATA_MODIFICATION,
        severity: AuditSeverity.INFO,
        description: `Created ${event.metadata.tableName} record`,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create audit log for INSERT: ${msg}`, stack);
    }
  }

  /**
   * Called after entity update
   */
  async afterUpdate(event: UpdateEvent<ObjectLiteral>): Promise<void> {
    if (!this.shouldAudit(event.metadata.tableName)) {
      return;
    }

    try {
      const changes = this.calculateChanges(
        event.databaseEntity,
        event.entity,
        event.updatedColumns?.map((c) => c.propertyName),
      );

      if (changes.length === 0) {
        return; // No actual changes
      }

      await this.createAuditLog(event.manager, {
        action: AuditAction.UPDATE,
        entityType: event.metadata.tableName,
        entityId: event.entity?.id || event.databaseEntity?.id,
        entityName: this.getEntityName(event.entity || event.databaseEntity),
        oldValues: this.sanitizeValues(event.databaseEntity),
        newValues: this.sanitizeValues(event.entity),
        changes,
        affectedFields: changes.map((c) => c.field),
        category: AuditCategory.DATA_MODIFICATION,
        severity: AuditSeverity.INFO,
        description: `Updated ${event.metadata.tableName} record (${changes.length} fields)`,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create audit log for UPDATE: ${msg}`, stack);
    }
  }

  /**
   * Called after entity removal (hard delete)
   */
  async afterRemove(event: RemoveEvent<ObjectLiteral>): Promise<void> {
    if (!this.shouldAudit(event.metadata.tableName)) {
      return;
    }

    try {
      // Create snapshot before deletion
      await this.createSnapshot(event.manager, {
        entityType: event.metadata.tableName,
        entityId: event.entityId,
        entityName: this.getEntityName(event.databaseEntity),
        snapshot: this.sanitizeValues(event.databaseEntity),
        snapshotReason: "before_delete",
      });

      await this.createAuditLog(event.manager, {
        action: AuditAction.DELETE,
        entityType: event.metadata.tableName,
        entityId: event.entityId,
        entityName: this.getEntityName(event.databaseEntity),
        oldValues: this.sanitizeValues(event.databaseEntity),
        category: AuditCategory.DATA_MODIFICATION,
        severity: AuditSeverity.WARNING,
        description: `Deleted ${event.metadata.tableName} record`,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create audit log for REMOVE: ${msg}`, stack);
    }
  }

  /**
   * Called after soft remove
   */
  async afterSoftRemove(event: SoftRemoveEvent<ObjectLiteral>): Promise<void> {
    if (!this.shouldAudit(event.metadata.tableName)) {
      return;
    }

    try {
      await this.createAuditLog(event.manager, {
        action: AuditAction.SOFT_DELETE,
        entityType: event.metadata.tableName,
        entityId: event.entity?.id || event.entityId,
        entityName: this.getEntityName(event.entity || event.databaseEntity),
        oldValues: this.sanitizeValues(event.databaseEntity),
        category: AuditCategory.DATA_MODIFICATION,
        severity: AuditSeverity.INFO,
        description: `Soft deleted ${event.metadata.tableName} record`,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to create audit log for SOFT_REMOVE: ${msg}`,
        stack,
      );
    }
  }

  /**
   * Called after entity recovery (restore from soft delete)
   */
  async afterRecover(event: RecoverEvent<ObjectLiteral>): Promise<void> {
    if (!this.shouldAudit(event.metadata.tableName)) {
      return;
    }

    try {
      await this.createAuditLog(event.manager, {
        action: AuditAction.RESTORE,
        entityType: event.metadata.tableName,
        entityId: event.entity?.id || event.entityId,
        entityName: this.getEntityName(event.entity || event.databaseEntity),
        newValues: this.sanitizeValues(event.entity),
        category: AuditCategory.DATA_MODIFICATION,
        severity: AuditSeverity.INFO,
        description: `Restored ${event.metadata.tableName} record`,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to create audit log for RECOVER: ${msg}`,
        stack,
      );
    }
  }

  /**
   * Check if entity should be audited
   */
  private shouldAudit(tableName: string): boolean {
    // Don't audit the audit tables themselves
    if (tableName.startsWith("audit_")) {
      return false;
    }

    // Check if table is in the audited list
    return AUDITED_ENTITIES.includes(tableName);
  }

  /**
   * Get entity display name
   */
  private getEntityName(entity: ObjectLiteral | undefined | null): string {
    if (!entity) return "";
    return (
      entity.name ||
      entity.title ||
      entity.code ||
      entity.email ||
      entity.serialNumber ||
      entity.sku ||
      ""
    );
  }

  /**
   * Calculate changes between old and new values
   */
  private calculateChanges(
    oldEntity: ObjectLiteral | undefined | null,
    newEntity: ObjectLiteral | undefined | null,
    updatedColumns?: string[],
  ): AuditChanges[] {
    const changes: AuditChanges[] = [];

    if (!oldEntity || !newEntity) {
      return changes;
    }

    const fieldsToCheck = updatedColumns || Object.keys(newEntity);

    for (const field of fieldsToCheck) {
      // Skip internal fields
      if (
        ["id", "createdAt", "updatedAt", "deletedAt", "version"].includes(field)
      ) {
        continue;
      }

      const oldValue = oldEntity[field];
      const newValue = newEntity[field];

      // Compare values
      if (!this.isEqual(oldValue, newValue)) {
        changes.push({
          field,
          oldValue: this.sanitizeValue(field, oldValue),
          newValue: this.sanitizeValue(field, newValue),
          fieldType: typeof newValue,
        });
      }
    }

    return changes;
  }

  /**
   * Check if two values are equal (deep comparison for objects)
   */

  private isEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    if (typeof a !== typeof b) return false;

    if (typeof a === "object") {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    return false;
  }

  /**
   * Sanitize entity values (mask sensitive fields)
   */
  private sanitizeValues(
    entity: ObjectLiteral | undefined | null,
  ): Record<string, unknown> {
    if (!entity) return {};

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(entity)) {
      sanitized[key] = this.sanitizeValue(key, value);
    }

    return sanitized;
  }

  /**
   * Sanitize a single value
   */

  private sanitizeValue(field: string, value: unknown): unknown {
    // Check if field is sensitive
    const isSensitive = SENSITIVE_FIELDS.some((sf) =>
      field.toLowerCase().includes(sf.toLowerCase()),
    );

    if (isSensitive && value) {
      return "***REDACTED***";
    }

    // Handle complex objects (don't serialize full relations)
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if ((value as Record<string, unknown>).id) {
        return { id: (value as Record<string, unknown>).id };
      }
      // For Date objects
      if (value instanceof Date) {
        return value.toISOString();
      }
    }

    return value;
  }

  /**
   * Get current request context from CLS
   */
  private getRequestContext(): RequestContext {
    try {
      return {
        userId: this.cls.get("userId"),
        userEmail: this.cls.get("userEmail"),
        userName: this.cls.get("userName"),
        userRole: this.cls.get("userRole"),
        organizationId: this.cls.get("organizationId"),
        ipAddress: this.cls.get("ipAddress"),
        userAgent: this.cls.get("userAgent"),
        requestId: this.cls.get("requestId"),
        correlationId: this.cls.get("correlationId"),
        sessionId: this.cls.get("sessionId"),
      };
    } catch {
      return {};
    }
  }

  /**
   * Create audit log entry.
   * Uses a SEPARATE connection (dataSource.manager) so that a failed INSERT
   * does not poison the caller's transaction (PostgreSQL aborts all
   * subsequent statements once any statement in a transaction fails).
   */
  private async createAuditLog(
    _manager: EntityManager,
    data: Partial<AuditLog>,
  ): Promise<void> {
    const context = this.getRequestContext();

    // Derive eventType from action — DB column is NOT NULL
    const eventType =
      data.eventType ||
      (data.action ? ACTION_TO_EVENT_TYPE[data.action] : undefined) ||
      AuditEventType.ACCOUNT_UPDATED;

    const repo = this.dataSource.getRepository(AuditLog);

    const auditLog = repo.create({
      ...data,
      eventType,
      organizationId: data.organizationId || context.organizationId,
      userId: context.userId,
      userEmail: context.userEmail,
      userName: context.userName,
      userRole: context.userRole,
      ipAddress: context.ipAddress,
      context: {
        requestId: context.requestId,
        correlationId: context.correlationId,
        sessionId: context.sessionId,
      },
      deviceInfo: context.userAgent
        ? { userAgent: context.userAgent }
        : undefined,
      // Ensure JSONB columns are never NULL (DB may enforce NOT NULL)
      metadata: data.metadata ?? {},
      tags: data.tags ?? [],
      isSuccess: true,
      createdAt: new Date(),
      // Set expiration date based on retention
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
    });

    // Use dataSource (separate connection) to avoid poisoning caller's transaction
    await repo.save(auditLog);
  }

  /**
   * Create entity snapshot
   */
  private async createSnapshot(
    manager: EntityManager,
    data: {
      entityType: string;
      entityId: string;
      entityName?: string;
      snapshot: Record<string, unknown>;
      snapshotReason?: string;
    },
  ): Promise<void> {
    const context = this.getRequestContext();

    const snapshot = manager.create(AuditSnapshot, {
      organizationId: context.organizationId,
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName,
      snapshot: data.snapshot,
      snapshotReason: data.snapshotReason,
      createdBy: context.userId,
      createdAt: new Date(),
      // 7 years retention for compliance
      expiresAt: new Date(Date.now() + 2555 * 24 * 60 * 60 * 1000),
    });

    await manager.getRepository(AuditSnapshot).save(snapshot);
  }
}
