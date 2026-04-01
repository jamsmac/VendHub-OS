import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan, IsNull } from "typeorm";
import { Route, RouteStatus, RouteStop } from "./entities/route.entity";
import {
  RouteTaskLink,
  RouteTaskLinkStatus,
} from "./entities/route-task-link.entity";
import { RoutesService } from "./routes.service";
import { ROUTE_SETTINGS } from "./constants/route-settings";
import { AnomalyType, AnomalySeverity } from "./entities/route-anomaly.entity";

@Injectable()
export class RoutesCronService {
  private readonly logger = new Logger(RoutesCronService.name);

  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,

    @InjectRepository(RouteStop)
    private readonly stopRepository: Repository<RouteStop>,

    @InjectRepository(RouteTaskLink)
    private readonly taskLinkRepository: Repository<RouteTaskLink>,

    private readonly routesService: RoutesService,
  ) {}

  /**
   * Every 15 minutes: auto-close routes without GPS updates
   */
  @Cron("*/15 * * * *")
  async handleStaleRoutes(): Promise<void> {
    this.logger.debug("Checking for stale routes...");

    const threshold = new Date(
      Date.now() - ROUTE_SETTINGS.AUTO_CLOSE_AFTER_HOURS * 60 * 60 * 1000,
    );

    const staleRoutes = await this.routeRepository.find({
      where: {
        status: RouteStatus.ACTIVE,
        lastLocationUpdate: LessThan(threshold),
      },
    });

    for (const route of staleRoutes) {
      this.logger.warn(
        `Auto-closing stale route ${route.id} for operator ${route.operatorId}`,
      );

      route.status = RouteStatus.AUTO_CLOSED;
      route.completedAt = new Date();
      route.liveLocationActive = false;
      route.notes =
        `${route.notes || ""}\n[Auto-closed: no GPS updates for ${ROUTE_SETTINGS.AUTO_CLOSE_AFTER_HOURS}h]`.trim();

      await this.routeRepository.save(route);

      // Close open stops
      const arrivedStops = await this.stopRepository.find({
        where: { routeId: route.id, departedAt: IsNull() },
      });

      for (const stop of arrivedStops) {
        if (
          stop.status === ("arrived" as never) ||
          stop.status === ("in_progress" as never)
        ) {
          stop.departedAt = new Date();
          stop.actualDurationSeconds = Math.round(
            (stop.departedAt.getTime() -
              new Date(stop.actualArrival ?? stop.createdAt).getTime()) /
              1000,
          );
          await this.stopRepository.save(stop);
        }
      }

      // Close pending task links
      await this.taskLinkRepository
        .createQueryBuilder()
        .update(RouteTaskLink)
        .set({
          status: RouteTaskLinkStatus.SKIPPED,
          notes: "Auto-skipped: route was auto-closed",
        })
        .where('"route_id" = :routeId', { routeId: route.id })
        .andWhere('"status" IN (:...statuses)', {
          statuses: [
            RouteTaskLinkStatus.PENDING,
            RouteTaskLinkStatus.IN_PROGRESS,
          ],
        })
        .execute();
    }

    if (staleRoutes.length > 0) {
      this.logger.log(`Auto-closed ${staleRoutes.length} stale routes`);
    }
  }

  /**
   * Every hour: detect long stops not near machines (anomalies)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkLongStops(): Promise<void> {
    this.logger.log("Checking for long stops...");

    // Find route stops that have been arrived but not departed for too long
    const arrivedStops = await this.stopRepository
      .createQueryBuilder("stop")
      .leftJoinAndSelect("stop.route", "route")
      .where("stop.departedAt IS NULL")
      .andWhere("stop.actualArrival IS NOT NULL")
      .andWhere("stop.isAnomaly = false")
      .andWhere("route.status = :status", { status: RouteStatus.ACTIVE })
      .getMany();

    let anomalyCount = 0;

    for (const stop of arrivedStops) {
      const durationSeconds =
        (Date.now() - new Date(stop.actualArrival!).getTime()) / 1000;

      if (
        durationSeconds > ROUTE_SETTINGS.LONG_STOP_THRESHOLD_SECONDS &&
        !stop.isVerified
      ) {
        this.logger.warn(
          `Long stop detected: ${stop.id}, duration: ${Math.round(durationSeconds / 60)} min`,
        );

        await this.routesService.createAnomaly(
          stop.routeId,
          stop.route.organizationId,
          {
            type: AnomalyType.LONG_STOP,
            severity: AnomalySeverity.WARNING,
            latitude: stop.latitude ? Number(stop.latitude) : undefined,
            longitude: stop.longitude ? Number(stop.longitude) : undefined,
            details: {
              durationMinutes: Math.round(durationSeconds / 60),
              expectedMaxMinutes:
                ROUTE_SETTINGS.LONG_STOP_THRESHOLD_SECONDS / 60,
            },
          },
        );

        stop.isAnomaly = true;
        await this.stopRepository.save(stop);
        anomalyCount++;
      }
    }

    if (anomalyCount > 0) {
      this.logger.log(`Detected ${anomalyCount} long stop anomalies`);
    }
  }

  /**
   * Every 15 minutes: check for active routes without live location
   */
  @Cron("*/15 * * * *")
  async checkRoutesWithoutGps(): Promise<void> {
    const threshold = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago

    const routesWithoutGps = await this.routeRepository.find({
      where: {
        status: RouteStatus.ACTIVE,
        lastLocationUpdate: IsNull(),
        startedAt: LessThan(threshold),
      },
    });

    for (const route of routesWithoutGps) {
      this.logger.warn(`Route ${route.id} has no GPS data after 15 minutes`);
    }
  }
}
