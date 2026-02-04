/**
 * Machine Access Module for VendHub OS
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MachineAccessController } from './machine-access.controller';
import { MachineAccessService } from './machine-access.service';
import {
  MachineAccess,
  AccessTemplate,
  AccessTemplateRow,
} from './entities/machine-access.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MachineAccess,
      AccessTemplate,
      AccessTemplateRow,
    ]),
  ],
  controllers: [MachineAccessController],
  providers: [MachineAccessService],
  exports: [MachineAccessService],
})
export class MachineAccessModule {}
