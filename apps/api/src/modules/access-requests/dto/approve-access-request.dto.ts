import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  MinLength,
  Length,
} from "class-validator";
import { UserRole } from "../../../common/enums";

export class ApproveAccessRequestDto {
  @ApiProperty({ enum: UserRole, example: UserRole.OPERATOR })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ example: "user@vendhub.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "securePassword123" })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: "Approved for field operations" })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

export class RejectAccessRequestDto {
  @ApiProperty({ example: "Insufficient information provided" })
  @IsString()
  @Length(1, 1000)
  rejectionReason: string;
}
