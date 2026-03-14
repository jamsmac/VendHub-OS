/**
 * Bot Order Service — extracted from TelegramCustomerBotService
 * Handles transaction status lookups and refund request flows
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Context, Markup } from "telegraf";
import { Transaction } from "../../transactions/entities/transaction.entity";
import {
  Complaint,
  ComplaintStatus,
  ComplaintCategory,
  ComplaintSource,
} from "../../complaints/entities/complaint.entity";
import type { CustomerSession } from "./customer-types";
import { CustomerSessionState } from "./customer-types";

type CustomerContext = Context;

@Injectable()
export class BotOrderService {
  private readonly logger = new Logger(BotOrderService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Complaint)
    private complaintRepository: Repository<Complaint>,
  ) {}

  // ============================================================================
  // TRANSACTION STATUS
  // ============================================================================

  async askForTransactionId(
    ctx: CustomerContext,
    setSession: (userId: number, session: CustomerSession) => void,
  ) {
    setSession(ctx.from!.id, {
      state: CustomerSessionState.AWAITING_TRANSACTION_ID,
      data: {},
    });

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("❌ Отмена", "cancel")],
    ]);

    await ctx.reply(
      "🔍 Введите номер транзакции\n\n" +
        "Номер транзакции указан на чеке или в уведомлении об оплате.\n" +
        "Например: TRX-123456",
      keyboard,
    );
  }

  async handleTransactionId(
    ctx: CustomerContext,
    transactionId: string,
    clearSession: (userId: number) => void,
  ) {
    await this.showTransactionStatus(ctx, transactionId, clearSession);
  }

  async showTransactionStatus(
    ctx: CustomerContext,
    transactionId: string,
    clearSession: (userId: number) => void,
  ) {
    const transaction = await this.transactionRepository.findOne({
      where: [
        { id: transactionId },
        { transactionNumber: transactionId },
        { paymentId: transactionId },
      ],
    });

    if (!transaction) {
      await ctx.reply(
        "❌ Транзакция не найдена.\n\n" + "Проверьте номер и попробуйте снова.",
      );
      return;
    }

    clearSession(ctx.from!.id);

    const statusLabels: Record<string, string> = {
      pending: "⏳ Ожидает оплаты",
      paid: "💳 Оплачена",
      dispensing: "🔄 Выдача товара",
      completed: "✅ Завершена",
      failed: "❌ Ошибка",
      refunded: "💰 Возврат",
      cancelled: "🚫 Отменена",
    };

    let message =
      `🧾 Транзакция #${transaction.transactionNumber}\n\n` +
      `📊 Статус: ${statusLabels[transaction.status]}\n` +
      `🏭 Аппарат: ${transaction.machineId || "N/A"}\n` +
      `📦 Товар: ${(transaction as Transaction & { productName?: string }).productName || "N/A"}\n` +
      `💰 Сумма: ${Number(transaction.amount).toLocaleString()} сум\n` +
      `📅 Дата: ${new Date(transaction.createdAt).toLocaleString("ru-RU")}\n`;

    if (transaction.status === "completed") {
      message += "\n✅ Покупка успешно завершена!";
    } else if (transaction.status === "failed") {
      message +=
        "\n❌ К сожалению, произошла ошибка при покупке.\nВы можете оставить жалобу для возврата средств.";
    }

    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

    if (["failed", "completed"].includes(transaction.status)) {
      buttons.push([
        Markup.button.callback("📝 Оставить жалобу", "new_complaint"),
      ]);
    }

    buttons.push([Markup.button.callback("🏠 В меню", "menu")]);

    const keyboard = Markup.inlineKeyboard(buttons);
    await ctx.reply(message, keyboard);
  }

  // ============================================================================
  // REFUND FLOW
  // ============================================================================

  async startRefundFlow(
    ctx: CustomerContext,
    setSession: (userId: number, session: CustomerSession) => void,
  ) {
    setSession(ctx.from!.id, {
      state: CustomerSessionState.AWAITING_REFUND_DETAILS,
      data: {},
    });

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("❌ Отмена", "cancel")],
    ]);

    await ctx.reply(
      "💰 Запрос возврата средств\n\n" +
        "Опишите ситуацию:\n" +
        "• Номер транзакции (если есть)\n" +
        "• Сумма возврата\n" +
        "• Причина возврата\n" +
        "• Номер телефона",
      keyboard,
    );
  }

  async handleRefundDetails(
    ctx: CustomerContext,
    details: string,
    clearSession: (userId: number) => void,
  ) {
    try {
      const complaint = this.complaintRepository.create({
        category: ComplaintCategory.REFUND_REQUEST,
        subject: "Запрос на возврат средств через Telegram",
        description: `Запрос на возврат средств:\n${details}`,
        customer: {
          telegramId: ctx.from!.id.toString(),
        },
        status: ComplaintStatus.PENDING,
        source: ComplaintSource.TELEGRAM_BOT,
        metadata: {
          tags: ["refund_request"],
        },
      } as Partial<Complaint>);

      const savedRefund = await this.complaintRepository.save(complaint);
      const savedRefundEntity = Array.isArray(savedRefund)
        ? savedRefund[0]
        : savedRefund;
      const refundTicketNumber = savedRefundEntity?.ticketNumber;
      clearSession(ctx.from!.id);

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("📋 Мои обращения", "my_complaints")],
        [Markup.button.callback("🏠 В меню", "menu")],
      ]);

      await ctx.reply(
        `✅ Запрос на возврат #${refundTicketNumber || "N/A"} создан!\n\n` +
          "Мы рассмотрим вашу заявку и свяжемся с вами.",
        keyboard,
      );
    } catch (error: unknown) {
      this.logger.error("Failed to create refund request:", error);
      await ctx.reply("❌ Произошла ошибка. Попробуйте позже.");
    }
  }

  // ============================================================================
  // NOTIFICATIONS (Public methods)
  // ============================================================================

  async sendComplaintStatusUpdate(
    bot: {
      telegram: { sendMessage: (...args: unknown[]) => Promise<unknown> };
    },
    telegramId: string,
    complaint: Complaint,
  ) {
    const statusLabels: Record<string, string> = {
      pending: "⏳ Ожидает рассмотрения",
      assigned: "👤 Назначена специалисту",
      in_progress: "🔄 В работе",
      resolved: "✅ Решена",
      closed: "📁 Закрыта",
      rejected: "❌ Отклонена",
    };

    const message =
      `📢 Обновление по жалобе #${complaint.ticketNumber}\n\n` +
      `📊 Новый статус: ${statusLabels[complaint.status]}\n` +
      (complaint.resolution
        ? `\n📝 Комментарий:\n${complaint.resolution}`
        : "");

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("👀 Подробнее", `complaint:${complaint.id}`)],
    ]);

    try {
      await bot.telegram.sendMessage(telegramId, message, keyboard);
    } catch (error: unknown) {
      this.logger.error(`Failed to send notification to ${telegramId}:`, error);
    }
  }

  async sendRefundNotification(
    bot: {
      telegram: { sendMessage: (...args: unknown[]) => Promise<unknown> };
    },
    telegramId: string,
    amount: number,
    status: string,
  ) {
    const statusLabels: Record<string, string> = {
      approved: "✅ одобрен",
      processed: "💰 выплачен",
      rejected: "❌ отклонён",
    };

    const message =
      `💰 Возврат средств ${statusLabels[status] || status}!\n\n` +
      `Сумма: ${amount.toLocaleString()} сум\n` +
      (status === "processed"
        ? "\nСредства поступят на ваш счёт в течение 1-3 рабочих дней."
        : "");

    try {
      await bot.telegram.sendMessage(telegramId, message);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send refund notification to ${telegramId}:`,
        error,
      );
    }
  }
}
