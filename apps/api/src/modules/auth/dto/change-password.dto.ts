import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password', example: 'OldP@ss123' })
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @ApiProperty({ description: 'New password (min 8 characters)', example: 'NewP@ss456' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
