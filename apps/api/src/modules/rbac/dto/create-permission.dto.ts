/**
 * DTO for creating a new permission
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, Length } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'users:create', description: 'Permission name in resource:action format' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ example: 'users', description: 'Resource this permission applies to' })
  @IsString()
  @Length(1, 100)
  resource: string;

  @ApiProperty({ example: 'create', description: 'Action allowed on the resource' })
  @IsString()
  @Length(1, 50)
  action: string;

  @ApiPropertyOptional({ example: 'Allows creating new users', description: 'Permission description' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
