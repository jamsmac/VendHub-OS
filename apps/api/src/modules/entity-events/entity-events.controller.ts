// @ts-nocheck -- Railway build cache workaround
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
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { EntityEventsService } from "./entity-events.service";
import { CreateEntityEventDto } from "./dto/create-entity-event.dto";
import { QueryEntityEventsDto } from "./dto/query-entity-events.dto";

interface AuthenticatedRequest {
  user: { id: string; organizationId: string };
}

@ApiTags("Entity Events")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("entity-events")
export class EntityEventsController {
  constructor(private readonly entityEventsService: EntityEventsService) {}

  @Post()
  @Roles("owner", "admin", "manager")
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
  @Roles("owner", "admin", "manager")
  @ApiOperation({ summary: "Query events with filters" })
  async query(
    @Query() dto: QueryEntityEventsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.entityEventsService.queryEvents(dto, req.user.organizationId);
  }

  @Get("entity/:entityId")
  @Roles("owner", "admin", "manager")
  @ApiOperation({ summary: "Get timeline for a specific entity" })
  async getEntityTimeline(
    @Param("entityId") entityId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.entityEventsService.getEntityTimeline(
      entityId,
      req!.user.organizationId,
      page,
      limit,
    );
  }

  @Get("entity/:entityId/recent")
  @Roles("owner", "admin", "manager")
  @ApiOperation({ summary: "Get last 10 events for mini-passport" })
  async getRecentEvents(
    @Param("entityId") entityId: string,
    @Query("count") count?: number,
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.entityEventsService.getRecentEvents(
      entityId,
      req!.user.organizationId,
      count || 10,
    );
  }
}
