/**
 * Audit Subscriber
 *
 * Automatically populates createdById and updatedById fields
 * on all entities that extend BaseEntity, using the current user
 * from CLS (Continuation Local Storage) context.
 *
 * This ensures audit trail is always populated without manual work
 * in every service method.
 */

import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from "typeorm";
import { ClsServiceManager } from "nestjs-cls";

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  /**
   * Called before insert.
   * Sets createdById and updatedById from current CLS user context.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeInsert(event: InsertEvent<any>): void {
    const userId = this.getCurrentUserId();
    if (userId && event.entity) {
      if ("createdById" in event.entity && !event.entity.createdById) {
        event.entity.createdById = userId;
      }
      if ("updatedById" in event.entity) {
        event.entity.updatedById = userId;
      }
    }
  }

  /**
   * Called before update.
   * Sets updatedById from current CLS user context.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeUpdate(event: UpdateEvent<any>): void {
    const userId = this.getCurrentUserId();
    if (userId && event.entity) {
      if ("updatedById" in event.entity) {
        event.entity.updatedById = userId;
      }
    }
  }

  /**
   * Retrieve current user ID from CLS context.
   * Returns null if no user is in context (e.g., system operations, migrations).
   */
  private getCurrentUserId(): string | null {
    try {
      const cls = ClsServiceManager.getClsService();
      return cls?.get("userId") ?? null;
    } catch {
      // CLS not available (e.g., during migrations or CLI commands)
      return null;
    }
  }
}
