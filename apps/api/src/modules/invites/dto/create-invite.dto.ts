import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "../../../common/enums";

export class CreateInviteDto {
  @ApiProperty({
    description: "Role to assign to invited user",
    enum: UserRole,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ description: "Hours until invite expires", default: 24 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720) // 30 days max
  expiresInHours?: number = 24;

  @ApiProperty({ description: "Maximum uses for this invite", default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxUses?: number = 1;

  @ApiProperty({ description: "Optional description", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
