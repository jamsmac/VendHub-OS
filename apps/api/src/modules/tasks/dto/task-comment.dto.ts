import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskCommentDto {
  @ApiProperty({
    example: 'Автомат требует промывки перед пополнением',
    description: 'Comment text',
  })
  @IsString()
  @IsNotEmpty()
  comment: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Is internal (admin-only visibility)',
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional({ description: 'Attachment URLs' })
  @IsOptional()
  @IsArray()
  attachments?: string[];
}
