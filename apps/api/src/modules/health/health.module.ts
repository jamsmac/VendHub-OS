import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HttpModule } from "@nestjs/axios";
import { HealthController } from "./health.controller";
import { DatabaseHealthIndicator } from "./indicators/database.health";
import { RedisHealthIndicator } from "./indicators/redis.health";
import { MemoryHealthIndicator } from "./indicators/memory.health";
import { DiskHealthIndicator } from "./indicators/disk.health";
import { StorageHealthIndicator } from "./indicators/storage.health";
import { TelegramHealthIndicator } from "./indicators/telegram.health";

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
  providers: [
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    MemoryHealthIndicator,
    DiskHealthIndicator,
    StorageHealthIndicator,
    TelegramHealthIndicator,
  ],
})
export class HealthModule {}
