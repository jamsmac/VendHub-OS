/**
 * Cash Finance Controller
 * Endpoints for tracking cash-on-hand (received cash vs bank deposits)
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
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
import { CashFinanceService } from "./cash-finance.service";
import { CreateDepositDto } from "./dto/create-deposit.dto";
import {
  CurrentUserId,
  CurrentOrganizationId,
} from "../../common/decorators/current-user.decorator";

// Roles: MANAGER, ADMIN
@ApiTags("Cash Finance")
@ApiBearerAuth()
@Controller("finance")
export class CashFinanceController {
  constructor(private readonly cashFinanceService: CashFinanceService) {}

  @ApiOperation({ summary: "Get current cash balance for the organization" })
  @ApiOkResponse({ description: "Cash balance retrieved successfully" })
  @Get("balance")
  getBalance(@CurrentOrganizationId() organizationId: string) {
    return this.cashFinanceService.getBalance(organizationId);
  }

  @ApiOperation({ summary: "List all cash deposits for the organization" })
  @ApiOkResponse({ description: "Cash deposits list retrieved successfully" })
  @Get("deposits")
  findAllDeposits(@CurrentOrganizationId() organizationId: string) {
    return this.cashFinanceService.findAllDeposits(organizationId);
  }

  @ApiOperation({ summary: "Create a new cash deposit record" })
  @ApiCreatedResponse({ description: "Cash deposit created successfully" })
  @Post("deposits")
  @HttpCode(HttpStatus.CREATED)
  createDeposit(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateDepositDto,
  ) {
    return this.cashFinanceService.createDeposit(organizationId, userId, dto);
  }

  @ApiOperation({ summary: "Delete a cash deposit record" })
  @ApiNoContentResponse({ description: "Cash deposit deleted successfully" })
  @Delete("deposits/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDeposit(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.cashFinanceService.removeDeposit(id, organizationId);
  }
}
