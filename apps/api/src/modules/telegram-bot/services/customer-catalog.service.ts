/**
 * Customer Bot — Product Catalog Sub-Service
 * Browse products by category, view details with prices.
 *
 * NOTE: Queries use raw SQL to match the actual Supabase table schema
 * (products: price, available, category as text; machines: status as text).
 * The TypeORM entities have a different schema designed for the full VendHub OS.
 */

import { Injectable, Logger } from "@nestjs/common";
import { Telegraf, Markup } from "telegraf";
import { DataSource } from "typeorm";
import { CustomerBotContext, CustomerSession } from "./customer-types";

/** Supabase product row (matches actual table columns) */
interface SupabaseProduct {
  id: string;
  name: string;
  name_uz: string | null;
  price: number;
  category: string;
  available: boolean;
  description: string | null;
  description_uz: string | null;
  options: unknown[] | null;
  calories: number | null;
  discount_percent: number | null;
  image_url: string | null;
}

/** Supabase machine row */
interface SupabaseMachine {
  id: string;
  name: string;
  address: string;
  status: string;
  hours: string;
  latitude: number | null;
  longitude: number | null;
}

/** Client-facing categories mapped from actual Supabase values */
const CUSTOMER_CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: "coffee", label: "Кофе", icon: "☕" },
  { key: "tea", label: "Чай", icon: "🍵" },
  { key: "snack", label: "Снэки", icon: "🍪" },
  { key: "other", label: "Другое", icon: "🧃" },
];

function formatPrice(price: number | string): string {
  return Number(price).toLocaleString("ru-RU");
}

@Injectable()
export class CustomerCatalogService {
  private readonly logger = new Logger(CustomerCatalogService.name);
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

  // ---------- Category List ----------

  async showCategories(ctx: CustomerBotContext) {
    const buttons = CUSTOMER_CATEGORIES.map((cat) => [
      Markup.button.callback(`${cat.icon} ${cat.label}`, `cat:${cat.key}`),
    ]);

    buttons.push([Markup.button.callback("🏠 В меню", "menu")]);

    const keyboard = Markup.inlineKeyboard(buttons);

    const text =
      "📋 Наше меню\n\nВыберите категорию, чтобы увидеть доступные товары:";

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(text, keyboard);
      } catch {
        await ctx.reply(text, keyboard);
      }
    } else {
      await ctx.reply(text, keyboard);
    }
  }

  // ---------- Products by Category ----------

  async showCategoryProducts(
    ctx: CustomerBotContext,
    category: string,
    page = 1,
  ) {
    try {
      const pageSize = 5;
      const offset = (page - 1) * pageSize;

      const products = await this.dataSource.query<SupabaseProduct[]>(
        `SELECT id, name, name_uz, price, category, description, discount_percent
         FROM products
         WHERE category = $1 AND available = true
         ORDER BY name ASC
         LIMIT $2 OFFSET $3`,
        [category, pageSize, offset],
      );

      const [{ count: totalStr }] = await this.dataSource.query<
        { count: string }[]
      >(
        `SELECT COUNT(*)::text AS count FROM products WHERE category = $1 AND available = true`,
        [category],
      );
      const total = parseInt(totalStr, 10);

      const catInfo = CUSTOMER_CATEGORIES.find((c) => c.key === category);
      const catLabel = catInfo ? `${catInfo.icon} ${catInfo.label}` : category;

      if (products.length === 0) {
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback("« Категории", "catalog")],
          [Markup.button.callback("🏠 В меню", "menu")],
        ]);
        await ctx.reply(
          `${catLabel}\n\nТоваров в этой категории пока нет.`,
          keyboard,
        );
        return;
      }

      let message = `${catLabel}\n\n`;

      products.forEach((product, index) => {
        const num = offset + index + 1;
        message += `${num}. ${product.name}\n`;
        message += `   💰 ${formatPrice(product.price)} сум\n`;
        if (product.discount_percent) {
          message += `   🏷️ Скидка ${product.discount_percent}%\n`;
        }
        if (product.description) {
          const shortDesc =
            product.description.length > 60
              ? product.description.substring(0, 60) + "..."
              : product.description;
          message += `   ${shortDesc}\n`;
        }
        message += "\n";
      });

      const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

      products.forEach((product) => {
        buttons.push([
          Markup.button.callback(`📦 ${product.name}`, `product:${product.id}`),
        ]);
      });

      // Pagination
      const totalPages = Math.ceil(total / pageSize);
      if (totalPages > 1) {
        const paginationRow: ReturnType<typeof Markup.button.callback>[] = [];
        if (page > 1) {
          paginationRow.push(
            Markup.button.callback("« Назад", `cat:${category}:${page - 1}`),
          );
        }
        paginationRow.push(
          Markup.button.callback(`${page}/${totalPages}`, "noop"),
        );
        if (page < totalPages) {
          paginationRow.push(
            Markup.button.callback("Далее »", `cat:${category}:${page + 1}`),
          );
        }
        buttons.push(paginationRow);
      }

      buttons.push([Markup.button.callback("« Категории", "catalog")]);
      buttons.push([Markup.button.callback("🏠 В меню", "menu")]);

      const keyboard = Markup.inlineKeyboard(buttons);

      if (ctx.callbackQuery) {
        try {
          await ctx.editMessageText(message, keyboard);
        } catch {
          await ctx.reply(message, keyboard);
        }
      } else {
        await ctx.reply(message, keyboard);
      }
    } catch (err) {
      this.logger.error(`showCategoryProducts error: ${err}`);
      await ctx.reply("❌ Ошибка загрузки товаров. Попробуйте позже.");
    }
  }

  // ---------- Product Details ----------

  async showProductDetails(ctx: CustomerBotContext, productId: string) {
    try {
      const rows = await this.dataSource.query<SupabaseProduct[]>(
        `SELECT id, name, name_uz, price, category, description, description_uz,
                options, calories, discount_percent
         FROM products WHERE id = $1`,
        [productId],
      );

      if (rows.length === 0) {
        await ctx.reply("❌ Товар не найден");
        return;
      }

      const product = rows[0];

      let message = `📦 ${product.name}\n`;
      if (product.name_uz) {
        message += `   ${product.name_uz}\n`;
      }
      message += "\n";

      message += `💰 Цена: ${formatPrice(product.price)} сум\n`;
      if (product.discount_percent) {
        const discounted = Math.round(
          product.price * (1 - product.discount_percent / 100),
        );
        message += `🏷️ Со скидкой: ${formatPrice(discounted)} сум (-${product.discount_percent}%)\n`;
      }
      message += "\n";

      if (product.description) {
        message += `📝 ${product.description}\n\n`;
      }

      // Options (sizes, etc.) from JSONB
      if (
        product.options &&
        Array.isArray(product.options) &&
        product.options.length > 0
      ) {
        message += "📐 Варианты:\n";
        for (const opt of product.options as {
          name?: string;
          price?: number;
        }[]) {
          if (opt.name) {
            message += `  • ${opt.name}`;
            if (opt.price) message += ` — ${formatPrice(opt.price)} сум`;
            message += "\n";
          }
        }
        message += "\n";
      }

      if (product.calories) {
        message += `🔬 ${product.calories} ккал\n\n`;
      }

      const catInfo = CUSTOMER_CATEGORIES.find(
        (c) => c.key === product.category,
      );

      const buttons: ReturnType<typeof Markup.button.callback>[][] = [];
      if (catInfo) {
        buttons.push([
          Markup.button.callback(
            `« ${catInfo.icon} ${catInfo.label}`,
            `cat:${product.category}`,
          ),
        ]);
      }
      buttons.push([Markup.button.callback("📋 Все категории", "catalog")]);
      buttons.push([Markup.button.callback("🏠 В меню", "menu")]);

      const keyboard = Markup.inlineKeyboard(buttons);

      if (ctx.callbackQuery) {
        try {
          await ctx.editMessageText(message, keyboard);
        } catch {
          await ctx.reply(message, keyboard);
        }
      } else {
        await ctx.reply(message, keyboard);
      }
    } catch (err) {
      this.logger.error(`showProductDetails error: ${err}`);
      await ctx.reply("❌ Ошибка загрузки товара.");
    }
  }

  // ---------- Nearby Machines ----------

  async showNearbyMachines(ctx: CustomerBotContext) {
    try {
      const machines = await this.dataSource.query<SupabaseMachine[]>(
        `SELECT id, name, address, status, hours, latitude, longitude
         FROM machines
         WHERE status != 'offline'
         ORDER BY name ASC
         LIMIT 15`,
      );

      if (machines.length === 0) {
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback("🏠 В меню", "menu")],
        ]);
        await ctx.reply("📍 Автоматы не найдены.", keyboard);
        return;
      }

      const statusIcons: Record<string, string> = {
        online: "🟢",
        low_stock: "🟡",
        error: "🔴",
        maintenance: "🔧",
        offline: "⚫",
      };

      let message = "📍 Наши автоматы:\n\n";

      machines.forEach((machine, index) => {
        const icon = statusIcons[machine.status] || "🟢";
        message += `${index + 1}. ${icon} ${machine.name}\n`;
        message += `   📍 ${machine.address}\n`;
        if (machine.hours) {
          message += `   🕐 ${machine.hours}\n`;
        }
        message += "\n";
      });

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("🏠 В меню", "menu")],
      ]);

      if (ctx.callbackQuery) {
        try {
          await ctx.editMessageText(message, keyboard);
        } catch {
          await ctx.reply(message, keyboard);
        }
      } else {
        await ctx.reply(message, keyboard);
      }
    } catch (err) {
      this.logger.error(`showNearbyMachines error: ${err}`);
      await ctx.reply("❌ Ошибка загрузки автоматов. Попробуйте позже.");
    }
  }
}
