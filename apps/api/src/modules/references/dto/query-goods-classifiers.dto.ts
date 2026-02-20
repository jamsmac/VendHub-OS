import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { QueryReferencesDto } from './query-references.dto';

/**
 * Query DTO for goods classifiers with MXIK-specific filters.
 */
export class QueryGoodsClassifiersDto extends QueryReferencesDto {
  @ApiPropertyOptional({
    description: 'Filter by group code',
    example: '108',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  group_code?: string;

  @ApiPropertyOptional({
    description: 'Filter by parent MXIK code (hierarchy navigation)',
    example: '10820001000000000',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  parent_code?: string;

  @ApiPropertyOptional({
    description: 'Filter by hierarchy level (1-5)',
    example: 3,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5)
  level?: number;
}
