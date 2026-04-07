/**
 * Customer Bot — Orders Sub-Service
 * View order history, order details with items and status.
 * Uses TypeORM to query client_orders.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Telegraf, Markup } from "telegraf";
import { CustomerBotContext, CustomerSession } from "./customer-types";
import {
  ClientOrder,
  ClientOrderStatus,
} from "../../client/entities/client-order.entity";
import { ClientUser } from "../../client/entities/client-user.entity";

function formatPrice(price: number): string {
  return Number(price).toLocaleString("ru-RU");
}

const STATUS_LABELS: Record<string, string> = {
  [ClientOrderStatus.PENDING]: "⏳ Ожидает оплаты",
  [ClientOrderStatus.PAID]: "✅ Оплачен",
  [ClientOrderStatus.DISPENSING]: "🔄 Выдача",
  [ClientOrderStatus.COMPLETED]: "✅ Выполнен",
  [ClientOrderStatus.FAILED]: "❌ Ошибка",
  [ClientOrderStatus.CANCELLED]: "🚫 Отменён",
  [ClientOrderStatus.REFUNDED]: "💸 Возврат",
};

@Injectable()
export class CustomerOrdersService {
  private readonly logger = new Logger(CustomerOrdersService.name);
  private bot: Telegraf<CustomerBotContext>;
  private sessions: Map<number, CustomerSession>;

  constructor(
    @InjectRepository(ClientUser)
    private readonly clientUserRepo: Repository<ClientUser>,
    @InjectRepository(ClientOrder)
    private readonly orderRepo: Repository<ClientOrder>,
  ) {}

  setBot(
    bot: Telegraf<CustomerBotContext>,
    sessions: Map<number, CustomerSession>,
  ) {
    this.bot = bot;
    this.sessions = sessions;
  }

  // ---------- Helpers ----------

  private async replyOrEdit(
    ctx: CustomerBotContext,
    message: string,
    keyboard: ReturnType<typeof Markup.inlineKeyboard>,
  ) {
    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, keyboard);
      } catch {
        await ctx.reply(message, keyboard);
      }
    } else {
      await ctx.reply(message, keyboard);
    }
  }

  // ---------- Order History ----------

  async showOrderHistory(ctx: CustomerBotContext, page = 1) {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    const limit = 5;
    const offset = (page - 1) * limit;

    let orders: ClientOrder[] = [];
    let total = 0;

    try {
      const clientUser = await this.clientUserRepo.findOne({
        where: { telegramId },
      });

      if (clientUser) {
        [orders, total] = await this.orderRepo.findAndCount({
          where: { clientUserId: clientUser.id },
          order: { createdAt: "DESC" },
          take: limit,
          skip: offset,
        });
      }
    } catch {
      // Tables may not exist yet
    }

    if (orders.length === 0 && page === 1) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("📋 Наше меню", "catalog")],
        [Markup.button.callback("🏠 В меню", "menu")],
      ]);
      await this.replyOrEdit(
        ctx,
        "📋 История заказов\n\n" +
          "У вас пока нет заказов. Совершите первую покупку " +
          "через автомат VendHub!",
        keyboard,
      );
      return;
    }

    let message = `📋 Заказы (стр. ${page})\n\n`;

    for (const order of orders) {
      const date = order.createdAt
        ? new Date(order.createdAt).toLocaleDateString("ru-RU")
        : "";
      const statusLabel = STATUS_LABELS[order.status] ?? order.status;
      message +=
        `#${order.orderNumber} — ${formatPrice(order.totalAmount)} сум\n` +
        `${statusLabel} | ${date}\n\n`;
    }

    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

    // Order detail buttons
    for (const order of orders) {
      buttons.push([
        Markup.button.callback(`📦 #${order.orderNumber}`, `order:${order.id}`),
      ]);
    }

    // Pagination
    const totalPages = Math.ceil(total / limit);
    const navButtons: ReturnType<typeof Markup.button.callback>[] = [];
    if (page > 1) {
      navButtons.push(Markup.button.callback("« Назад", `orders:${page - 1}`));
    }
    if (page < totalPages) {
      navButtons.push(Markup.button.callback("Вперёд »", `orders:${page + 1}`));
    }
    if (navButtons.length > 0) {
      buttons.push(navButtons);
    }

    buttons.push([Markup.button.callback("🏠 В меню", "menu")]);

    await this.replyOrEdit(ctx, message, Markup.inlineKeyboard(buttons));
  }

  // ---------- Order Details ----------

  async showOrderDetails(ctx: CustomerBotContext, orderId: string) {
    let order: ClientOrder | null = null;

    try {
      order = await this.orderRepo.findOne({
        where: { id: orderId },
      });
    } catch {
      // Table may not exist
    }

    if (!order) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("« Мои заказы", "orders")],
        [Markup.button.callback("🏠 В меню", "menu")],
      ]);
      await this.replyOrEdit(ctx, "❌ Заказ не найден.", keyboard);
      return;
    }

    const statusLabel = STATUS_LABELS[order.status] ?? order.status;
    const date = order.createdAt
      ? new Date(order.createdAt).toLocaleString("ru-RU")
      : "";

    let message =
      `📦 Заказ #${order.orderNumber}\n\n` +
      `Статус: ${statusLabel}\n` +
      `Дата: ${date}\n` +
      `Сумма: ${formatPrice(order.totalAmount)} сум\n`;

    if (order.loyaltyPointsUsed > 0) {
      message += `Использовано баллов: ${order.loyaltyPointsUsed}\n`;
    }

    // Show items if available (JSONB column)
    const items = order.items as
      | { productName: string; quantity: number; unitPrice: number }[]
      | null;
    if (items && items.length > 0) {
      message += "\nТовары:\n";
      for (const item of items) {
        message += `  • ${item.productName} x${item.quantity} — ${formatPrice(item.unitPrice * item.quantity)} сум\n`;
      }
    }

    const buttons: ReturnType<typeof Markup.button.callback>[][] = [
      [Markup.button.callback("« Мои заказы", "orders")],
      [Markup.button.callback("🏠 В меню", "menu")],
    ];

    // Show complaint button for completed/failed orders
    if (
      order.status === ClientOrderStatus.FAILED ||
      order.status === ClientOrderStatus.COMPLETED
    ) {
      buttons.unshift([
        Markup.button.callback("⚠️ Сообщить о проблеме", "new_complaint"),
      ]);
    }

    await this.replyOrEdit(ctx, message, Markup.inlineKeyboard(buttons));
  }
}
