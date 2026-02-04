/**
 * AI Module
 * Provides AI-powered features for VendHub OS
 *
 * Features:
 * - AI Import: Parse product data from images/documents
 * - Smart Suggestions: Product recommendations
 * - Anomaly Detection: Detect unusual patterns
 * - Auto-categorization: Classify products automatically
 * - Complaint Analysis: Sentiment and priority detection
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
