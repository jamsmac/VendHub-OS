/**
 * Storage Module
 * S3 + CloudFront integration for file storage
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Module({
  imports: [
    ConfigModule,
    MulterModule.register({
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max
      },
    }),
  ],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
