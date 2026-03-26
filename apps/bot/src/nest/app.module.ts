import { Module } from "@nestjs/common";
import { BotModule } from "./bot.module";

@Module({
  imports: [BotModule],
})
export class AppModule {}
