/**
 * Material Requests Module
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MaterialRequest,
  MaterialRequestItem,
  MaterialRequestHistory,
} from './entities/material-request.entity';
import { MaterialRequestsService } from './material-requests.service';
import { MaterialRequestsController } from './material-requests.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaterialRequest,
      MaterialRequestItem,
      MaterialRequestHistory,
    ]),
  ],
  controllers: [MaterialRequestsController],
  providers: [MaterialRequestsService],
  exports: [MaterialRequestsService],
})
export class MaterialRequestsModule {}
