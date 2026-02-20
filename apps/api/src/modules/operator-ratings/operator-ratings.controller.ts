/**
 * Operator Ratings Controller for VendHub OS
 * REST API for operator rating management
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { OperatorRatingsService } from './operator-ratings.service';
import { CalculateRatingDto } from './dto/calculate-rating.dto';
import { QueryRatingsDto, RatingSortBy } from './dto/query-ratings.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrganizationId } from '../../common/decorators/current-user.decorator';

@ApiTags('Operator Ratings')
@ApiBearerAuth()
@Controller('operator-ratings')
export class OperatorRatingsController {
  constructor(
    private readonly operatorRatingsService: OperatorRatingsService,
  ) {}

  // ============================================================================
  // CALCULATE
  // ============================================================================

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate and save operator rating for a period' })
  @ApiResponse({ status: 201, description: 'Rating calculated and saved' })
  @ApiResponse({ status: 409, description: 'Rating already exists for this period' })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async calculateRating(
    @Body() dto: CalculateRatingDto,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.operatorRatingsService.calculateRating(
      dto,
      dto.organization_id || orgId,
    );
  }

  @Post('recalculate/:id')
  @ApiOperation({ summary: 'Recalculate an existing operator rating' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 201, description: 'Rating recalculated' })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async recalculateRating(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CalculateRatingDto,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.operatorRatingsService.recalculateRating(
      id,
      dto,
      dto.organization_id || orgId,
    );
  }

  // ============================================================================
  // QUERY
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'Query operator ratings with filters' })
  @ApiQuery({ name: 'user_id', required: false, type: String })
  @ApiQuery({ name: 'period_start', required: false, type: String })
  @ApiQuery({ name: 'period_end', required: false, type: String })
  @ApiQuery({ name: 'grade', required: false, type: String })
  @ApiQuery({ name: 'min_score', required: false, type: Number })
  @ApiQuery({ name: 'max_score', required: false, type: Number })
  @ApiQuery({ name: 'sort_by', required: false, enum: RatingSortBy })
  @ApiQuery({ name: 'sort_order', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Roles('owner', 'admin', 'manager')
  async query(
    @Query() query: QueryRatingsDto,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.operatorRatingsService.query(
      query,
      query.organization_id || orgId,
    );
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get top-N operators leaderboard for a period' })
  @ApiQuery({ name: 'period_start', required: true, type: String })
  @ApiQuery({ name: 'period_end', required: true, type: String })
  @ApiQuery({ name: 'top', required: false, type: Number })
  @Roles('owner', 'admin', 'manager')
  async getLeaderboard(
    @CurrentOrganizationId() orgId: string,
    @Query('period_start') periodStart: string,
    @Query('period_end') periodEnd: string,
    @Query('top') top?: number,
  ) {
    return this.operatorRatingsService.getLeaderboard(
      orgId,
      periodStart,
      periodEnd,
      top || 10,
    );
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get organization-wide rating summary for a period' })
  @ApiQuery({ name: 'period_start', required: true, type: String })
  @ApiQuery({ name: 'period_end', required: true, type: String })
  @Roles('owner', 'admin', 'manager')
  async getOrganizationSummary(
    @CurrentOrganizationId() orgId: string,
    @Query('period_start') periodStart: string,
    @Query('period_end') periodEnd: string,
  ) {
    return this.operatorRatingsService.getOrganizationSummary(
      orgId,
      periodStart,
      periodEnd,
    );
  }

  @Get('operator/:userId')
  @ApiOperation({ summary: 'Get rating history for a specific operator' })
  @ApiParam({ name: 'userId', type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Roles('owner', 'admin', 'manager')
  async getOperatorHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentOrganizationId() orgId: string,
    @Query('limit') limit?: number,
  ) {
    return this.operatorRatingsService.getOperatorHistory(userId, orgId, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific operator rating by ID' })
  @ApiParam({ name: 'id', type: String })
  @Roles('owner', 'admin', 'manager')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.operatorRatingsService.findById(id, orgId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an operator rating' })
  @ApiParam({ name: 'id', type: String })
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    await this.operatorRatingsService.remove(id, orgId);
  }
}
