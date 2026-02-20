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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { OperatorRatingsService } from "./operator-ratings.service";
import { CalculateRatingDto } from "./dto/calculate-rating.dto";
import { QueryRatingsDto, RatingSortBy } from "./dto/query-ratings.dto";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentOrganizationId,
  CurrentUser,
} from "../../common/decorators/current-user.decorator";
import { UserRole } from "../../common/enums";

@ApiTags("Operator Ratings")
@ApiBearerAuth()
@Controller("operator-ratings")
export class OperatorRatingsController {
  constructor(
    private readonly operatorRatingsService: OperatorRatingsService,
  ) {}

  // ============================================================================
  // CALCULATE
  // ============================================================================

  @Post("calculate")
  @ApiOperation({ summary: "Calculate and save operator rating for a period" })
  @ApiResponse({ status: 201, description: "Rating calculated and saved" })
  @ApiResponse({
    status: 409,
    description: "Rating already exists for this period",
  })
  @Roles("owner", "admin", "manager")
  @HttpCode(HttpStatus.CREATED)
  async calculateRating(
    @Body() dto: CalculateRatingDto,
    @CurrentOrganizationId() orgId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @CurrentUser() user: any,
  ) {
    const organizationId =
      user.role === UserRole.OWNER && dto.organizationId
        ? dto.organizationId
        : orgId;
    return this.operatorRatingsService.calculateRating(dto, organizationId);
  }

  @Post("recalculate/:id")
  @ApiOperation({ summary: "Recalculate an existing operator rating" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 201, description: "Rating recalculated" })
  @Roles("owner", "admin", "manager")
  @HttpCode(HttpStatus.CREATED)
  async recalculateRating(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CalculateRatingDto,
    @CurrentOrganizationId() orgId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @CurrentUser() user: any,
  ) {
    const organizationId =
      user.role === UserRole.OWNER && dto.organizationId
        ? dto.organizationId
        : orgId;
    return this.operatorRatingsService.recalculateRating(
      id,
      dto,
      organizationId,
    );
  }

  // ============================================================================
  // QUERY
  // ============================================================================

  @Get()
  @ApiOperation({ summary: "Query operator ratings with filters" })
  @ApiQuery({ name: "userId", required: false, type: String })
  @ApiQuery({ name: "periodStart", required: false, type: String })
  @ApiQuery({ name: "periodEnd", required: false, type: String })
  @ApiQuery({ name: "grade", required: false, type: String })
  @ApiQuery({ name: "minScore", required: false, type: Number })
  @ApiQuery({ name: "maxScore", required: false, type: Number })
  @ApiQuery({ name: "sortBy", required: false, enum: RatingSortBy })
  @ApiQuery({ name: "sortOrder", required: false, enum: ["ASC", "DESC"] })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @Roles("owner", "admin", "manager")
  async query(
    @Query() query: QueryRatingsDto,
    @CurrentOrganizationId() orgId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @CurrentUser() user: any,
  ) {
    const organizationId =
      user.role === UserRole.OWNER && query.organizationId
        ? query.organizationId
        : orgId;
    return this.operatorRatingsService.query(query, organizationId);
  }

  @Get("leaderboard")
  @ApiOperation({ summary: "Get top-N operators leaderboard for a period" })
  @ApiQuery({ name: "periodStart", required: true, type: String })
  @ApiQuery({ name: "periodEnd", required: true, type: String })
  @ApiQuery({ name: "top", required: false, type: Number })
  @Roles("owner", "admin", "manager")
  async getLeaderboard(
    @CurrentOrganizationId() orgId: string,
    @Query("periodStart") periodStart: string,
    @Query("periodEnd") periodEnd: string,
    @Query("top") top?: number,
  ) {
    return this.operatorRatingsService.getLeaderboard(
      orgId,
      periodStart,
      periodEnd,
      top || 10,
    );
  }

  @Get("summary")
  @ApiOperation({
    summary: "Get organization-wide rating summary for a period",
  })
  @ApiQuery({ name: "periodStart", required: true, type: String })
  @ApiQuery({ name: "periodEnd", required: true, type: String })
  @Roles("owner", "admin", "manager")
  async getOrganizationSummary(
    @CurrentOrganizationId() orgId: string,
    @Query("periodStart") periodStart: string,
    @Query("periodEnd") periodEnd: string,
  ) {
    return this.operatorRatingsService.getOrganizationSummary(
      orgId,
      periodStart,
      periodEnd,
    );
  }

  @Get("operator/:userId")
  @ApiOperation({ summary: "Get rating history for a specific operator" })
  @ApiParam({ name: "userId", type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @Roles("owner", "admin", "manager")
  async getOperatorHistory(
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentOrganizationId() orgId: string,
    @Query("limit") limit?: number,
  ) {
    return this.operatorRatingsService.getOperatorHistory(userId, orgId, limit);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a specific operator rating by ID" })
  @ApiParam({ name: "id", type: String })
  @Roles("owner", "admin", "manager")
  async findById(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.operatorRatingsService.findById(id, orgId);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft delete an operator rating" })
  @ApiParam({ name: "id", type: String })
  @Roles("owner", "admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    await this.operatorRatingsService.remove(id, orgId);
  }
}
