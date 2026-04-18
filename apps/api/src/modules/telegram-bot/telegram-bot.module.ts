/**
 * Telegram Bot Module for VendHub OS
 *
 * Contains two bots:
 * 1. Staff Bot - For operators, managers, warehouse staff (tasks, machines, routes, reports)
 * 2. Customer Bot - For customers (catalog, bonuses, orders, complaints, referrals, quests)
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

// --- Bot Services ---
import { TelegramBotService } from "./telegram-bot.service";
import { TelegramCustomerBotService } from "./telegram-customer-bot.service";
import { TelegramBotController } from "./telegram-bot.controller";
import { TelegramWebhookController } from "./telegram-webhook.controller";

// --- Staff Bot Sub-Services ---
import { BotHandlersService } from "./services/bot-handlers.service";
import { BotTaskOpsService } from "./services/bot-task-ops.service";
import { BotMachineOpsService } from "./services/bot-machine-ops.service";
import { BotMenuService } from "./services/bot-menu.service";
import { BotNotificationsService } from "./services/bot-notifications.service";
import { BotAdminService } from "./services/bot-admin.service";
import { BotRouteOpsService } from "./services/bot-route-ops.service";
import { BotStatsService } from "./services/bot-stats.service";

// --- Customer Bot Sub-Services ---
import { CustomerHandlersService } from "./services/customer-handlers.service";
import { CustomerMenuService } from "./services/customer-menu.service";
import { CustomerCatalogService } from "./services/customer-catalog.service";
import { CustomerLoyaltyService } from "./services/customer-loyalty.service";
import { CustomerOrdersService } from "./services/customer-orders.service";
import { CustomerComplaintsService } from "./services/customer-complaints.service";
import { CustomerLocationService } from "./services/customer-location.service";
import { CustomerCartService } from "./services/customer-cart.service";
import { CustomerEngagementService } from "./services/customer-engagement.service";
import { BotOrderService } from "./services/bot-order.service";

// --- Staff Bot Entities ---
import { User } from "../users/entities/user.entity";
import { Task } from "../tasks/entities/task.entity";
import { Machine } from "../machines/entities/machine.entity";
import { Transaction } from "../transactions/entities/transaction.entity";
import { Complaint } from "../complaints/entities/complaint.entity";
import { Route } from "../routes/entities/route.entity";
import { RoutePoint } from "../routes/entities/route-point.entity";
import { Vehicle } from "../vehicles/entities/vehicle.entity";

// --- Customer Bot Entities ---
import { ClientUser } from "../client/entities/client-user.entity";
import { ClientOrder } from "../client/entities/client-order.entity";
import { ClientLoyaltyAccount } from "../client/entities/client-loyalty-account.entity";
import { ClientLoyaltyLedger } from "../client/entities/client-loyalty-ledger.entity";
import { Product } from "../products/entities/product.entity";
import { Referral } from "../referrals/entities/referral.entity";
import { PromoCode } from "../promo-codes/entities/promo-code.entity";
import { Quest } from "../quests/entities/quest.entity";
import { UserQuest } from "../quests/entities/user-quest.entity";
import { Achievement } from "../achievements/entities/achievement.entity";
import { UserAchievement } from "../achievements/entities/user-achievement.entity";

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
      Route,
      RoutePoint,
      Vehicle,
      // Customer bot entities
      ClientUser,
      ClientOrder,
      ClientLoyaltyAccount,
      ClientLoyaltyLedger,
      Product,
      Referral,
      PromoCode,
      Quest,
      UserQuest,
      Achievement,
      UserAchievement,
      // Telegram entities
      TelegramUser,
      TelegramMessageLog,
      TelegramSettings,
      TelegramBotAnalytics,
      AccessRequest,
    ]),
  ],
  controllers: [TelegramBotController, TelegramWebhookController],
  providers: [
    // Staff bot
    TelegramBotService,
    BotHandlersService,
    BotTaskOpsService,
    BotMachineOpsService,
    BotMenuService,
    BotNotificationsService,
    BotAdminService,
    BotRouteOpsService,
    BotStatsService,
    // Customer bot
    TelegramCustomerBotService,
    CustomerHandlersService,
    CustomerMenuService,
    CustomerCatalogService,
    CustomerLoyaltyService,
    CustomerOrdersService,
    CustomerComplaintsService,
    CustomerLocationService,
    CustomerCartService,
    CustomerEngagementService,
    BotOrderService,
  ],
  exports: [TelegramBotService, TelegramCustomerBotService],
})
export class TelegramBotModule {}
