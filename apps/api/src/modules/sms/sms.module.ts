/**
 * SMS Module
 * SMS sending via Uzbekistan providers: Eskiz and PlayMobile
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SmsService } from "./sms.service";

@Module({
  imports: [ConfigModule],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
