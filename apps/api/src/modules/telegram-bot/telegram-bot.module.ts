/**
 * Telegram Bot Module for VendHub OS
 *
 * Contains two bots:
 * 1. Staff Bot - For operators, managers, warehouse staff (tasks, machines, reports)
 * 2. Customer Bot - For customers (catalog, bonuses, orders, complaints)
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

// --- Bot Services ---
import { TelegramBotService } from "./telegram-bot.service";
import { TelegramCustomerBotService } from "./telegram-customer-bot.service";
import { TelegramBotController } from "./telegram-bot.controller";

// --- Staff Bot Sub-Services ---
import { BotHandlersService } from "./services/bot-handlers.service";
import { BotTaskOpsService } from "./services/bot-task-ops.service";
import { BotMachineOpsService } from "./services/bot-machine-ops.service";
import { BotMenuService } from "./services/bot-menu.service";
import { BotNotificationsService } from "./services/bot-notifications.service";
import { BotAdminService } from "./services/bot-admin.service";

// --- Customer Bot Sub-Services ---
import { CustomerHandlersService } from "./services/customer-handlers.service";
import { CustomerMenuService } from "./services/customer-menu.service";
import { CustomerCatalogService } from "./services/customer-catalog.service";
import { CustomerLoyaltyService } from "./services/customer-loyalty.service";
import { CustomerOrdersService } from "./services/customer-orders.service";
import { CustomerComplaintsService } from "./services/customer-complaints.service";

// --- Staff Bot Entities ---
import { User } from "../users/entities/user.entity";
import { Task } from "../tasks/entities/task.entity";
import { Machine } from "../machines/entities/machine.entity";
import { Transaction } from "../transactions/entities/transaction.entity";
import { Complaint } from "../complaints/entities/complaint.entity";

// --- Telegram Entities ---
import { TelegramUser } from "./entities/telegram-user.entity";
import { TelegramMessageLog } from "./entities/telegram-message-log.entity";
import { TelegramSettings } from "./entities/telegram-settings.entity";
import { TelegramBotAnalytics } from "./entities/telegram-bot-analytics.entity";
import { AccessRequest } from "./entities/access-request.entity";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      // Staff bot entities
      User,
      Task,
      Machine,
      Transaction,
      Complaint,
      // Telegram entities
      TelegramUser,
      TelegramMessageLog,
      TelegramSettings,
      TelegramBotAnalytics,
      AccessRequest,
    ]),
  ],
  controllers: [TelegramBotController],
  providers: [
    // Staff bot
    TelegramBotService,
    BotHandlersService,
    BotTaskOpsService,
    BotMachineOpsService,
    BotMenuService,
    BotNotificationsService,
    BotAdminService,
    // Customer bot
    TelegramCustomerBotService,
    CustomerHandlersService,
    CustomerMenuService,
    CustomerCatalogService,
    CustomerLoyaltyService,
    CustomerOrdersService,
    CustomerComplaintsService,
  ],
  exports: [TelegramBotService, TelegramCustomerBotService],
})
export class TelegramBotModule {}
