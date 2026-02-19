/**
 * Bot Handlers Service
 * Registers command, callback, and message handlers on the Telegraf bot instance.
 */

import { Injectable, Logger } from "@nestjs/common";
import { Telegraf } from "telegraf";
import { BotContext, TelegramSession, SessionState } from "./bot-types";
import { BotTaskOpsService } from "./bot-task-ops.service";
import { BotMachineOpsService } from "./bot-machine-ops.service";
import { BotMenuService } from "./bot-menu.service";

@Injectable()
export class BotHandlersService {
  private readonly logger = new Logger(BotHandlersService.name);
  private bot: Telegraf<BotContext>;
  private sessions: Map<number, TelegramSession>;

  constructor(
    private readonly taskOpsService: BotTaskOpsService,
    private readonly machineOpsService: BotMachineOpsService,
    private readonly menuService: BotMenuService,
  ) {}

  setBot(bot: Telegraf<BotContext>, sessions: Map<number, TelegramSession>) {
    this.bot = bot;
    this.sessions = sessions;
    this.registerCommands();
    this.registerCallbacks();
    this.registerMessages();
  }

  // ============================================================================
  // COMMAND HANDLERS
  // ============================================================================

  private registerCommands() {
    // /start - Registration and main menu
    this.bot.command("start", async (ctx) => {
      if (!ctx.user) {
        await this.menuService.handleUnregisteredUser(ctx);
        return;
      }
      await this.menuService.showMainMenu(ctx);
    });

    // /help - Help message
    this.bot.command("help", async (ctx) => {
      await ctx.reply(this.menuService.getHelpMessage(ctx.user?.role));
    });

    // /mytasks - My active tasks
    this.bot.command("mytasks", async (ctx) => {
      if (!ctx.user) {
        await ctx.reply("❌ Вы не зарегистрированы. Используйте /start");
        return;
      }
      await this.taskOpsService.showMyTasks(ctx);
    });

    // /task {id} - Task details
    this.bot.command("task", async (ctx) => {
      if (!ctx.user) return;

      const taskId = ctx.message.text.split(" ")[1];
      if (!taskId) {
        await ctx.reply("❌ Укажите ID задачи: /task {id}");
        return;
      }

      await this.taskOpsService.showTaskDetails(ctx, taskId);
    });

    // /machines - My machines
    this.bot.command("machines", async (ctx) => {
      if (!ctx.user) return;
      await this.machineOpsService.showMyMachines(ctx);
    });

    // /stats - My statistics
    this.bot.command("stats", async (ctx) => {
      if (!ctx.user) return;
      await this.menuService.showMyStats(ctx);
    });

    // /profile - My profile
    this.bot.command("profile", async (ctx) => {
      if (!ctx.user) return;
      await this.menuService.showProfile(ctx);
    });

    // /overdue - Overdue tasks
    this.bot.command("overdue", async (ctx) => {
      if (!ctx.user) return;
      await this.menuService.showOverdueTasks(ctx);
    });
  }

  // ============================================================================
  // CALLBACK HANDLERS
  // ============================================================================

  private registerCallbacks() {
    // Menu navigation
    this.bot.action("menu", async (ctx) => {
      await ctx.answerCbQuery();
      await this.menuService.showMainMenu(ctx);
    });

    this.bot.action("tasks", async (ctx) => {
      await ctx.answerCbQuery();
      await this.taskOpsService.showMyTasks(ctx);
    });

    this.bot.action("machines", async (ctx) => {
      await ctx.answerCbQuery();
      await this.machineOpsService.showMyMachines(ctx);
    });

    this.bot.action("profile", async (ctx) => {
      await ctx.answerCbQuery();
      await this.menuService.showProfile(ctx);
    });

    this.bot.action("help", async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(this.menuService.getHelpMessage(ctx.user?.role));
    });

    this.bot.action("reports", async (ctx) => {
      await ctx.answerCbQuery();
      await this.menuService.showReports(ctx);
    });

    this.bot.action("team", async (ctx) => {
      await ctx.answerCbQuery();
      await this.menuService.showTeam(ctx);
    });

    this.bot.action("warehouse", async (ctx) => {
      await ctx.answerCbQuery();
      await this.menuService.showWarehouse(ctx);
    });

    this.bot.action("material_requests", async (ctx) => {
      await ctx.answerCbQuery();
      await this.menuService.showMaterialRequests(ctx);
    });

    // Task actions
    this.bot.action(/task:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const taskId = ctx.match[1];
      await this.taskOpsService.showTaskDetails(ctx, taskId);
    });

    this.bot.action(/task_start:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const taskId = ctx.match[1];
      await this.taskOpsService.startTask(ctx, taskId);
    });

    this.bot.action(/task_complete:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const taskId = ctx.match[1];
      await this.taskOpsService.initiateTaskComplete(ctx, taskId);
    });

    this.bot.action(/task_postpone:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const taskId = ctx.match[1];
      await this.taskOpsService.postponeTask(ctx, taskId);
    });

    this.bot.action(/task_photo_before:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const taskId = ctx.match[1];
      await this.taskOpsService.requestPhotoBefore(ctx, taskId);
    });

    this.bot.action(/task_photo_after:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const taskId = ctx.match[1];
      await this.taskOpsService.requestPhotoAfter(ctx, taskId);
    });

    // Confirm actions
    this.bot.action(/confirm_complete:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const taskId = ctx.match[1];
      await this.taskOpsService.completeTask(ctx, taskId);
    });

    this.bot.action("cancel", async (ctx) => {
      await ctx.answerCbQuery("Отменено");
      this.clearSession(ctx.from!.id);
      await this.menuService.showMainMenu(ctx);
    });

    // Machine actions
    this.bot.action(/machine:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const machineId = ctx.match[1];
      await this.machineOpsService.showMachineDetails(ctx, machineId);
    });

    this.bot.action(/machine_refill:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const machineId = ctx.match[1];
      await this.machineOpsService.createRefillTask(ctx, machineId);
    });

    this.bot.action(/machine_collection:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const machineId = ctx.match[1];
      await this.machineOpsService.createCollectionTask(ctx, machineId);
    });

    // Pagination
    this.bot.action(/page:tasks:(\d+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const page = parseInt(ctx.match[1]);
      await this.taskOpsService.showMyTasks(ctx, page);
    });

    this.bot.action(/page:machines:(\d+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const page = parseInt(ctx.match[1]);
      await this.machineOpsService.showMyMachines(ctx, page);
    });
  }

  // ============================================================================
  // MESSAGE HANDLERS
  // ============================================================================

  private registerMessages() {
    // Photo handler
    this.bot.on("photo", async (ctx) => {
      const session = this.getSession(ctx.from!.id);
      if (!session || !session.data.taskId) return;

      const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Largest size
      const fileId = photo.file_id;

      if (session.state === SessionState.AWAITING_PHOTO_BEFORE) {
        await this.taskOpsService.saveTaskPhoto(
          ctx,
          session.data.taskId as string,
          fileId,
          "before",
        );
      } else if (session.state === SessionState.AWAITING_PHOTO_AFTER) {
        await this.taskOpsService.saveTaskPhoto(
          ctx,
          session.data.taskId as string,
          fileId,
          "after",
        );
      }
    });

    // Text handler for comments and amounts
    this.bot.on("text", async (ctx) => {
      const session = this.getSession(ctx.from!.id);
      if (!session) return;

      if (session.state === SessionState.AWAITING_COMMENT) {
        await this.taskOpsService.saveTaskComment(
          ctx,
          session.data.taskId as string,
          ctx.message.text,
        );
      } else if (session.state === SessionState.AWAITING_CASH_AMOUNT) {
        const amount = parseFloat(ctx.message.text.replace(/[^\d.]/g, ""));
        if (isNaN(amount)) {
          await ctx.reply("❌ Введите корректную сумму");
          return;
        }
        await this.taskOpsService.saveCashAmount(
          ctx,
          session.data.taskId as string,
          amount,
        );
      } else if (session.state === SessionState.AWAITING_REJECTION_REASON) {
        await this.taskOpsService.saveRejectionReason(
          ctx,
          session.data.taskId as string,
          ctx.message.text,
        );
      }
    });

    // Location handler
    this.bot.on("location", async (ctx) => {
      const session = this.getSession(ctx.from!.id);
      if (!session?.data.taskId) return;

      const { latitude, longitude } = ctx.message.location;
      await this.taskOpsService.saveTaskLocation(
        ctx,
        session.data.taskId as string,
        latitude,
        longitude,
      );
    });
  }

  // ============================================================================
  // SESSION HELPERS (delegated from orchestrator)
  // ============================================================================

  private getSession(userId: number): TelegramSession | undefined {
    return this.sessions.get(userId);
  }

  private clearSession(userId: number) {
    this.sessions.delete(userId);
  }
}
