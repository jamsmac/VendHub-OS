/**
 * Complaints Module for VendHub OS
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import {
  Complaint,
  ComplaintComment,
  ComplaintAction,
  ComplaintRefund,
  ComplaintTemplate,
  ComplaintQrCode,
  ComplaintAutomationRule,
} from './entities/complaint.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Complaint,
      ComplaintComment,
      ComplaintAction,
      ComplaintRefund,
      ComplaintTemplate,
      ComplaintQrCode,
      ComplaintAutomationRule,
    ]),
    // EventEmitterModule is configured globally in AppModule
  ],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
