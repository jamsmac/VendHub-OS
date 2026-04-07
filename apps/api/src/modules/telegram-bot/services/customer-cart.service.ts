/**
 * Customer Bot — Cart & Checkout Sub-Service
 * In-session shopping cart, order creation, payment method selection.
 * Uses TypeORM to create orders in client_orders.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Telegraf, Markup } from "telegraf";
import {
  CustomerBotContext,
  CustomerSession,
  CustomerSessionState,
  CartItem,
} from "./customer-types";
import {
  ClientOrder,
  ClientOrderStatus,
  OrderItem,
} from "../../client/entities/client-order.entity";
import { ClientUser } from "../../client/entities/client-user.entity";
import { Product } from "../../products/entities/product.entity";

function formatPrice(price: number): string {
  return Number(price).toLocaleString("ru-RU");
}

@Injectable()
export class CustomerCartService {
  private readonly logger = new Logger(CustomerCartService.name);
  private bot: Telegraf<CustomerBotContext>;
  private sessions: Map<number, CustomerSession>;

  constructor(
    @InjectRepository(ClientUser)
    private readonly clientUserRepo: Repository<ClientUser>,
    @InjectRepository(ClientOrder)
    private readonly orderRepo: Repository<ClientOrder>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  setBot(
    bot: Telegraf<CustomerBotContext>,
    sessions: Map<number, CustomerSession>,
  ) {
    this.bot = bot;
    this.sessions = sessions;
  }

  // ---------- Helpers ----------

  private getCart(userId: number): CartItem[] {
    const session = this.sessions.get(userId);
    return session?.cart ?? [];
  }

  private setCart(userId: number, cart: CartItem[]) {
    const session = this.sessions.get(userId) ?? {
      state: CustomerSessionState.IDLE,
      data: {},
    };
    session.cart = cart;
    this.sessions.set(userId, session);
  }

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

  // ---------- Add to Cart ----------

  async addToCart(
    ctx: CustomerBotContext,
    productId: string,
    machineId: string,
  ) {
    const userId = ctx.from!.id;
    let product: Product | null = null;

    try {
      product = await this.productRepo.findOne({ where: { id: productId } });
    } catch {
      // Table may not exist
    }

    if (!product) {
      await ctx.reply("❌ Товар не найден.");
      return;
    }

    const cart = this.getCart(userId);
    const existing = cart.find(
      (item) => item.productId === productId && item.machineId === machineId,
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        productId,
        productName: product.name,
        unitPrice:
          ((product as unknown as Record<string, unknown>)
            .sellingPrice as number) ?? 0,
        quantity: 1,
        machineId,
      });
    }

    this.setCart(userId, cart);

    await ctx.reply(
      `✅ ${product.name} добавлен в корзину`,
      Markup.inlineKeyboard([
        [Markup.button.callback("🛒 Корзина", "cart")],
        [Markup.button.callback("📋 Продолжить покупки", "catalog")],
      ]),
    );
  }

  // ---------- Show Cart ----------

  async showCart(ctx: CustomerBotContext) {
    const cart = this.getCart(ctx.from!.id);

    if (cart.length === 0) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("📋 Каталог", "catalog")],
        [Markup.button.callback("🏠 В меню", "menu")],
      ]);
      await this.replyOrEdit(
        ctx,
        "🛒 Корзина пуста\n\nВыберите товары из каталога!",
        keyboard,
      );
      return;
    }

    let message = "🛒 Ваша корзина:\n\n";
    let total = 0;

    for (const item of cart) {
      const itemTotal = item.unitPrice * item.quantity;
      total += itemTotal;
      message += `• ${item.productName} x${item.quantity} — ${formatPrice(itemTotal)} сум\n`;
    }

    message += `\n💰 Итого: ${formatPrice(total)} сум`;

    const buttons: ReturnType<typeof Markup.button.callback>[][] = [
      [Markup.button.callback("💳 Оформить заказ", "checkout")],
      [Markup.button.callback("🗑 Очистить", "clear_cart")],
      [Markup.button.callback("📋 Продолжить покупки", "catalog")],
      [Markup.button.callback("🏠 В меню", "menu")],
    ];

    await this.replyOrEdit(ctx, message, Markup.inlineKeyboard(buttons));
  }

  // ---------- Clear Cart ----------

  async clearCart(ctx: CustomerBotContext) {
    this.setCart(ctx.from!.id, []);
    await ctx.reply(
      "🗑 Корзина очищена.",
      Markup.inlineKeyboard([
        [Markup.button.callback("📋 Каталог", "catalog")],
        [Markup.button.callback("🏠 В меню", "menu")],
      ]),
    );
  }

  // ---------- Checkout ----------

  async startCheckout(ctx: CustomerBotContext) {
    const cart = this.getCart(ctx.from!.id);

    if (cart.length === 0) {
      await ctx.reply("🛒 Корзина пуста. Добавьте товары из каталога.");
      return;
    }

    let total = 0;
    for (const item of cart) {
      total += item.unitPrice * item.quantity;
    }

    const message =
      `💳 Оформление заказа\n\n` +
      `Товаров: ${cart.length}\n` +
      `Сумма: ${formatPrice(total)} сум\n\n` +
      `Выберите способ оплаты:`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("💳 Payme", "pay:payme")],
      [Markup.button.callback("💳 Click", "pay:click")],
      [Markup.button.callback("⭐ Баллами", "pay:points")],
      [Markup.button.callback("❌ Отмена", "cart")],
    ]);

    await this.replyOrEdit(ctx, message, keyboard);
  }

  // ---------- Process Payment ----------

  async processPayment(ctx: CustomerBotContext, method: string) {
    const userId = ctx.from!.id;
    const telegramId = userId.toString();
    const cart = this.getCart(userId);

    if (cart.length === 0) {
      await ctx.reply("🛒 Корзина пуста.");
      return;
    }

    // Find or create client user
    let clientUser: ClientUser | null = null;
    try {
      clientUser = await this.clientUserRepo.findOne({
        where: { telegramId },
      });
    } catch {
      // Table may not exist
    }

    if (!clientUser) {
      await ctx.reply(
        "❌ Для оформления заказа необходима регистрация. " +
          "Совершите первую покупку через автомат VendHub.",
      );
      return;
    }

    // Calculate total
    let total = 0;
    const items = cart.map((item) => {
      const itemTotal = item.unitPrice * item.quantity;
      total += itemTotal;
      return {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal,
      };
    });

    // Create order
    try {
      const order = this.orderRepo.create({
        clientUserId: clientUser.id,
        machineId: cart[0]?.machineId ?? null,
        totalAmount: total,
        items: items as unknown as OrderItem[],
        status: ClientOrderStatus.PENDING,
        paymentMethod: method,
        organizationId: clientUser.organizationId ?? undefined,
      } as unknown as Partial<ClientOrder>);
      const saved = await this.orderRepo.save(order);

      // Clear cart
      this.setCart(userId, []);

      const methodLabel =
        method === "payme" ? "Payme" : method === "click" ? "Click" : "Баллы";

      await ctx.reply(
        `✅ Заказ #${saved.orderNumber} создан!\n\n` +
          `Сумма: ${formatPrice(total)} сум\n` +
          `Способ оплаты: ${methodLabel}\n\n` +
          `Следите за статусом: /status ${saved.orderNumber}`,
        Markup.inlineKeyboard([
          [Markup.button.callback("📋 Мои заказы", "orders")],
          [Markup.button.callback("🏠 В меню", "menu")],
        ]),
      );
    } catch (err) {
      this.logger.error(`Failed to create order: ${err}`);
      await ctx.reply(
        "❌ Не удалось создать заказ. Попробуйте позже.",
        Markup.inlineKeyboard([
          [Markup.button.callback("🛒 Корзина", "cart")],
          [Markup.button.callback("🏠 В меню", "menu")],
        ]),
      );
    }
  }
}
