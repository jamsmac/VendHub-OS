/**
 * DTO for resolving a security event
 */

import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";

export class ResolveSecurityEventDto {
  @ApiProperty({
    description:
      "Resolution notes explaining how the security event was resolved",
    example: "Confirmed as false positive after reviewing access logs",
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  notes: string;
}
