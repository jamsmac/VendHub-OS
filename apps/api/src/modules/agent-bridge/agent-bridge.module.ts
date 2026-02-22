import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AgentBridgeController } from "./agent-bridge.controller";
import { AgentBridgeService } from "./agent-bridge.service";
import { AgentSession } from "./entities/agent-session.entity";
import { AgentProgress } from "./entities/agent-progress.entity";

@Module({
  imports: [TypeOrmModule.forFeature([AgentSession, AgentProgress])],
  controllers: [AgentBridgeController],
  providers: [AgentBridgeService],
  exports: [AgentBridgeService],
})
export class AgentBridgeModule {}
