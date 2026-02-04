import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@vendhub.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: '123456', description: 'TOTP code if 2FA enabled' })
  @IsOptional()
  @IsString()
  totpCode?: string;

  @ApiPropertyOptional({ example: 'ABCD-EFGH', description: 'Backup code if 2FA enabled' })
  @IsOptional()
  @IsString()
  backupCode?: string;
}
