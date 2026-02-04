/**
 * Client User DTOs
 * Validation and Swagger docs for client registration/updates
 */

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateClientUserDto {
  @ApiPropertyOptional({
    description: 'Telegram user ID',
    example: '123456789',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  telegramId?: string;

  @ApiPropertyOptional({
    description: 'Phone number in international format',
    example: '+998901234567',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: 'First name',
    example: 'Aziz',
  })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Karimov',
  })
  @IsString()
  @IsOptional()
  @Length(1, 100)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Username (Telegram or app)',
    example: 'aziz_k',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  username?: string;

  @ApiPropertyOptional({
    description: 'Preferred language code',
    example: 'ru',
    default: 'ru',
  })
  @IsString()
  @IsOptional()
  @MaxLength(5)
  language?: string;
}

export class UpdateClientUserDto extends PartialType(CreateClientUserDto) {}
