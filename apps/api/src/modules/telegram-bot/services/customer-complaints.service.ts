/**
 * Customer Bot — Complaints & Refunds Sub-Service
 * Handles complaint filing, refund requests, and complaint viewing.
 *
 * NOTE: The complaints, transactions tables do not yet exist in Supabase.
 * Machine lookup uses raw SQL against the real Supabase `machines` table.
 * Complaint submission and transaction status show "coming soon".
 */

import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Telegraf, Markup } from "telegraf";
import { Complaint } from "../../complaints/entities/complaint.entity";
import { CustomerBotContext, CustomerSession } from "./customer-types";

@Injectable()
export class CustomerComplaintsService {
  private readonly logger = new Logger(CustomerComplaintsService.name);
  private bot: Telegraf<CustomerBotContext>;
  private sessions: Map<number, CustomerSession>;

  constructor(private readonly dataSource: DataSource) {}

  setBot(
    bot: Telegraf<CustomerBotContext>,
    sessions: Map<number, CustomerSession>,
  ) {
    this.bot = bot;
    this.sessions = sessions;
  }

  private getSession(userId: number): CustomerSession | undefined {
    return this.sessions.get(userId);
  }

  private setSession(userId: number, session: CustomerSession) {
    this.sessions.set(userId, session);
  }

  private clearSession(userId: number) {
    this.sessions.delete(userId);
  }

  // ---------- Complaint Flow ----------

  async askForMachineCode(ctx: CustomerBotContext) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("🏠 В меню", "menu")],
    ]);

    await ctx.reply(
      "📝 Жалобы и обращения\n\n" +
        "🚧 Система обращений скоро будет доступна!\n\n" +
        "Пока вы можете связаться с нами напрямую:\n" +
        "📞 +998 71 200 39 99\n" +
        "💬 @vendhub_support\n" +
        "📧 info@vendhub.uz",
      keyboard,
    );
  }

  async handleMachineCode(ctx: CustomerBotContext, _code: string) {
    await this.askForMachineCode(ctx);
  }

  async startComplaintFlow(ctx: CustomerBotContext, _machineId: string) {
    await this.askForMachineCode(ctx);
  }

  async selectComplaintType(ctx: CustomerBotContext, _type: string) {
    await this.askForMachineCode(ctx);
  }

  async handleComplaintDescription(
    ctx: CustomerBotContext,
    _description: string,
  ) {
    await this.askForMachineCode(ctx);
  }

  async handlePhone(_ctx: CustomerBotContext, _phone: string) {
    // no-op — complaints not yet available
  }

  async handleContactPhone(_ctx: CustomerBotContext, _phone: string) {
    // no-op — complaints not yet available
  }

  async askForPhoto(_ctx: CustomerBotContext) {
    // no-op
  }

  async requestPhoto(_ctx: CustomerBotContext) {
    // no-op
  }

  async handlePhoto(_ctx: CustomerBotContext, _fileId: string) {
    // no-op
  }

  async confirmComplaint(ctx: CustomerBotContext) {
    await this.askForMachineCode(ctx);
  }

  async submitComplaint(ctx: CustomerBotContext) {
    await this.askForMachineCode(ctx);
  }

  // ---------- View Complaints ----------

  async showMyComplaints(ctx: CustomerBotContext) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("🏠 В меню", "menu")],
    ]);

    await ctx.reply(
      "📋 Мои обращения\n\n" +
        "🚧 Функция скоро будет доступна.\n\n" +
        "Для проверки статуса обращения свяжитесь с нами:\n" +
        "📞 +998 71 200 39 99\n" +
        "💬 @vendhub_support",
      keyboard,
    );
  }

  async showComplaintDetails(ctx: CustomerBotContext, _complaintId: string) {
    await this.showMyComplaints(ctx);
  }

  // ---------- Refund Flow ----------

  async startRefundFlow(ctx: CustomerBotContext) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("🏠 В меню", "menu")],
    ]);

    await ctx.reply(
      "💰 Возврат средств\n\n" +
        "🚧 Система возвратов скоро будет доступна!\n\n" +
        "Для оформления возврата свяжитесь с нами:\n" +
        "📞 +998 71 200 39 99\n" +
        "💬 @vendhub_support\n" +
        "📧 info@vendhub.uz",
      keyboard,
    );
  }

  async handleRefundDetails(ctx: CustomerBotContext, _details: string) {
    await this.startRefundFlow(ctx);
  }

  // ---------- Transaction Status ----------

  async askForTransactionId(ctx: CustomerBotContext) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("🏠 В меню", "menu")],
    ]);

    await ctx.reply(
      "🔍 Статус транзакции\n\n" +
        "🚧 Функция скоро будет доступна.\n\n" +
        "Для проверки статуса оплаты свяжитесь с нами:\n" +
        "📞 +998 71 200 39 99\n" +
        "💬 @vendhub_support",
      keyboard,
    );
  }

  async showTransactionStatus(ctx: CustomerBotContext, _transactionId: string) {
    await this.askForTransactionId(ctx);
  }

  // ---------- Notifications (Public API — stubs) ----------

  async sendComplaintStatusUpdate(_telegramId: string, _complaint: Complaint) {
    // Complaints not yet available — no-op
    this.logger.debug("sendComplaintStatusUpdate: complaints not yet enabled");
  }

  async sendRefundNotification(
    _telegramId: string,
    _amount: number,
    _status: string,
  ) {
    // Refunds not yet available — no-op
    this.logger.debug("sendRefundNotification: refunds not yet enabled");
  }
}
