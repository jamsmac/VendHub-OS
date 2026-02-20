import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import {
  FiscalReceipt,
  FiscalShift,
  FiscalDevice,
  FiscalQueue,
} from './entities/fiscal.entity';
import { FiscalController } from './fiscal.controller';
import { FiscalService } from './services/fiscal.service';
import { MultiKassaService } from './services/multikassa.service';
import { FiscalQueueProcessor } from './processors/fiscal-queue.processor';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FiscalReceipt,
      FiscalShift,
      FiscalDevice,
      FiscalQueue,
    ]),
    ConfigModule,
    HttpModule,
    BullModule.registerQueue({
      name: 'fiscal',
    }),
    IntegrationsModule,
  ],
  controllers: [FiscalController],
  providers: [
    FiscalService,
    MultiKassaService,
    FiscalQueueProcessor,
  ],
  exports: [FiscalService, MultiKassaService],
})
export class FiscalModule {}
