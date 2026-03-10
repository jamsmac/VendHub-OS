import {
  IsString,
  IsOptional,
  Length,
  IsEmail,
  MinLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterWithInviteDto {
  @ApiProperty({ description: "Invite code" })
  @IsString()
  @Length(12, 24)
  inviteCode: string;

  @ApiProperty({
    description: "Telegram initData from Login Widget or Mini App",
  })
  @IsOptional()
  @IsString()
  telegramData?: string;

  @ApiProperty({ description: "First name" })
  @IsString()
  @Length(1, 100)
  firstName: string;

  @ApiProperty({ description: "Last name" })
  @IsString()
  @Length(1, 100)
  lastName: string;

  @ApiProperty({ description: "Email (required if no Telegram auth)" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: "Password (required if no Telegram auth)" })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
