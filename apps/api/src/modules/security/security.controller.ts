import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/decorators/roles.decorator';
import { SecurityEventService } from './services/security-event.service';
import { SecurityEventType, SecuritySeverity } from './entities/security-event.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('security')
@Controller('security')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SecurityController {
  constructor(
    private readonly securityEventService: SecurityEventService,
  ) {}

  @Get('events')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List security events' })
  @ApiResponse({ status: 200, description: 'Security events list' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'eventType', required: false, enum: SecurityEventType })
  @ApiQuery({ name: 'severity', required: false, enum: SecuritySeverity })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('organizationId') organizationId?: string,
    @Query('userId') userId?: string,
    @Query('eventType') eventType?: SecurityEventType,
    @Query('severity') severity?: SecuritySeverity,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.securityEventService.findAll({
      organizationId,
      userId,
      eventType,
      severity,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('events/user/:userId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get security events for a user' })
  @ApiResponse({ status: 200, description: 'User security events' })
  async findByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.securityEventService.findByUser(userId);
  }

  @Get('events/unresolved/count')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get count of unresolved security events' })
  @ApiResponse({ status: 200, description: 'Unresolved count' })
  async getUnresolvedCount(@Query('organizationId') organizationId?: string) {
    const count = await this.securityEventService.getUnresolvedCount(organizationId);
    return { count };
  }

  @Post('events/:id/resolve')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Resolve a security event' })
  @ApiResponse({ status: 200, description: 'Event resolved' })
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body('notes') notes: string,
  ) {
    return this.securityEventService.resolve(id, user.id, notes);
  }
}
