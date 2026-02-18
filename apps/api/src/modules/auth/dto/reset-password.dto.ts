/**
 * DTO for password reset with token
 */

import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ResetPasswordDto {
  @ApiProperty({
    example: "eyJhbGciOiJIUzI1NiIs...",
    description: "Password reset token received via email",
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: "NewSecurePassword123!",
    description: "New password (minimum 8 characters)",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}
