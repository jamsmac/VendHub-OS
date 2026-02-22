import { IsString, IsOptional, IsUUID, Length } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class Complete2FALoginDto {
  @ApiProperty({ description: "User ID from initial login step" })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: "TOTP code from authenticator app" })
  @IsOptional()
  @IsString()
  totpCode?: string;

  @ApiPropertyOptional({ description: "Backup code" })
  @IsOptional()
  @IsString()
  backupCode?: string;
}

export class FirstLoginChangePasswordDto {
  @ApiProperty({ description: "User ID" })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: "Current temporary password" })
  @IsString()
  @Length(1, 255)
  currentPassword: string;

  @ApiProperty({ description: "New password" })
  @IsString()
  @Length(8, 128)
  newPassword: string;
}

export class ValidateResetTokenDto {
  @ApiProperty({ description: "Password reset token" })
  @IsString()
  @Length(1, 512)
  token: string;
}

export class Disable2FADto {
  @ApiProperty({ description: "Account password for confirmation" })
  @IsString()
  @Length(1, 255)
  password: string;
}
