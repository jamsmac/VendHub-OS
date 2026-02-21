import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsEnum, Length } from "class-validator";
import { AccessRequestSource } from "../../telegram-bot/entities/access-request.entity";

export class CreateAccessRequestDto {
  @ApiProperty({ example: "123456789", description: "Telegram user ID" })
  @IsString()
  @Length(1, 100)
  telegramId: string;

  @ApiPropertyOptional({ example: "john_doe" })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  telegramUsername?: string;

  @ApiPropertyOptional({ example: "John" })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  telegramFirstName?: string;

  @ApiPropertyOptional({ example: "Doe" })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  telegramLastName?: string;

  @ApiPropertyOptional({
    enum: AccessRequestSource,
    default: AccessRequestSource.TELEGRAM,
  })
  @IsOptional()
  @IsEnum(AccessRequestSource)
  source?: AccessRequestSource;

  @ApiPropertyOptional({ example: "I need access to manage machines" })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}
