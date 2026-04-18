import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "crypto";
import { Public } from "../../common/decorators/public.decorator";
import { TelegramBotService } from "./telegram-bot.service";
import { TelegramCustomerBotService } from "./telegram-customer-bot.service";

@ApiTags("Telegram Webhooks")
@Controller("telegram/webhook")
export class TelegramWebhookController {
  constructor(
    private readonly configService: ConfigService,
    private readonly staffBot: TelegramBotService,
    private readonly customerBot: TelegramCustomerBotService,
  ) {}

  @Public()
  @Post("staff")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: "Staff bot webhook (Telegram → API)" })
  async staffUpdate(
    @Headers("x-telegram-bot-api-secret-token") secretHeader: string,
    @Body() update: unknown,
  ) {
    this.verifySecret(secretHeader, "TELEGRAM_WEBHOOK_SECRET");
    await this.staffBot.handleUpdate(update);
    return { ok: true };
  }

  @Public()
  @Post("customer")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: "Customer bot webhook (Telegram → API)" })
  async customerUpdate(
    @Headers("x-telegram-bot-api-secret-token") secretHeader: string,
    @Body() update: unknown,
  ) {
    this.verifySecret(secretHeader, "TELEGRAM_CUSTOMER_WEBHOOK_SECRET");
    await this.customerBot.handleUpdate(update);
    return { ok: true };
  }

  private verifySecret(received: string | undefined, envKey: string): void {
    const expected = this.configService.get<string>(envKey);
    if (!expected) {
      throw new UnauthorizedException("Webhook secret not configured");
    }
    if (!received) {
      throw new UnauthorizedException("Missing webhook secret header");
    }
    const a = Buffer.from(received);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException("Invalid webhook secret");
    }
  }
}
