import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsObject,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComponentRole } from '../entities/task.entity';

export class CreateTaskComponentDto {
  @ApiProperty({ description: 'Component ID' })
  @IsUUID()
  @IsNotEmpty()
  componentId: string;

  @ApiProperty({ enum: ComponentRole, description: 'Component role in the task' })
  @IsEnum(ComponentRole)
  role: ComponentRole;

  @ApiPropertyOptional({ description: 'Serial number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Notes (replacement reason, condition, etc.)' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateTaskPhotoDto {
  @ApiProperty({
    example: 'before',
    enum: ['before', 'after', 'during', 'other'],
    description: 'Photo category',
  })
  @IsString()
  @IsNotEmpty()
  category: 'before' | 'after' | 'during' | 'other';

  @ApiProperty({ description: 'File URL' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fileSize?: number;

  @ApiPropertyOptional({ description: 'MIME type' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Photo latitude' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Photo longitude' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Photo description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class AssignTaskDto {
  @ApiProperty({ description: 'User ID to assign the task to' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}

export class PostponeTaskDto {
  @ApiProperty({
    example: 'Автомат заблокирован, нет доступа',
    description: 'Postpone reason',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class RejectTaskDto {
  @ApiProperty({
    example: 'Пополнение не полное',
    description: 'Rejection reason',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
