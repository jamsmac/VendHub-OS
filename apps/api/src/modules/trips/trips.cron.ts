import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { Trip, TripStatus } from './entities/trip.entity';
import { TripStop } from './entities/trip-stop.entity';
import { TripTaskLink, TripTaskLinkStatus } from './entities/trip-task-link.entity';
import { TripsService } from './trips.service';
import { TRIP_SETTINGS } from './constants/trip-settings';
import { AnomalyType, AnomalySeverity } from './entities/trip-anomaly.entity';

@Injectable()
export class TripsCronService {
  private readonly logger = new Logger(TripsCronService.name);

  constructor(
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,

    @InjectRepository(TripStop)
    private readonly stopRepository: Repository<TripStop>,

    @InjectRepository(TripTaskLink)
    private readonly taskLinkRepository: Repository<TripTaskLink>,

    private readonly tripsService: TripsService,
  ) {}

  /**
   * Every 15 minutes: auto-close trips without GPS updates
   */
  @Cron('*/15 * * * *')
  async handleStaleTrips(): Promise<void> {
    this.logger.log('Checking for stale trips...');

    const threshold = new Date(
      Date.now() - TRIP_SETTINGS.AUTO_CLOSE_AFTER_HOURS * 60 * 60 * 1000,
    );

    const staleTrips = await this.tripRepository.find({
      where: {
        status: TripStatus.ACTIVE,
        lastLocationUpdate: LessThan(threshold),
      },
    });

    for (const trip of staleTrips) {
      this.logger.warn(
        `Auto-closing stale trip ${trip.id} for employee ${trip.employeeId}`,
      );

      // Close trip
      trip.status = TripStatus.AUTO_CLOSED;
      trip.endedAt = new Date();
      trip.liveLocationActive = false;
      trip.notes = `${trip.notes || ''}\n[Auto-closed: no GPS updates for ${TRIP_SETTINGS.AUTO_CLOSE_AFTER_HOURS}h]`.trim();

      await this.tripRepository.save(trip);

      // Close open stops
      await this.stopRepository
        .createQueryBuilder()
        .update(TripStop)
        .set({
          endedAt: new Date(),
          durationSeconds: () =>
            `EXTRACT(EPOCH FROM (now() - "started_at"))::int`,
        })
        .where('"trip_id" = :tripId', { tripId: trip.id })
        .andWhere('"ended_at" IS NULL')
        .execute();

      // Close pending task links
      await this.taskLinkRepository
        .createQueryBuilder()
        .update(TripTaskLink)
        .set({
          status: TripTaskLinkStatus.SKIPPED,
          notes: 'Auto-skipped: trip was auto-closed',
        })
        .where('"trip_id" = :tripId', { tripId: trip.id })
        .andWhere('"status" IN (:...statuses)', {
          statuses: [TripTaskLinkStatus.PENDING, TripTaskLinkStatus.IN_PROGRESS],
        })
        .execute();
    }

    if (staleTrips.length > 0) {
      this.logger.log(`Auto-closed ${staleTrips.length} stale trips`);
    }
  }

  /**
   * Every hour: detect long stops not near machines (anomalies)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkLongStops(): Promise<void> {
    this.logger.log('Checking for long stops...');

    const openStops = await this.stopRepository.find({
      where: {
        endedAt: IsNull(),
        notificationSent: false,
      },
      relations: ['trip'],
    });

    let anomalyCount = 0;

    for (const stop of openStops) {
      const durationSeconds =
        (Date.now() - new Date(stop.startedAt).getTime()) / 1000;

      if (
        durationSeconds > TRIP_SETTINGS.LONG_STOP_THRESHOLD_SECONDS &&
        !stop.machineId
      ) {
        this.logger.warn(
          `Long stop detected: ${stop.id}, duration: ${Math.round(durationSeconds / 60)} min`,
        );

        // Create anomaly
        await this.tripsService.createAnomaly(
          stop.tripId,
          stop.trip.organizationId,
          {
            type: AnomalyType.LONG_STOP,
            severity: AnomalySeverity.WARNING,
            latitude: Number(stop.latitude),
            longitude: Number(stop.longitude),
            details: {
              durationMinutes: Math.round(durationSeconds / 60),
              expectedMaxMinutes: TRIP_SETTINGS.LONG_STOP_THRESHOLD_SECONDS / 60,
            },
          },
        );

        // Mark notification sent
        stop.notificationSent = true;
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
   * Every 15 minutes: check for active trips without live location
   * (trips started but never received GPS points)
   */
  @Cron('*/15 * * * *')
  async checkTripsWithoutGps(): Promise<void> {
    const threshold = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago

    const tripsWithoutGps = await this.tripRepository.find({
      where: {
        status: TripStatus.ACTIVE,
        lastLocationUpdate: IsNull(),
        startedAt: LessThan(threshold),
      },
    });

    for (const trip of tripsWithoutGps) {
      this.logger.warn(
        `Trip ${trip.id} has no GPS data after 15 minutes`,
      );
    }
  }
}
