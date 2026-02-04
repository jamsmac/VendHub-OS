/**
 * DTO for syncing permissions on a role (replace all permissions)
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class SyncPermissionsDto {
  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
    description: 'Permission IDs to set for the role (replaces existing)',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}
