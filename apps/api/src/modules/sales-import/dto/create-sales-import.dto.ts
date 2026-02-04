import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  Length,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ImportFileType, ImportStatus } from '../entities/sales-import.entity';

export class CreateSalesImportDto {
  @ApiProperty({ description: 'Original filename', example: 'sales_jan_2025.xlsx' })
  @IsString()
  @Length(1, 255)
  filename: string;

  @ApiProperty({ description: 'File type', enum: ImportFileType })
  @IsEnum(ImportFileType)
  fileType: ImportFileType;

  @ApiPropertyOptional({ description: 'Reference to file in storage', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  fileId?: string;
}

export class QuerySalesImportsDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: ImportStatus })
  @IsOptional()
  @IsEnum(ImportStatus)
  status?: ImportStatus;

  @ApiPropertyOptional({ description: 'Filter from date', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to date', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
