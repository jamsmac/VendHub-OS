/**
 * Directories Module for VendHub OS
 *
 * Provides EAV (Entity-Attribute-Value) system for managing reference data
 * (справочники): units of measure, product categories, manufacturers, etc.
 *
 * Exports DirectoriesService for use by other modules.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DirectoriesService } from './directories.service';
import { DirectoriesController } from './directories.controller';
import {
  Directory,
  DirectoryField,
  DirectoryEntry,
} from './entities/directory.entity';
import { DirectorySource } from './entities/directory-source.entity';
import { DirectorySyncLog } from './entities/directory-sync-log.entity';
import { DirectoryEntryAudit } from './entities/directory-entry-audit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Directory,
      DirectoryField,
      DirectoryEntry,
      DirectorySource,
      DirectorySyncLog,
      DirectoryEntryAudit,
    ]),
  ],
  controllers: [DirectoriesController],
  providers: [DirectoriesService],
  exports: [DirectoriesService],
})
export class DirectoriesModule {}
