import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
} from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentUserId,
  CurrentOrganizationId,
} from "../../common/decorators/current-user.decorator";
import { PayoutRequestsService } from "./payout-requests.service";
import { CreatePayoutRequestDto } from "./dto/create-payout-request.dto";
import { ReviewPayoutRequestDto } from "./dto/review-payout-request.dto";
import { QueryPayoutRequestsDto } from "./dto/query-payout-requests.dto";

@ApiTags("Payout Requests")
@ApiBearerAuth()
@Controller("payout-requests")
export class PayoutRequestsController {
  constructor(private readonly service: PayoutRequestsService) {}

  @ApiOperation({ summary: "List payout requests with pagination" })
  @ApiOkResponse({ description: "Payout requests retrieved" })
  @Get()
  @Roles("owner", "admin", "manager", "accountant")
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryPayoutRequestsDto,
  ) {
    return this.service.findAll(organizationId, query);
  }

  @ApiOperation({ summary: "Get payout request stats by status" })
  @ApiOkResponse({ description: "Payout stats retrieved" })
  @Get("stats")
  @Roles("owner", "admin", "manager", "accountant")
  getStats(@CurrentOrganizationId() organizationId: string) {
    return this.service.getStats(organizationId);
  }

  @ApiOperation({ summary: "Get a single payout request by ID" })
  @ApiOkResponse({ description: "Payout request retrieved" })
  @Get(":id")
  @Roles("owner", "admin", "manager", "accountant", "operator")
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.findById(id, organizationId);
  }

  @ApiOperation({ summary: "Create a new payout request" })
  @ApiCreatedResponse({ description: "Payout request created" })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles("owner", "admin", "manager", "operator")
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreatePayoutRequestDto,
  ) {
    return this.service.create(organizationId, userId, dto);
  }

  @ApiOperation({ summary: "Approve or reject a payout request" })
  @ApiOkResponse({ description: "Payout request reviewed" })
  @Patch(":id/review")
  @Roles("owner", "admin")
  review(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReviewPayoutRequestDto,
  ) {
    return this.service.review(id, organizationId, userId, dto);
  }

  @ApiOperation({ summary: "Cancel a payout request" })
  @ApiOkResponse({ description: "Payout request cancelled" })
  @Patch(":id/cancel")
  @Roles("owner", "admin", "manager", "operator")
  cancel(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.cancel(id, organizationId, userId);
  }

  @ApiOperation({ summary: "Delete a payout request (soft delete)" })
  @ApiNoContentResponse({ description: "Payout request deleted" })
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("owner", "admin")
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(id, organizationId);
  }
}
