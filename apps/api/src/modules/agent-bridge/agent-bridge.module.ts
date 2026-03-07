import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AgentBridgeController } from "./agent-bridge.controller";
import { AgentBridgeService } from "./agent-bridge.service";
import { AgentSession } from "./entities/agent-session.entity";
import { AgentProgress } from "./entities/agent-progress.entity";
import { AgentApiKeyGuard } from "./guards/agent-api-key.guard";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AgentSession, AgentProgress]),
  ],
  controllers: [AgentBridgeController],
  providers: [AgentBridgeService, AgentApiKeyGuard],
  exports: [AgentBridgeService],
})
export class AgentBridgeModule {}
