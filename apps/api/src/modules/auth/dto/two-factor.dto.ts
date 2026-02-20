import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class Enable2FADto {
  @ApiProperty({ description: 'TOTP secret key' })
  secret: string;

  @ApiProperty({ description: 'OTP Auth URL for QR code' })
  otpAuthUrl: string;

  @ApiProperty({ description: 'QR code image URL' })
  qrCode: string;
}

export class Verify2FADto {
  @ApiProperty({ example: '123456', description: '6-digit TOTP code' })
  @IsString()
  @Length(6, 6)
  code: string;
}
