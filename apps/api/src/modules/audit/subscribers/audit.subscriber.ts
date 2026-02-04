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
} from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ClsService } from 'nestjs-cls';
import {
  AuditLog,
  AuditSnapshot,
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditChanges,
  SENSITIVE_FIELDS,
  AUDITED_ENTITIES,
} from '../entities/audit.entity';

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
    dataSource.subscribers.push(this);
  }

  /**
   * Called after entity insertion
   */
  async afterInsert(event: InsertEvent<any>): Promise<void> {
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
    } catch (error: any) {
      this.logger.error(`Failed to create audit log for INSERT: ${error.message}`, error.stack);
    }
  }

  /**
   * Called after entity update
   */
  async afterUpdate(event: UpdateEvent<any>): Promise<void> {
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
    } catch (error: any) {
      this.logger.error(`Failed to create audit log for UPDATE: ${error.message}`, error.stack);
    }
  }

  /**
   * Called after entity removal (hard delete)
   */
  async afterRemove(event: RemoveEvent<any>): Promise<void> {
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
        snapshotReason: 'before_delete',
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
    } catch (error: any) {
      this.logger.error(`Failed to create audit log for REMOVE: ${error.message}`, error.stack);
    }
  }

  /**
   * Called after soft remove
   */
  async afterSoftRemove(event: SoftRemoveEvent<any>): Promise<void> {
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
    } catch (error: any) {
      this.logger.error(`Failed to create audit log for SOFT_REMOVE: ${error.message}`, error.stack);
    }
  }

  /**
   * Called after entity recovery (restore from soft delete)
   */
  async afterRecover(event: RecoverEvent<any>): Promise<void> {
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
    } catch (error: any) {
      this.logger.error(`Failed to create audit log for RECOVER: ${error.message}`, error.stack);
    }
  }

  /**
   * Check if entity should be audited
   */
  private shouldAudit(tableName: string): boolean {
    // Don't audit the audit tables themselves
    if (tableName.startsWith('audit_')) {
      return false;
    }

    // Check if table is in the audited list
    return AUDITED_ENTITIES.includes(tableName);
  }

  /**
   * Get entity display name
   */
  private getEntityName(entity: any): string {
    if (!entity) return '';
    return (
      entity.name ||
      entity.title ||
      entity.code ||
      entity.email ||
      entity.serialNumber ||
      entity.sku ||
      ''
    );
  }

  /**
   * Calculate changes between old and new values
   */
  private calculateChanges(
    oldEntity: any,
    newEntity: any,
    updatedColumns?: string[],
  ): AuditChanges[] {
    const changes: AuditChanges[] = [];

    if (!oldEntity || !newEntity) {
      return changes;
    }

    const fieldsToCheck = updatedColumns || Object.keys(newEntity);

    for (const field of fieldsToCheck) {
      // Skip internal fields
      if (['id', 'createdAt', 'updatedAt', 'deletedAt', 'version'].includes(field)) {
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
  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    return false;
  }

  /**
   * Sanitize entity values (mask sensitive fields)
   */
  private sanitizeValues(entity: any): Record<string, any> {
    if (!entity) return {};

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(entity)) {
      sanitized[key] = this.sanitizeValue(key, value);
    }

    return sanitized;
  }

  /**
   * Sanitize a single value
   */
  private sanitizeValue(field: string, value: any): any {
    // Check if field is sensitive
    const isSensitive = SENSITIVE_FIELDS.some(
      (sf) => field.toLowerCase().includes(sf.toLowerCase()),
    );

    if (isSensitive && value) {
      return '***REDACTED***';
    }

    // Handle complex objects (don't serialize full relations)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (value.id) {
        return { id: value.id };
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
        userId: this.cls.get('userId'),
        userEmail: this.cls.get('userEmail'),
        userName: this.cls.get('userName'),
        userRole: this.cls.get('userRole'),
        organizationId: this.cls.get('organizationId'),
        ipAddress: this.cls.get('ipAddress'),
        userAgent: this.cls.get('userAgent'),
        requestId: this.cls.get('requestId'),
        correlationId: this.cls.get('correlationId'),
        sessionId: this.cls.get('sessionId'),
      };
    } catch {
      return {};
    }
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    manager: EntityManager,
    data: Partial<AuditLog>,
  ): Promise<void> {
    const context = this.getRequestContext();

    const auditLog = manager.create(AuditLog, {
      ...data,
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
      isSuccess: true,
      createdAt: new Date(),
      // Set expiration date based on retention
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
    });

    // Use a separate connection to avoid transaction issues
    await manager.getRepository(AuditLog).save(auditLog);
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
      snapshot: Record<string, any>;
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
