import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class RefreshTokenDto {
  @ApiProperty({
    description: "JWT refresh token (optional if sent via httpOnly cookie)",
    required: false,
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
