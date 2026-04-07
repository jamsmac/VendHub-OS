/**
 * Customer Bot — Handlers Sub-Service
 * Registers all commands, callbacks, and message handlers.
 * Delegates to specialized sub-services.
 */

import { Injectable, Logger } from "@nestjs/common";
import { Telegraf } from "telegraf";
import {
  CustomerBotContext,
  CustomerSession,
  CustomerSessionState,
} from "./customer-types";
import { CustomerMenuService } from "./customer-menu.service";
import { CustomerCatalogService } from "./customer-catalog.service";
import { CustomerLoyaltyService } from "./customer-loyalty.service";
import { CustomerOrdersService } from "./customer-orders.service";
import { CustomerComplaintsService } from "./customer-complaints.service";
import { CustomerLocationService } from "./customer-location.service";
import { CustomerCartService } from "./customer-cart.service";
import { CustomerEngagementService } from "./customer-engagement.service";

@Injectable()
export class CustomerHandlersService {
  private readonly logger = new Logger(CustomerHandlersService.name);
  private bot: Telegraf<CustomerBotContext>;
  private sessions: Map<number, CustomerSession>;

  constructor(
    private readonly menuService: CustomerMenuService,
    private readonly catalogService: CustomerCatalogService,
    private readonly loyaltyService: CustomerLoyaltyService,
    private readonly ordersService: CustomerOrdersService,
    private readonly complaintsService: CustomerComplaintsService,
    private readonly locationService: CustomerLocationService,
    private readonly cartService: CustomerCartService,
    private readonly engagementService: CustomerEngagementService,
  ) {}

  setBot(
    bot: Telegraf<CustomerBotContext>,
    sessions: Map<number, CustomerSession>,
  ) {
    this.bot = bot;
    this.sessions = sessions;

    this.registerCommands();
    this.registerCallbacks();
    this.registerMessages();
  }

  // ============================================================================
  // COMMANDS
  // ============================================================================

  private registerCommands() {
    // /start — Welcome + deep links
    this.bot.command("start", async (ctx) => {
      const startParam = ctx.message.text.split(" ")[1];

      if (startParam?.startsWith("complaint_")) {
        const machineId = startParam.replace("complaint_", "");
        await this.complaintsService.startComplaintFlow(ctx, machineId);
        return;
      }

      if (startParam?.startsWith("status_")) {
        const transactionId = startParam.replace("status_", "");
        await this.complaintsService.showTransactionStatus(ctx, transactionId);
        return;
      }

      if (startParam?.startsWith("ref_")) {
        // Handle referral — show welcome + note referral
        // Referral processing happens on first order
      }

      await this.menuService.showMainMenu(ctx);
    });

    // /help
    this.bot.command("help", async (ctx) => {
      await ctx.reply(this.menuService.getHelpMessage());
    });

    // /menu — Product catalog
    this.bot.command("menu", async (ctx) => {
      await this.catalogService.showCategories(ctx);
    });

    // /bonuses — Loyalty overview
    this.bot.command("bonuses", async (ctx) => {
      await this.loyaltyService.showLoyaltyOverview(ctx);
    });

    // /orders — Order history
    this.bot.command("orders", async (ctx) => {
      await this.ordersService.showOrderHistory(ctx);
    });

    // /complaint
    this.bot.command("complaint", async (ctx) => {
      await this.complaintsService.askForMachineCode(ctx);
    });

    // /status — Check purchase status
    this.bot.command("status", async (ctx) => {
      await this.complaintsService.askForTransactionId(ctx);
    });

    // /refund
    this.bot.command("refund", async (ctx) => {
      await this.complaintsService.startRefundFlow(ctx);
    });

    // /mycomplaints
    this.bot.command("mycomplaints", async (ctx) => {
      await this.complaintsService.showMyComplaints(ctx);
    });

    // /find — Find nearby machines
    this.bot.command("find", async (ctx) => {
      await this.locationService.requestLocation(ctx);
    });

    // /cart — Shopping cart
    this.bot.command("cart", async (ctx) => {
      await this.cartService.showCart(ctx);
    });

    // /referral — Referral program
    this.bot.command("referral", async (ctx) => {
      await this.engagementService.showReferralInfo(ctx);
    });

    // /quests — Active quests
    this.bot.command("quests", async (ctx) => {
      await this.engagementService.showQuests(ctx);
    });

    // /achievements — User achievements
    this.bot.command("achievements", async (ctx) => {
      await this.engagementService.showAchievements(ctx);
    });

    // /promo — Enter promo code
    this.bot.command("promo", async (ctx) => {
      const code = ctx.message.text.split(" ")[1];
      if (code) {
        await this.engagementService.handlePromoCode(ctx, code);
      } else {
        await this.engagementService.askForPromoCode(ctx);
      }
    });
  }

  // ============================================================================
  // CALLBACKS
  // ============================================================================

  private registerCallbacks() {
    // --- Navigation ---
    this.bot.action("menu", async (ctx) => {
      await ctx.answerCbQuery();
      await this.menuService.showMainMenu(ctx);
    });

    this.bot.action("noop", async (ctx) => {
      await ctx.answerCbQuery();
    });

    // --- Catalog ---
    this.bot.action("catalog", async (ctx) => {
      await ctx.answerCbQuery();
      await this.catalogService.showCategories(ctx);
    });

    this.bot.action(/^cat:([^:]+)(?::(\d+))?$/, async (ctx) => {
      await ctx.answerCbQuery();
      const category = ctx.match[1]!;
      const page = ctx.match[2] ? parseInt(ctx.match[2], 10) : 1;
      await this.catalogService.showCategoryProducts(ctx, category, page);
    });

    this.bot.action(/^product:(.+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      await this.catalogService.showProductDetails(ctx, ctx.match[1]!);
    });

    // --- Location / Find Machines ---
    this.bot.action("find_machines", async (ctx) => {
      await ctx.answerCbQuery();
      await this.locationService.requestLocation(ctx);
    });

    this.bot.action("machines", async (ctx) => {
      await ctx.answerCbQuery();
      await this.catalogService.showNearbyMachines(ctx);
    });

    this.bot.action(/^machine:(.+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      await this.catalogService.showProductDetails(ctx, ctx.match[1]!);
    });

    // --- Cart ---
    this.bot.action("cart", async (ctx) => {
      await ctx.answerCbQuery();
      await this.cartService.showCart(ctx);
    });

    this.bot.action("clear_cart", async (ctx) => {
      await ctx.answerCbQuery();
      await this.cartService.clearCart(ctx);
    });

    this.bot.action("checkout", async (ctx) => {
      await ctx.answerCbQuery();
      await this.cartService.startCheckout(ctx);
    });

    this.bot.action(/^add_to_cart:(.+):(.+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      await this.cartService.addToCart(ctx, ctx.match[1]!, ctx.match[2]!);
    });

    this.bot.action(/^pay:(.+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      await this.cartService.processPayment(ctx, ctx.match[1]!);
    });

    // --- Loyalty ---
    this.bot.action("loyalty", async (ctx) => {
      await ctx.answerCbQuery();
      await this.loyaltyService.showLoyaltyOverview(ctx);
    });

    this.bot.action("loyalty_history", async (ctx) => {
      await ctx.answerCbQuery();
      await this.loyaltyService.showPointsHistory(ctx);
    });

    this.bot.action("loyalty_tiers", async (ctx) => {
      await ctx.answerCbQuery();
      await this.loyaltyService.showTiersInfo(ctx);
    });

    // --- Orders ---
    this.bot.action("orders", async (ctx) => {
      await ctx.answerCbQuery();
      await this.ordersService.showOrderHistory(ctx);
    });

    this.bot.action(/^orders:(\d+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      const page = parseInt(ctx.match[1]!, 10);
      await this.ordersService.showOrderHistory(ctx, page);
    });

    this.bot.action(/^order:(.+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      await this.ordersService.showOrderDetails(ctx, ctx.match[1]!);
    });

    // --- Engagement (referrals, quests, achievements, promo) ---
    this.bot.action("referral", async (ctx) => {
      await ctx.answerCbQuery();
      await this.engagementService.showReferralInfo(ctx);
    });

    this.bot.action("quests", async (ctx) => {
      await ctx.answerCbQuery();
      await this.engagementService.showQuests(ctx);
    });

    this.bot.action("achievements", async (ctx) => {
      await ctx.answerCbQuery();
      await this.engagementService.showAchievements(ctx);
    });

    this.bot.action("promo", async (ctx) => {
      await ctx.answerCbQuery();
      await this.engagementService.askForPromoCode(ctx);
    });

    // --- Complaints ---
    this.bot.action("new_complaint", async (ctx) => {
      await ctx.answerCbQuery();
      await this.complaintsService.askForMachineCode(ctx);
    });

    this.bot.action("check_status", async (ctx) => {
      await ctx.answerCbQuery();
      await this.complaintsService.askForTransactionId(ctx);
    });

    this.bot.action("request_refund", async (ctx) => {
      await ctx.answerCbQuery();
      await this.complaintsService.startRefundFlow(ctx);
    });

    this.bot.action("my_complaints", async (ctx) => {
      await ctx.answerCbQuery();
      await this.complaintsService.showMyComplaints(ctx);
    });

    this.bot.action(/^complaint_type:(.+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      await this.complaintsService.selectComplaintType(ctx, ctx.match[1]!);
    });

    this.bot.action(/^complaint:(.+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      await this.complaintsService.showComplaintDetails(ctx, ctx.match[1]!);
    });

    this.bot.action("submit_complaint", async (ctx) => {
      await ctx.answerCbQuery();
      await this.complaintsService.submitComplaint(ctx);
    });

    this.bot.action("add_photo", async (ctx) => {
      await ctx.answerCbQuery();
      await this.complaintsService.requestPhoto(ctx);
    });

    this.bot.action("skip_photo", async (ctx) => {
      await ctx.answerCbQuery();
      await this.complaintsService.confirmComplaint(ctx);
    });

    // --- Cancel ---
    this.bot.action("cancel", async (ctx) => {
      await ctx.answerCbQuery("Отменено");
      this.sessions.delete(ctx.from!.id);
      await this.menuService.showMainMenu(ctx);
    });

    // --- Language ---
    this.bot.action(/^lang:(.+)$/, async (ctx) => {
      await ctx.answerCbQuery();
      const lang = ctx.match[1] as "ru" | "uz" | "en";
      const session = this.sessions.get(ctx.from!.id);
      if (session) {
        session.language = lang;
      }
      await ctx.reply(
        `✅ Язык изменён на ${lang === "ru" ? "Русский" : lang === "uz" ? "O'zbek" : "English"}`,
      );
      await this.menuService.showMainMenu(ctx);
    });
  }

  // ============================================================================
  // MESSAGE HANDLERS
  // ============================================================================

  private registerMessages() {
    // Location handler — find nearby machines
    this.bot.on("location", async (ctx) => {
      const session = this.sessions.get(ctx.from!.id);
      if (
        session?.state === CustomerSessionState.AWAITING_LOCATION ||
        !session
      ) {
        await this.locationService.handleLocation(
          ctx,
          ctx.message.location.latitude,
          ctx.message.location.longitude,
        );
      }
    });

    // Photo handler — complaint photos
    this.bot.on("photo", async (ctx) => {
      const session = this.sessions.get(ctx.from!.id);
      if (!session || session.state !== CustomerSessionState.AWAITING_PHOTO)
        return;

      const photo = ctx.message.photo[ctx.message.photo.length - 1]!;
      await this.complaintsService.handlePhoto(ctx, photo.file_id);
    });

    // Contact handler (phone)
    this.bot.on("contact", async (ctx) => {
      const session = this.sessions.get(ctx.from!.id);
      if (!session || session.state !== CustomerSessionState.AWAITING_PHONE)
        return;

      await this.complaintsService.handleContactPhone(
        ctx,
        ctx.message.contact.phone_number,
      );
    });

    // Text handler (state machine)
    this.bot.on("text", async (ctx) => {
      const session = this.sessions.get(ctx.from!.id);
      const text = ctx.message.text.trim();

      // Cancel from keyboard
      if (text === "❌ Отмена") {
        this.sessions.delete(ctx.from!.id);
        await this.menuService.showMainMenu(ctx);
        return;
      }

      if (!session) return;

      switch (session.state) {
        case CustomerSessionState.AWAITING_MACHINE_CODE:
          await this.complaintsService.handleMachineCode(ctx, text);
          break;

        case CustomerSessionState.AWAITING_COMPLAINT_DESCRIPTION:
          await this.complaintsService.handleComplaintDescription(ctx, text);
          break;

        case CustomerSessionState.AWAITING_TRANSACTION_ID:
          await this.complaintsService.showTransactionStatus(ctx, text);
          break;

        case CustomerSessionState.AWAITING_PHONE:
          await this.complaintsService.handlePhone(ctx, text);
          break;

        case CustomerSessionState.AWAITING_REFUND_DETAILS:
          await this.complaintsService.handleRefundDetails(ctx, text);
          break;

        case CustomerSessionState.AWAITING_PROMO_CODE:
          await this.engagementService.handlePromoCode(ctx, text);
          break;
      }
    });
  }
}
