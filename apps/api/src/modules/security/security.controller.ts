import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../common/decorators/roles.decorator";
import { SecurityEventService } from "./services/security-event.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { FilterSecurityEventsDto } from "./dto/filter-security-events.dto";
import { ResolveSecurityEventDto } from "./dto/resolve-security-event.dto";

@ApiTags("security")
@Controller("security")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SecurityController {
  constructor(private readonly securityEventService: SecurityEventService) {}

  @Get("events")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "List security events" })
  @ApiResponse({ status: 200, description: "Security events list" })
  async findAll(
    @Query() filterDto: FilterSecurityEventsDto,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @CurrentUser() user: any,
  ) {
    // Multi-tenant isolation: only owner can query across organizations
    const organizationId =
      user.role === UserRole.OWNER && filterDto.organization_id
        ? filterDto.organization_id
        : user.organizationId;

    return this.securityEventService.findAll({
      organizationId,
      userId: filterDto.user_id,
      eventType: filterDto.event_type,
      severity: filterDto.severity,
      ipAddress: filterDto.ip_address,
      resource: filterDto.resource,
      resourceId: filterDto.resource_id,
      isResolved: filterDto.is_resolved,
      startDate: filterDto.start_date
        ? new Date(filterDto.start_date)
        : undefined,
      endDate: filterDto.end_date ? new Date(filterDto.end_date) : undefined,
      page: filterDto.page,
      limit: filterDto.limit,
    });
  }

  @Get("events/user/:userId")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Get security events for a user" })
  @ApiResponse({ status: 200, description: "User security events" })
  async findByUser(@Param("userId", ParseUUIDPipe) userId: string) {
    return this.securityEventService.findByUser(userId);
  }

  @Get("events/unresolved/count")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Get count of unresolved security events" })
  @ApiResponse({ status: 200, description: "Unresolved count" })
  async getUnresolvedCount(@Query("organizationId") organizationId?: string) {
    const count =
      await this.securityEventService.getUnresolvedCount(organizationId);
    return { count };
  }

  @Post("events/:id/resolve")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: "Resolve a security event" })
  @ApiResponse({ status: 200, description: "Event resolved" })
  async resolve(
    @Param("id", ParseUUIDPipe) id: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @CurrentUser() user: any,
    @Body() resolveDto: ResolveSecurityEventDto,
  ) {
    return this.securityEventService.resolve(id, user.id, resolveDto.notes);
  }
}
