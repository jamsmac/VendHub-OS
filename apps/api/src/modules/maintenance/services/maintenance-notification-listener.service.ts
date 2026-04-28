import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, IsNull } from "typeorm";

import { WebPushService } from "../../web-push/web-push.service";
import { User, UserRole } from "../../users/entities/user.entity";
import { MaintenanceRequest } from "../entities/maintenance.entity";

interface SlaBreachedEvent {
  request: MaintenanceRequest;
}

/**
 * Recipients of SLA-breach pushes.
 *
 * Manager + admin + owner cover the chain of responsibility within the
 * org; the assigned technician is added separately so they see their
 * own slipping work even if they don't have a management role.
 */
const SLA_NOTIFY_ROLES: readonly UserRole[] = [
  UserRole.MANAGER,
  UserRole.ADMIN,
  UserRole.OWNER,
] as const;

@Injectable()
export class MaintenanceNotificationListenerService {
  private readonly logger = new Logger(
    MaintenanceNotificationListenerService.name,
  );

  constructor(
    private readonly webPushService: WebPushService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @OnEvent("maintenance.sla_breached")
  async handleSlaBreached(event: SlaBreachedEvent): Promise<void> {
    const { request } = event;

    const recipients = await this.resolveRecipients(request);
    if (recipients.length === 0) {
      this.logger.warn(
        `SLA breach for request ${request.id}: no notifiable users in org ${request.organizationId}`,
      );
      return;
    }

    const title = `⚠️ Просрочка обслуживания: ${request.requestNumber}`;
    const body =
      request.title.length > 80
        ? `${request.title.slice(0, 77)}...`
        : request.title;
    const url = `/dashboard/maintenance/${request.id}`;
    const data = {
      type: "maintenance.sla_breached",
      requestId: request.id,
      machineId: request.machineId,
    };

    // Pushes are independent — one user's broken subscription must not
    // suppress another user's alert. Promise.allSettled keeps the loop
    // from short-circuiting on the first rejection.
    const results = await Promise.allSettled(
      recipients.map((userId) =>
        this.webPushService.sendToUser(userId, title, body, url, data),
      ),
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      this.logger.warn(
        `SLA breach push: ${failed}/${results.length} sends failed for request ${request.id}`,
      );
    }
  }

  /**
   * Returns the set of userIds who should receive the SLA breach push.
   * Always org-scoped (no cross-tenant leakage). Soft-deleted users are
   * filtered automatically via the BaseEntity deletedAt index.
   */
  private async resolveRecipients(
    request: MaintenanceRequest,
  ): Promise<string[]> {
    const recipients = new Set<string>();

    if (request.assignedTechnicianId) {
      recipients.add(request.assignedTechnicianId);
    }

    const managers = await this.userRepo.find({
      where: {
        organizationId: request.organizationId,
        role: In([...SLA_NOTIFY_ROLES]),
        deletedAt: IsNull(),
      },
      select: ["id"],
      take: 100,
    });
    for (const m of managers) {
      recipients.add(m.id);
    }

    return [...recipients];
  }
}
