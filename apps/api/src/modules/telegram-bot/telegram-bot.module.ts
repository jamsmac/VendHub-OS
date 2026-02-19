/**
 * Telegram Bot Module for VendHub OS
 *
 * Contains two bots:
 * 1. Staff Bot - For operators, managers, warehouse staff
 * 2. Customer Bot - For customers (complaints, refunds, status)
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TelegramBotService } from "./telegram-bot.service";
import { TelegramCustomerBotService } from "./telegram-customer-bot.service";
import { TelegramBotController } from "./telegram-bot.controller";
import { User } from "../users/entities/user.entity";
import { Task } from "../tasks/entities/task.entity";
import { Machine } from "../machines/entities/machine.entity";
import { Transaction } from "../transactions/entities/transaction.entity";
import { Complaint } from "../complaints/entities/complaint.entity";
import { TelegramUser } from "./entities/telegram-user.entity";
import { TelegramMessageLog } from "./entities/telegram-message-log.entity";
import { TelegramSettings } from "./entities/telegram-settings.entity";
import { TelegramBotAnalytics } from "./entities/telegram-bot-analytics.entity";
import { BotHandlersService } from "./services/bot-handlers.service";
import { BotTaskOpsService } from "./services/bot-task-ops.service";
import { BotMachineOpsService } from "./services/bot-machine-ops.service";
import { BotMenuService } from "./services/bot-menu.service";
import { BotNotificationsService } from "./services/bot-notifications.service";
import { BotAdminService } from "./services/bot-admin.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      User,
      Task,
      Machine,
      Transaction,
      Complaint,
      TelegramUser,
      TelegramMessageLog,
      TelegramSettings,
      TelegramBotAnalytics,
    ]),
  ],
  controllers: [TelegramBotController],
  providers: [
    TelegramBotService,
    TelegramCustomerBotService,
    BotHandlersService,
    BotTaskOpsService,
    BotMachineOpsService,
    BotMenuService,
    BotNotificationsService,
    BotAdminService,
  ],
  exports: [TelegramBotService, TelegramCustomerBotService],
})
export class TelegramBotModule {}
