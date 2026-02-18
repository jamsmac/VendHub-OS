/**
 * Audit Subscriber
 *
 * Automatically populates created_by_id and updated_by_id fields
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
   * Sets created_by_id and updated_by_id from current CLS user context.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeInsert(event: InsertEvent<any>): void {
    const userId = this.getCurrentUserId();
    if (userId && event.entity) {
      if ("created_by_id" in event.entity && !event.entity.created_by_id) {
        event.entity.created_by_id = userId;
      }
      if ("updated_by_id" in event.entity) {
        event.entity.updated_by_id = userId;
      }
    }
  }

  /**
   * Called before update.
   * Sets updated_by_id from current CLS user context.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeUpdate(event: UpdateEvent<any>): void {
    const userId = this.getCurrentUserId();
    if (userId && event.entity) {
      if ("updated_by_id" in event.entity) {
        event.entity.updated_by_id = userId;
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
