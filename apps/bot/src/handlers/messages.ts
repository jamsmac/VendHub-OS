import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { BotContext } from "../types";
import { config } from "../config";
import { api } from "../utils/api";
import { transitionStep, resetStep } from "../states";
import { formatMachinesList } from "../utils/formatters";
import {
  machinesListInline,
  noMachinesInline,
  mainMenuInline,
  complaintConfirmInline,
} from "../keyboards/inline";
import { removeKeyboard, mainMenuKeyboard } from "../keyboards/main";

// ============================================
// Register All Message Handlers
// ============================================

export function registerMessageHandlers(bot: Telegraf<BotContext>) {
  // Location handler
  bot.on(message("location"), handleLocation);

  // Contact handler
  bot.on(message("contact"), handleContact);

  // Photo handler (for complaints with images)
  bot.on(message("photo"), handlePhoto);

  // Text message handler
  bot.on(message("text"), handleText);
}

// ============================================
// Location Handler
// ============================================

async function handleLocation(ctx: BotContext) {
  const msg = ctx.message;
  if (!msg || !("location" in msg) || !msg.location) {
    return;
  }

  const { latitude, longitude } = msg.location;

  // Handle live location for active trip
  if (ctx.session.step === "trip_active" && ctx.session.data?.tripId) {
    const tripId = ctx.session.data.tripId;
    await api.addTripPoint(tripId, latitude, longitude);
    // Don't reply for every point to avoid spam
    return;
  }

  if (ctx.session.step !== "awaiting_location") {
    return;
  }

  await ctx.reply("🔍 Ищу ближайшие автоматы...", removeKeyboard);

  const machines = await api.getNearbyMachines(latitude, longitude);

  if (machines.length === 0) {
    await ctx.reply(
      "😔 К сожалению, рядом не найдено автоматов.\n\n" +
        "Попробуйте расширить радиус поиска в приложении.",
      noMachinesInline(latitude, longitude),
    );
  } else {
    await ctx.reply(formatMachinesList(machines), {
      parse_mode: "Markdown",
      ...machinesListInline(machines, latitude, longitude),
    });
  }

  resetStep(ctx);
}

// ============================================
// Contact Handler
// ============================================

async function handleContact(ctx: BotContext) {
  if (ctx.session.step !== "awaiting_phone") {
    return;
  }

  const msg = ctx.message;
  if (!msg || !("contact" in msg) || !msg.contact) {
    return;
  }
  const contact = msg.contact;

  // Verify it's user's own contact
  if (contact.user_id !== ctx.from?.id) {
    await ctx.reply("❌ Пожалуйста, отправьте свой собственный контакт.");
    return;
  }

  const phone = contact.phone_number;

  // Update user phone
  const user = ctx.from ? await api.getUserByTelegramId(ctx.from.id) : null;
  if (user) {
    await api.updateUserPhone(user.id, phone);
  }

  resetStep(ctx);

  await ctx.reply(`✅ Номер телефона сохранён: ${phone}`, removeKeyboard);

  await ctx.reply("📱 Главное меню:", mainMenuInline);
}

// ============================================
// Photo Handler
// ============================================

async function handlePhoto(ctx: BotContext) {
  if (ctx.session.step !== "awaiting_complaint") {
    return;
  }

  const msg = ctx.message;
  if (!msg || !("photo" in msg) || !msg.photo) {
    return;
  }

  // Store photo info for complaint
  const photos = msg.photo;
  const largestPhoto = photos[photos.length - 1];
  if (!largestPhoto) return;

  ctx.session.data = {
    ...ctx.session.data,
    photoId: largestPhoto.file_id,
  };

  await ctx.reply("📷 Фото получено!\n\n" + "Теперь опишите проблему текстом:");
}

// ============================================
// Text Message Handler
// ============================================

async function handleText(ctx: BotContext) {
  const msg = ctx.message;
  if (!msg || !("text" in msg)) {
    return;
  }
  const text = msg.text;

  // Handle cancel button
  if (text === "❌ Отмена") {
    return handleCancel(ctx);
  }

  // Handle main menu buttons
  if (await handleMainMenuButtons(ctx, text)) {
    return;
  }

  // Handle session steps
  switch (ctx.session.step) {
    case "awaiting_feedback":
      return handleFeedbackText(ctx, text);

    case "awaiting_complaint":
      return handleComplaintText(ctx, text);

    case "awaiting_product_quantity":
      return handleQuantityText(ctx, text);

    default:
      // Unknown message - show help
      await ctx.reply(
        "❓ Не понимаю команду.\n\n" +
          "Используйте /help для получения списка команд или кнопки меню.",
        mainMenuInline,
      );
  }
}

// ============================================
// Main Menu Button Handlers
// ============================================

async function handleMainMenuButtons(
  ctx: BotContext,
  text: string,
): Promise<boolean> {
  switch (text) {
    case "🛒 Каталог":
      await ctx.reply("🛒 Для просмотра каталога найдите ближайший автомат.", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🗺 Найти автоматы", callback_data: "find_machines" }],
            [
              {
                text: "📱 Открыть каталог",
                web_app: { url: `${config.miniAppUrl}/catalog` },
              },
            ],
          ],
        },
      });
      return true;

    case "🗺 Найти автоматы":
      await ctx.reply("📍 Отправьте мне вашу геолокацию:", {
        reply_markup: {
          keyboard: [
            [{ text: "📍 Отправить геолокацию", request_location: true }],
            ["❌ Отмена"],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
      transitionStep(ctx, "awaiting_location");
      return true;

    case "💎 Мои баллы":
      // Trigger points command
      const user = ctx.from ? await api.getUserByTelegramId(ctx.from.id) : null;
      if (user) {
        const loyalty = await api.getUserLoyalty(user.id);
        if (loyalty) {
          await ctx.reply(
            `💎 Ваши баллы: *${loyalty.points.toLocaleString()}*\n` +
              `🏆 Уровень: *${loyalty.tierName}*`,
            {
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "📱 Подробнее",
                      web_app: { url: `${config.miniAppUrl}/loyalty` },
                    },
                  ],
                ],
              },
            },
          );
        } else {
          await ctx.reply(
            "💎 У вас пока нет баллов. Совершите первую покупку!",
          );
        }
      }
      return true;

    case "🎯 Задания":
      await ctx.reply("🎯 Ваши задания:", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📱 Открыть задания",
                web_app: { url: `${config.miniAppUrl}/quests` },
              },
            ],
          ],
        },
      });
      return true;

    case "📜 История":
      await ctx.reply("📜 История покупок:", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📱 Открыть историю",
                web_app: { url: `${config.miniAppUrl}/orders` },
              },
            ],
          ],
        },
      });
      return true;

    case "⚙️ Настройки":
      await ctx.reply("⚙️ Настройки:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🌐 Язык", callback_data: "settings_language" }],
            [
              {
                text: "🔔 Уведомления",
                callback_data: "settings_notifications",
              },
            ],
            [{ text: "📱 Изменить номер", callback_data: "settings_phone" }],
          ],
        },
      });
      return true;

    case "🔙 Назад":
    case "🔙 Главное меню":
      await ctx.reply("📱 Главное меню:", mainMenuKeyboard);
      return true;

    default:
      return false;
  }
}

// ============================================
// Session Step Handlers
// ============================================

async function handleCancel(ctx: BotContext) {
  resetStep(ctx);
  ctx.session.data = undefined;

  await ctx.reply("❌ Отменено", removeKeyboard);
  await ctx.reply("📱 Главное меню:", mainMenuInline);
}

async function handleFeedbackText(ctx: BotContext, text: string) {
  if (!ctx.from) return;
  const user = await api.getUserByTelegramId(ctx.from.id);
  if (!user) return;

  const orderId = ctx.session.data?.orderId;
  const rating = ctx.session.data?.rating || 5;

  await api.submitFeedback(user.id, orderId || null, rating, text);

  resetStep(ctx);
  ctx.session.data = undefined;

  await ctx.reply(
    "✅ Спасибо за отзыв!\n\n" +
      "Мы ценим ваше мнение и постараемся стать лучше.",
    mainMenuInline,
  );
}

async function handleComplaintText(ctx: BotContext, text: string) {
  ctx.session.data = {
    ...ctx.session.data,
    complaintMessage: text,
  };

  await ctx.reply(
    "📋 *Подтвердите жалобу:*\n\n" + `📝 ${text}\n\n` + "Отправить?",
    {
      parse_mode: "Markdown",
      ...complaintConfirmInline,
    },
  );
}

async function handleQuantityText(ctx: BotContext, text: string) {
  const quantity = parseInt(text.replace(/[^\d]/g, ""), 10);

  if (isNaN(quantity) || quantity < 1 || quantity > 10) {
    await ctx.reply("❌ Введите число от 1 до 10");
    return;
  }

  const productId = ctx.session.selectedProductId;
  const machineId = ctx.session.machineId;

  if (!productId || !machineId) {
    resetStep(ctx);
    await ctx.reply("❌ Ошибка. Попробуйте снова.", mainMenuInline);
    return;
  }

  // Add to cart logic would go here
  resetStep(ctx);

  await ctx.reply(`✅ Товар добавлен в корзину (${quantity} шт.)`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🛒 Корзина", callback_data: "view_cart" }],
        [{ text: "➕ Добавить ещё", callback_data: `machine_${machineId}` }],
        [{ text: "✅ Оформить", callback_data: "checkout" }],
      ],
    },
  });
}

export default { registerMessageHandlers };
