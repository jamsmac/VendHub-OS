/**
 * DTO for assigning a role to a user
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Role ID to assign to the user',
  })
  @IsUUID()
  roleId: string;
}
