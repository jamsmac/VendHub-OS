/**
 * Referral Controller
 * API endpoints for the VendHub referral program
 */

import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards";
import { Roles } from "../../../common/decorators";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { User, UserRole } from "../../users/entities/user.entity";
import { ReferralService } from "../services/referral.service";
import {
  ApplyReferralDto,
  MyReferralCodeDto,
  ApplyReferralResultDto,
  ReferralStatsDto,
  AdminReferralStatsDto,
} from "../dto/referral.dto";

@ApiTags("Loyalty - Referrals")
@ApiBearerAuth()
@Controller("loyalty/referrals")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  @Get("my-code")
  @Roles(
    "owner",
    "admin",
    "manager",
    "operator",
    "warehouse",
    "accountant",
    "viewer",
  )
  @ApiOperation({
    summary: "Get my referral code",
    description: `
Get the current user's referral code. If no code exists, a new one is generated automatically.

**Returns:**
- 8-character alphanumeric referral code
- Total completed referrals count
- Pending referrals count
    `,
  })
  @ApiResponse({ status: 200, type: MyReferralCodeDto })
  async getMyCode(@CurrentUser() user: User): Promise<MyReferralCodeDto> {
    return this.referralService.getMyCode(user.id, user.organizationId);
  }

  @Post("apply")
  @Roles(
    "owner",
    "admin",
    "manager",
    "operator",
    "warehouse",
    "accountant",
    "viewer",
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Apply a referral code",
    description: `
Apply a referral code from another user.

**Rules:**
- You cannot use your own referral code
- You can only use one referral code (cannot be referred twice)
- The code must be valid and active (PENDING status)
- After applying, complete your first order to receive 100 bonus points
- The referrer receives 200 bonus points when you complete your first order
    `,
  })
  @ApiResponse({ status: 200, type: ApplyReferralResultDto })
  @ApiResponse({
    status: 400,
    description: "Self-referral, already referred, or invalid code",
  })
  @ApiResponse({ status: 404, description: "Referral code not found" })
  async applyReferral(
    @CurrentUser() user: User,
    @Body(ValidationPipe) dto: ApplyReferralDto,
  ): Promise<ApplyReferralResultDto> {
    return this.referralService.applyReferral(
      user.id,
      dto.code,
      user.organizationId,
    );
  }

  @Get("stats")
  @Roles(
    "owner",
    "admin",
    "manager",
    "operator",
    "warehouse",
    "accountant",
    "viewer",
  )
  @ApiOperation({
    summary: "Get my referral stats",
    description: `
Get the current user's referral statistics.

**Returns:**
- Total completed referrals
- Total pending referrals
- Total points earned from referrals
- Your referral code
    `,
  })
  @ApiResponse({ status: 200, type: ReferralStatsDto })
  async getStats(@CurrentUser() user: User): Promise<ReferralStatsDto> {
    return this.referralService.getStats(user.id, user.organizationId);
  }

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  @Get("admin/stats")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: "Get organization-wide referral stats (Admin)",
    description: `
Get aggregated referral statistics for the entire organization.

**Includes:**
- Total, completed, pending, expired, and cancelled referral counts
- Total points awarded through the referral program
- Status breakdown
    `,
  })
  @ApiResponse({ status: 200, type: AdminReferralStatsDto })
  async getAdminStats(
    @CurrentUser() user: User,
  ): Promise<AdminReferralStatsDto> {
    return this.referralService.getAdminStats(user.organizationId);
  }
}
