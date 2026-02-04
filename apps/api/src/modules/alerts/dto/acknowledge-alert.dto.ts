/**
 * Acknowledge / Resolve Alert DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
} from 'class-validator';

// ============================================================================
// ACKNOWLEDGE ALERT DTO
// ============================================================================

export class AcknowledgeAlertDto {
  @ApiPropertyOptional({ description: 'Acknowledgement message' })
  @IsString()
  @IsOptional()
  message?: string;
}

// ============================================================================
// RESOLVE ALERT DTO
// ============================================================================

export class ResolveAlertDto {
  @ApiPropertyOptional({ description: 'Resolution message' })
  @IsString()
  @IsOptional()
  message?: string;
}

// ============================================================================
// DISMISS ALERT DTO
// ============================================================================

export class DismissAlertDto {
  @ApiPropertyOptional({ description: 'Dismissal reason' })
  @IsString()
  @IsOptional()
  reason?: string;
}
