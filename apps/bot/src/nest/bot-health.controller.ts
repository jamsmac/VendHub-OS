import { Controller, Get } from "@nestjs/common";
import { BotService } from "./bot.service";

@Controller("health")
export class BotHealthController {
  constructor(private readonly botService: BotService) {}

  @Get()
  health() {
    return {
      status: this.botService.isHealthy() ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      service: "vendhub-bot",
    };
  }
}
