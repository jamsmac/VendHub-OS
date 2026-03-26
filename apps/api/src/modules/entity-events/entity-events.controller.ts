import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { EntityEventsService } from "./entity-events.service";
import { CreateEntityEventDto } from "./dto/create-entity-event.dto";
import { QueryEntityEventsDto } from "./dto/query-entity-events.dto";

interface AuthenticatedRequest {
  user: { id: string; organizationId: string; role: string };
}

@ApiTags("Entity Events")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("entity-events")
export class EntityEventsController {
  constructor(private readonly entityEventsService: EntityEventsService) {}

  @Post()
  @ApiOperation({ summary: "Create a business event" })
  async create(
    @Body() dto: CreateEntityEventDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.entityEventsService.createEvent(
      dto,
      req.user.id,
      req.user.organizationId,
    );
  }

  @Get()
  @ApiOperation({ summary: "Query events with filters" })
  async query(
    @Query() dto: QueryEntityEventsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.entityEventsService.queryEvents(dto, req.user.organizationId);
  }

  @Get("entity/:entityId")
  @ApiOperation({ summary: "Get timeline for a specific entity" })
  async getEntityTimeline(
    @Param("entityId") entityId: string,
    @Request() req: AuthenticatedRequest,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.entityEventsService.getEntityTimeline(
      entityId,
      req.user.organizationId,
      page,
      limit,
    );
  }

  @Get("entity/:entityId/recent")
  @ApiOperation({ summary: "Get last 10 events for mini-passport" })
  async getRecentEvents(
    @Param("entityId") entityId: string,
    @Request() req: AuthenticatedRequest,
    @Query("count") count?: number,
  ) {
    return this.entityEventsService.getRecentEvents(
      entityId,
      req.user.organizationId,
      count || 10,
    );
  }
}
