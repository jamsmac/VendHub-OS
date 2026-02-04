import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { QueryReferencesDto } from './query-references.dto';

/**
 * Query DTO for IKPU codes with tax-specific filters.
 */
export class QueryIkpuCodesDto extends QueryReferencesDto {
  @ApiPropertyOptional({
    description: 'Filter by related MXIK code',
    example: '10820001001000000',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  mxik_code?: string;

  @ApiPropertyOptional({
    description: 'Filter by mandatory marking requirement',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  is_marked?: boolean;
}
