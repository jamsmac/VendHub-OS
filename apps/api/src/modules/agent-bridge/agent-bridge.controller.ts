import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Roles, UserRole } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { AgentBridgeService } from "./agent-bridge.service";
import {
  RegisterSessionDto,
  UpdateSessionDto,
  ReportProgressDto,
} from "./dto/agent-bridge.dto";
import { AgentSessionStatus } from "./entities/agent-session.entity";
import { AgentApiKeyGuard } from "./guards/agent-api-key.guard";

@ApiTags("Agent Bridge")
@Controller("agent-bridge")
export class AgentBridgeController {
  constructor(private readonly agentBridgeService: AgentBridgeService) {}

  // ============================================
  // Agent-facing endpoints (@Public)
  // ============================================

  @Post("sessions")
  @Public()
  @UseGuards(AgentApiKeyGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register or re-register an agent session" })
  async registerSession(@Body() dto: RegisterSessionDto) {
    return this.agentBridgeService.registerSession(dto);
  }

  @Patch("sessions/:sessionId")
  @Public()
  @UseGuards(AgentApiKeyGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "Update session state (agent reports)" })
  @ApiParam({ name: "sessionId", description: "External session ID" })
  async updateSession(
    @Param("sessionId") sessionId: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.agentBridgeService.updateSession(sessionId, dto);
  }

  @Post("sessions/:sessionId/complete")
  @Public()
  @UseGuards(AgentApiKeyGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark session as completed" })
  @ApiParam({ name: "sessionId", description: "External session ID" })
  async completeSession(@Param("sessionId") sessionId: string) {
    return this.agentBridgeService.completeSession(sessionId);
  }

  @Post("sessions/:sessionId/heartbeat")
  @Public()
  @UseGuards(AgentApiKeyGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Heartbeat to keep session active" })
  @ApiParam({ name: "sessionId", description: "External session ID" })
  async heartbeat(@Param("sessionId") sessionId: string) {
    await this.agentBridgeService.heartbeat(sessionId);
  }

  @Post("progress")
  @Public()
  @UseGuards(AgentApiKeyGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Report progress from an agent" })
  async reportProgress(@Body() dto: ReportProgressDto) {
    return this.agentBridgeService.reportProgress(dto);
  }

  // ============================================
  // Admin-facing endpoints (auth required)
  // ============================================

  @Get("sessions")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all sessions (paginated)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, enum: AgentSessionStatus })
  async getAllSessions(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: AgentSessionStatus,
  ) {
    return this.agentBridgeService.getAllSessions(
      page || 1,
      limit || 20,
      status,
    );
  }

  @Get("sessions/active")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List currently active sessions" })
  async getActiveSessions() {
    return this.agentBridgeService.getActiveSessions();
  }

  @Get("sessions/:sessionId")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get session details with progress" })
  @ApiParam({ name: "sessionId", description: "External session ID" })
  async getSession(@Param("sessionId") sessionId: string) {
    return this.agentBridgeService.getSession(sessionId);
  }

  @Delete("sessions/:sessionId")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft-delete a session" })
  @ApiParam({ name: "sessionId", description: "External session ID" })
  async deleteSession(@Param("sessionId") sessionId: string) {
    await this.agentBridgeService.deleteSession(sessionId);
  }

  @Get("sessions/:sessionId/progress")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get progress history for a session" })
  @ApiParam({ name: "sessionId", description: "External session ID" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getSessionProgress(
    @Param("sessionId") sessionId: string,
    @Query("limit") limit?: number,
  ) {
    return this.agentBridgeService.getSessionProgress(sessionId, limit || 50);
  }

  @Get("progress/recent")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get recent progress across all sessions" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getRecentProgress(@Query("limit") limit?: number) {
    return this.agentBridgeService.getRecentProgress(limit || 20);
  }

  @Get("statistics")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get agent session statistics" })
  async getStatistics() {
    return this.agentBridgeService.getStatistics();
  }
}
