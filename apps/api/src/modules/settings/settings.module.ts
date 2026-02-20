/**
 * Settings Module
 *
 * Provides system-wide and per-organization configuration management.
 * Includes AI provider key management with encrypted storage.
 *
 * Entities:
 *   - SystemSetting: Key-value configuration store
 *   - AiProviderKey: AI provider credentials
 *
 * Exports SettingsService for use by other modules (e.g., AiModule).
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from './entities/system-setting.entity';
import { AiProviderKey } from './entities/ai-provider-key.entity';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemSetting, AiProviderKey]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
