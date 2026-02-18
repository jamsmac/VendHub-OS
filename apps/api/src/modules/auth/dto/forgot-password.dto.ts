/**
 * DTO for password reset request
 */

import { IsEmail } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ForgotPasswordDto {
  @ApiProperty({
    example: "user@vendhub.com",
    description: "Email address associated with the account",
  })
  @IsEmail()
  email: string;
}
