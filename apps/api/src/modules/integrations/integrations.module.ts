import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import {
  Integration,
  IntegrationTemplate,
  IntegrationLog,
  IntegrationWebhook,
} from './entities/integration.entity';
import { IntegrationsController } from './integrations.controller';
import { IntegrationService } from './services/integration.service';
import { AIParserService } from './services/ai-parser.service';
import { PaymentExecutorService } from './services/payment-executor.service';
import { IntegrationTesterService } from './services/integration-tester.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Integration,
      IntegrationTemplate,
      IntegrationLog,
      IntegrationWebhook,
    ]),
    ConfigModule,
    HttpModule,
  ],
  controllers: [IntegrationsController],
  providers: [
    IntegrationService,
    AIParserService,
    PaymentExecutorService,
    IntegrationTesterService,
  ],
  exports: [
    IntegrationService,
    PaymentExecutorService,
  ],
})
export class IntegrationsModule {}
