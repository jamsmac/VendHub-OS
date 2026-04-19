/**
 * Loyalty Promo Code Controller
 * API endpoints для промокодов системы лояльности
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards";
import { Roles } from "../../../common/decorators/roles.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { User, UserRole } from "../../users/entities/user.entity";
import { LoyaltyPromoCodeService } from "../services/promo-code.service";
import {
  LoyaltyCreatePromoCodeDto,
  LoyaltyUpdatePromoCodeDto,
  ApplyPromoCodeDto,
  LoyaltyValidatePromoCodeDto as ValidatePromoCodeInputDto,
  LoyaltyQueryPromoCodesDto,
  PromoCodeStatsDto,
  ValidatePromoCodeResultDto,
  ApplyPromoCodeResultDto,
} from "../dto/promo-code.dto";
import { LoyaltyPromoCode } from "../entities/promo-code.entity";

@ApiTags("Loyalty - Promo Codes")
@ApiBearerAuth()
@Controller("loyalty/promo-codes")
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoyaltyPromoCodeController {
  constructor(private readonly promoCodeService: LoyaltyPromoCodeService) {}

  // ============================================================================
  // USER ENDPOINTS (any authenticated user)
  // ============================================================================

  @Post("validate")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Validate a promo code",
    description: `
Check if a promo code is valid for the current user without applying it.

**Checks:**
- Code exists and is active
- Not expired
- Usage limits not exceeded (total and per-user)
- Minimum order amount met (if provided)
    `,
  })
  @ApiResponse({ status: 200, type: ValidatePromoCodeResultDto })
  async validate(
    @CurrentUser() user: User,
    @Body(ValidationPipe) dto: ValidatePromoCodeInputDto,
  ): Promise<ValidatePromoCodeResultDto> {
    return this.promoCodeService.validateCode(
      dto.code,
      user.id,
      user.organizationId,
      dto.orderAmount,
    );
  }

  @Post("apply")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Apply a promo code",
    description: `
Apply a promo code and receive the benefit.

**Promo code types:**
- \`POINTS_BONUS\` — Awards bonus loyalty points
- \`DISCOUNT_PERCENT\` — Percentage discount on order
- \`DISCOUNT_FIXED\` — Fixed amount discount in UZS
- \`FREE_ITEM\` — Free item entitlement
    `,
  })
  @ApiResponse({ status: 200, type: ApplyPromoCodeResultDto })
  @ApiResponse({ status: 400, description: "Invalid or expired promo code" })
  async apply(
    @CurrentUser() user: User,
    @Body(ValidationPipe) dto: ApplyPromoCodeDto,
  ): Promise<ApplyPromoCodeResultDto> {
    return this.promoCodeService.applyCode(
      dto.code,
      user.id,
      user.organizationId,
      dto.orderId,
      dto.orderAmount,
    );
  }

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: "List all promo codes (Admin)",
    description: "Get all loyalty promo codes with pagination and filters.",
  })
  @ApiResponse({ status: 200, description: "Paginated list of promo codes" })
  async findAll(
    @CurrentUser() user: User,
    @Query(ValidationPipe) query: LoyaltyQueryPromoCodesDto,
  ) {
    return this.promoCodeService.findAll(user.organizationId, query);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a promo code (Admin)",
    description: "Create a new loyalty promo code.",
  })
  @ApiResponse({
    status: 201,
    description: "Promo code created",
    type: LoyaltyPromoCode,
  })
  @ApiResponse({ status: 409, description: "Code already exists" })
  async create(
    @CurrentUser() user: User,
    @Body(ValidationPipe) dto: LoyaltyCreatePromoCodeDto,
  ): Promise<LoyaltyPromoCode> {
    return this.promoCodeService.create(dto, user.organizationId);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: "Update a promo code (Admin)",
    description: "Update an existing loyalty promo code.",
  })
  @ApiParam({ name: "id", description: "Promo code UUID" })
  @ApiResponse({ status: 200, type: LoyaltyPromoCode })
  @ApiResponse({ status: 404, description: "Promo code not found" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body(ValidationPipe) dto: LoyaltyUpdatePromoCodeDto,
  ): Promise<LoyaltyPromoCode> {
    return this.promoCodeService.update(id, dto, user.organizationId);
  }

  @Delete(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a promo code (Admin)",
    description: "Soft-delete a loyalty promo code.",
  })
  @ApiParam({ name: "id", description: "Promo code UUID" })
  @ApiResponse({ status: 204, description: "Promo code deleted" })
  @ApiResponse({ status: 404, description: "Promo code not found" })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.promoCodeService.remove(id, user.organizationId);
  }

  @Get(":id/stats")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: "Get promo code usage stats (Admin)",
    description: "Get usage statistics for a specific loyalty promo code.",
  })
  @ApiParam({ name: "id", description: "Promo code UUID" })
  @ApiResponse({ status: 200, type: PromoCodeStatsDto })
  @ApiResponse({ status: 404, description: "Promo code not found" })
  async getStats(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<PromoCodeStatsDto> {
    return this.promoCodeService.getStats(id, user.organizationId);
  }
}
