/**
 * VHM24 Integration Service
 * Bridge between VendtripBot GPS tracking and VendHub24 ERP.
 *
 * Features:
 * - Link VendHub tasks to trips for GPS verification
 * - Auto-verify tasks by stop proximity
 * - Sync machine locations → geofences
 * - Handle webhooks from VendHub
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RouteTaskLink as TripTaskLink } from "../routes/entities/route-task-link.entity";
import { RouteStop as TripStop } from "../routes/entities/route.entity";
import {
  MachineLocationSync,
  SyncStatus,
} from "./entities/machine-location-sync.entity";
import { GpsProcessingService } from "../routes/services/gps-processing.service";

/** Default radius for task GPS verification (meters) */
const DEFAULT_VERIFICATION_RADIUS = 100;

export type WebhookEvent =
  | "machine.created"
  | "machine.updated"
  | "machine.deleted"
  | "task.assigned"
  | "task.completed";

export interface WebhookPayload {
  event: WebhookEvent;
  data: Record<string, unknown>;
  timestamp: string;
  source: string;
}

@Injectable()
export class Vhm24IntegrationService {
  private readonly logger = new Logger(Vhm24IntegrationService.name);

  constructor(
    @InjectRepository(TripTaskLink)
    private readonly taskLinkRepo: Repository<TripTaskLink>,
    @InjectRepository(TripStop)
    private readonly stopRepo: Repository<TripStop>,
    @InjectRepository(MachineLocationSync)
    private readonly syncRepo: Repository<MachineLocationSync>,
    private readonly gpsService: GpsProcessingService,
  ) {}

  // ============================================================================
  // TASK LINKING
  // ============================================================================

  /**
   * Link VendHub tasks to a trip before it starts.
   */
  async linkTasksToTrip(
    tripId: string,
    tasks: Array<{
      vhm24TaskId: string;
      vhm24TaskType: string;
      vhm24MachineId: string;
      expectedLatitude: number;
      expectedLongitude: number;
      verificationRadiusM?: number;
    }>,
  ): Promise<TripTaskLink[]> {
    const links = tasks.map((t) =>
      this.taskLinkRepo.create({
        routeId: tripId,
        vhm24TaskId: t.vhm24TaskId,
        vhm24TaskType: t.vhm24TaskType,
        vhm24MachineId: t.vhm24MachineId,
        expectedLatitude: t.expectedLatitude,
        expectedLongitude: t.expectedLongitude,
        verificationRadiusM:
          t.verificationRadiusM ?? DEFAULT_VERIFICATION_RADIUS,
        verificationStatus: "pending",
      }),
    );

    const saved = await this.taskLinkRepo.save(links);

    this.logger.log(`Linked ${saved.length} tasks to trip ${tripId}`);

    return saved;
  }

  // ============================================================================
  // TASK VERIFICATION BY STOP
  // ============================================================================

  /**
   * Auto-verify tasks when a stop is detected.
   * Called by StopDetectionService when a stop ends.
   */
  async verifyTaskByStop(
    tripId: string,
    stop: TripStop,
  ): Promise<TripTaskLink[]> {
    const pendingLinks = await this.taskLinkRepo.find({
      where: {
        routeId: tripId,
        verificationStatus: "pending",
      },
    });

    const verified: TripTaskLink[] = [];

    for (const link of pendingLinks) {
      if (link.expectedLatitude == null || link.expectedLongitude == null) {
        continue;
      }

      const distance = this.gpsService.haversineDistance(
        Number(stop.latitude),
        Number(stop.longitude),
        link.expectedLatitude,
        link.expectedLongitude,
      );

      const radiusM = link.verificationRadiusM ?? DEFAULT_VERIFICATION_RADIUS;

      if (distance <= radiusM) {
        link.verificationStatus = "verified";
        link.actualLatitude = stop.latitude ? Number(stop.latitude) : null;
        link.actualLongitude = stop.longitude ? Number(stop.longitude) : null;
        link.distanceFromExpectedM = Math.round(distance);
        link.stopDurationSeconds = stop.actualDurationSeconds ?? 0;
        link.routeStopId = stop.id;

        verified.push(link);

        this.logger.log(
          `Task ${link.vhm24TaskId} verified by stop at ${Math.round(distance)}m`,
        );
      }
    }

    if (verified.length > 0) {
      await this.taskLinkRepo.save(verified);
    }

    return verified;
  }

  /**
   * Final verification when trip ends: check all remaining pending tasks.
   */
  async verifyAllTasksOnTripEnd(tripId: string): Promise<void> {
    const stops = await this.stopRepo.find({
      where: { routeId: tripId },
      order: { sequence: "ASC" },
    });

    const pendingLinks = await this.taskLinkRepo.find({
      where: {
        routeId: tripId,
        verificationStatus: "pending",
      },
    });

    for (const link of pendingLinks) {
      if (link.expectedLatitude == null || link.expectedLongitude == null) {
        link.verificationStatus = "skipped";
        continue;
      }

      // Find the closest stop to the expected location
      let minDistance = Infinity;
      let closestStop: TripStop | null = null;

      for (const stop of stops) {
        const dist = this.gpsService.haversineDistance(
          Number(stop.latitude),
          Number(stop.longitude),
          link.expectedLatitude!,
          link.expectedLongitude!,
        );
        if (dist < minDistance) {
          minDistance = dist;
          closestStop = stop;
        }
      }

      const radiusM = link.verificationRadiusM ?? DEFAULT_VERIFICATION_RADIUS;

      if (closestStop && minDistance <= radiusM) {
        link.verificationStatus = "verified";
        link.actualLatitude = closestStop.latitude
          ? Number(closestStop.latitude)
          : null;
        link.actualLongitude = closestStop.longitude
          ? Number(closestStop.longitude)
          : null;
        link.distanceFromExpectedM = Math.round(minDistance);
        link.routeStopId = closestStop.id;
      } else if (closestStop) {
        link.verificationStatus = "mismatch";
        link.actualLatitude = closestStop.latitude
          ? Number(closestStop.latitude)
          : null;
        link.actualLongitude = closestStop.longitude
          ? Number(closestStop.longitude)
          : null;
        link.distanceFromExpectedM = Math.round(minDistance);
      } else {
        link.verificationStatus = "skipped";
      }
    }

    if (pendingLinks.length > 0) {
      await this.taskLinkRepo.save(pendingLinks);
    }

    this.logger.log(
      `Trip ${tripId} end verification: ${pendingLinks.length} tasks checked`,
    );
  }

  /**
   * Manual verification by admin.
   */
  async manualVerifyTask(
    linkId: string,
    userId: string,
    status: "verified" | "skipped",
    _notes?: string,
  ): Promise<TripTaskLink> {
    const link = await this.taskLinkRepo.findOneOrFail({
      where: { id: linkId },
    });

    link.verificationStatus = status;
    link.overriddenById = userId;

    return this.taskLinkRepo.save(link);
  }

  // ============================================================================
  // MACHINE SYNC
  // ============================================================================

  /**
   * Sync machine locations from VendHub into geofences.
   */
  async syncMachines(
    organizationId: string,
    machines: Array<{
      machineId: string;
      machineNumber?: string;
      machineName?: string;
      locationId?: string;
      locationName?: string;
      address?: string;
      latitude: number;
      longitude: number;
    }>,
  ): Promise<{ synced: number; skipped: number }> {
    let synced = 0;
    let skipped = 0;

    for (const machine of machines) {
      const existing = await this.syncRepo.findOne({
        where: {
          organizationId,
          vhm24MachineId: machine.machineId,
        },
      });

      if (existing) {
        // Update
        existing.vhm24MachineName =
          machine.machineName ?? existing.vhm24MachineName;
        existing.vhm24Latitude = machine.latitude;
        existing.vhm24Longitude = machine.longitude;
        existing.vhm24Address = machine.address ?? existing.vhm24Address;
        existing.lastSyncedAt = new Date();
        await this.syncRepo.save(existing);
        synced++;
      } else {
        // Create new sync record
        await this.syncRepo.save(
          this.syncRepo.create({
            organizationId,
            vhm24MachineId: machine.machineId,
            vhm24MachineNumber: machine.machineNumber ?? null,
            vhm24MachineName: machine.machineName ?? null,
            vhm24LocationId: machine.locationId ?? null,
            vhm24LocationName: machine.locationName ?? null,
            vhm24Address: machine.address ?? null,
            vhm24Latitude: machine.latitude,
            vhm24Longitude: machine.longitude,
            syncStatus: SyncStatus.ACTIVE,
            lastSyncedAt: new Date(),
          }),
        );
        synced++;
      }
    }

    this.logger.log(
      `Machine sync: ${synced} synced, ${skipped} skipped for org ${organizationId}`,
    );

    return { synced, skipped };
  }

  // ============================================================================
  // WEBHOOK HANDLER
  // ============================================================================

  /**
   * Handle incoming webhooks from VendHub.
   */
  async handleWebhook(
    organizationId: string,
    payload: WebhookPayload,
  ): Promise<{ handled: boolean; action: string }> {
    this.logger.log(
      `Webhook received: ${payload.event} from ${payload.source}`,
    );

    switch (payload.event) {
      case "machine.created":
      case "machine.updated": {
        const data = payload.data as {
          machineId: string;
          latitude?: number;
          longitude?: number;
          name?: string;
        };
        if (data.latitude != null && data.longitude != null) {
          await this.syncMachines(organizationId, [
            {
              machineId: data.machineId,
              machineName: data.name,
              latitude: data.latitude,
              longitude: data.longitude,
            },
          ]);
          return { handled: true, action: "machine_synced" };
        }
        return { handled: false, action: "no_coordinates" };
      }

      case "machine.deleted": {
        const machineId = payload.data.machineId as string;
        await this.syncRepo.update(
          { vhm24MachineId: machineId, organizationId },
          { syncStatus: SyncStatus.DISABLED },
        );
        return { handled: true, action: "machine_disabled" };
      }

      case "task.assigned":
        return { handled: true, action: "task_noted" };

      case "task.completed":
        return { handled: true, action: "task_noted" };

      default:
        return { handled: false, action: "unknown_event" };
    }
  }
}
