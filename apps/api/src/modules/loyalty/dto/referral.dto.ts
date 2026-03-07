/**
 * Referral DTOs
 * Data Transfer Objects for the referral program
 */

import { IsString, Length, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { ReferralStatus } from "../entities/referral.entity";

// ============================================================================
// REQUEST DTOs
// ============================================================================

/**
 * Apply a referral code
 */
export class ApplyReferralDto {
  @ApiProperty({
    description: "Referral code to apply (8-character alphanumeric)",
    example: "VH3K9M2X",
    minLength: 8,
    maxLength: 8,
  })
  @IsString()
  @Length(8, 8, { message: "Referral code must be exactly 8 characters" })
  @Matches(/^[A-Z0-9]+$/, {
    message: "Referral code must contain only uppercase letters and digits",
  })
  code: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

/**
 * User's referral code response
 */
export class MyReferralCodeDto {
  @ApiProperty({
    description: "Your referral code",
    example: "VH3K9M2X",
  })
  code: string;

  @ApiProperty({
    description: "Total referrals made (completed)",
    example: 5,
  })
  totalReferrals: number;

  @ApiProperty({
    description:
      "Pending referrals (code applied but first order not yet placed)",
    example: 2,
  })
  pendingReferrals: number;
}

/**
 * Result of applying a referral code
 */
export class ApplyReferralResultDto {
  @ApiProperty({
    description: "Whether the referral was successfully applied",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: "Message to the user",
    example:
      "Referral code applied successfully! Complete your first order to receive 100 bonus points.",
  })
  message: string;
}

/**
 * User referral stats
 */
export class ReferralStatsDto {
  @ApiProperty({
    description: "Total completed referrals",
    example: 5,
  })
  totalCompleted: number;

  @ApiProperty({
    description: "Total pending referrals",
    example: 2,
  })
  totalPending: number;

  @ApiProperty({
    description: "Total points earned from referrals",
    example: 1000,
  })
  totalPointsEarned: number;

  @ApiProperty({
    description: "Your referral code",
    example: "VH3K9M2X",
  })
  referralCode: string;
}

/**
 * Admin org-wide referral stats
 */
export class AdminReferralStatsDto {
  @ApiProperty({
    description: "Total referrals in the organization",
    example: 150,
  })
  totalReferrals: number;

  @ApiProperty({
    description: "Completed referrals",
    example: 100,
  })
  completedReferrals: number;

  @ApiProperty({
    description: "Pending referrals",
    example: 30,
  })
  pendingReferrals: number;

  @ApiProperty({
    description: "Expired referrals",
    example: 15,
  })
  expiredReferrals: number;

  @ApiProperty({
    description: "Cancelled referrals",
    example: 5,
  })
  cancelledReferrals: number;

  @ApiProperty({
    description: "Total points awarded for referrals",
    example: 30000,
  })
  totalPointsAwarded: number;

  @ApiProperty({
    description: "Status breakdown",
  })
  statusBreakdown: {
    status: ReferralStatus;
    count: number;
  }[];
}
