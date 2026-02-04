import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityEvent } from './entities/security-event.entity';
import { DataEncryption } from './entities/data-encryption.entity';
import { EncryptionService } from './services/encryption.service';
import { SecurityEventService } from './services/security-event.service';
import { SecurityController } from './security.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SecurityEvent, DataEncryption]),
  ],
  controllers: [SecurityController],
  providers: [EncryptionService, SecurityEventService],
  exports: [EncryptionService, SecurityEventService],
})
export class SecurityModule {}
