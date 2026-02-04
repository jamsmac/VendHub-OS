/**
 * Audit Module for VendHub OS
 * Provides comprehensive audit trail functionality
 */

import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditSubscriber } from './subscribers/audit.subscriber';
import {
  AuditLog,
  AuditSnapshot,
  AuditRetentionPolicy,
  AuditAlert,
  AuditAlertHistory,
  AuditSession,
  AuditReport,
} from './entities/audit.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Global() // Make audit service available globally
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLog,
      AuditSnapshot,
      AuditRetentionPolicy,
      AuditAlert,
      AuditAlertHistory,
      AuditSession,
      AuditReport,
    ]),
    NotificationsModule,
  ],
  controllers: [AuditController],
  providers: [AuditService, AuditSubscriber],
  exports: [AuditService],
})
export class AuditModule {}
