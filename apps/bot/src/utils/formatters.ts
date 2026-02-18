import { LoyaltyInfo, Machine, Order, Quest, CartItem } from "../types";
import { formatDistance } from "@vendhub/shared/utils";
export { formatDistance };

/**
 * Format currency amount for Telegram messages
 */
export function formatCurrency(
  amount: number,
  currency: string = "UZS",
): string {
  return `${amount.toLocaleString("ru-RU")} ${currency}`;
}

/**
 * Format date
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format date short
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

// ============================================
// Machine Status
// ============================================

export function getMachineStatusEmoji(status: string): string {
  const statuses: Record<string, string> = {
    online: "🟢",
    offline: "🔴",
    maintenance: "🟡",
  };
  return statuses[status] || "⚪";
}

export function getMachineStatusText(status: string): string {
  const statuses: Record<string, string> = {
    online: "Работает",
    offline: "Не работает",
    maintenance: "Обслуживание",
  };
  return statuses[status] || "Неизвестно";
}

// ============================================
// Loyalty Tier
// ============================================

export function getTierEmoji(tier: string): string {
  const tiers: Record<string, string> = {
    basic: "🥉",
    silver: "🥈",
    gold: "🥇",
    platinum: "💎",
  };
  return tiers[tier] || "🎖";
}

export function getTierName(tier: string): string {
  const tiers: Record<string, string> = {
    basic: "Базовый",
    silver: "Серебряный",
    gold: "Золотой",
    platinum: "Платиновый",
  };
  return tiers[tier] || tier;
}

// ============================================
// Order Status
// ============================================

export function getOrderStatusEmoji(status: string): string {
  const statuses: Record<string, string> = {
    pending: "⏳",
    processing: "🔄",
    ready: "✅",
    dispensing: "📤",
    completed: "✔️",
    cancelled: "❌",
    refunded: "💰",
  };
  return statuses[status] || "❓";
}

export function getOrderStatusText(status: string): string {
  const statuses: Record<string, string> = {
    pending: "Ожидает оплаты",
    processing: "Обрабатывается",
    ready: "Готов",
    dispensing: "Выдача",
    completed: "Завершён",
    cancelled: "Отменён",
    refunded: "Возврат",
  };
  return statuses[status] || status;
}

// ============================================
// Message Templates
// ============================================

export function formatWelcomeMessage(name: string): string {
  return (
    `👋 Привет, ${name}!\n\n` +
    `Добро пожаловать в *VendHub* - умные вендинговые автоматы!\n\n` +
    `🛒 Покупайте напитки и снеки\n` +
    `💎 Копите бонусные баллы\n` +
    `🎯 Выполняйте задания\n` +
    `🎁 Получайте награды\n\n` +
    `Используйте кнопки ниже для навигации:`
  );
}

export function formatHelpMessage(): string {
  return (
    `📚 *Справка по VendHub*\n\n` +
    `*Основные команды:*\n` +
    `/start - Главное меню\n` +
    `/find - Найти ближайшие автоматы\n` +
    `/menu - Меню автомата\n` +
    `/points - Мои бонусные баллы\n` +
    `/quests - Мои задания\n` +
    `/achievements - Мои достижения\n` +
    `/promo - Активировать промокод\n` +
    `/history - История покупок\n` +
    `/referral - Реферальная программа\n` +
    `/cart - Корзина\n` +
    `/settings - Настройки\n` +
    `/support - Поддержка\n\n` +
    `*Для сотрудников:*\n` +
    `/tasks - Мои задачи\n` +
    `/route - Маршрут на сегодня\n` +
    `/report - Дневной отчёт\n` +
    `/alerts - Уведомления\n` +
    `/trip - Управление поездками\n\n` +
    `*Как это работает:*\n` +
    `1️⃣ Найдите ближайший автомат\n` +
    `2️⃣ Откройте приложение\n` +
    `3️⃣ Отсканируйте QR-код на автомате\n` +
    `4️⃣ Выберите товары и оплатите\n` +
    `5️⃣ Получите бонусные баллы!`
  );
}

export function formatLoyaltyMessage(loyalty: LoyaltyInfo): string {
  return (
    `💎 *Ваши бонусные баллы*\n\n` +
    `${getTierEmoji(loyalty.tier)} Уровень: *${getTierName(loyalty.tier)}*\n` +
    `💰 Баллы: *${loyalty.points.toLocaleString()}*\n` +
    `📈 Всего накоплено: *${loyalty.lifetimePoints.toLocaleString()}*\n` +
    `🔄 Кэшбэк: *${loyalty.cashbackPercent}%*\n\n` +
    `До следующего уровня: ${loyalty.pointsToNextTier.toLocaleString()} баллов`
  );
}

export function formatMachinesList(machines: Machine[]): string {
  if (machines.length === 0) {
    return "😔 К сожалению, рядом не найдено автоматов.";
  }

  const list = machines
    .slice(0, 5)
    .map((m, i) => {
      const distance = formatDistance(m.distance || 0);
      const status = getMachineStatusEmoji(m.status);
      return `${i + 1}. ${status} *${m.name}*\n   📍 ${m.address}\n   📏 ${distance}`;
    })
    .join("\n\n");

  return `📍 *Ближайшие автоматы:*\n\n${list}\n\nНайдено: ${machines.length}`;
}

export function formatMachineInfo(machine: Machine): string {
  const status = getMachineStatusEmoji(machine.status);
  const statusText = getMachineStatusText(machine.status);

  return (
    `🏭 *${machine.name}*\n\n` +
    `${status} Статус: ${statusText}\n` +
    `📍 Адрес: ${machine.address}\n` +
    `🏙 Город: ${machine.city}\n` +
    `📦 Товаров: ${machine.productsCount || "N/A"}`
  );
}

export function formatQuestsList(quests: Quest[]): string {
  if (quests.length === 0) {
    return "📭 У вас пока нет активных заданий.";
  }

  const list = quests
    .map((q) => {
      const progress = Math.round((q.progress / q.target) * 100);
      const progressBar = getProgressBar(progress);
      const status = q.completed ? "✅" : "🎯";

      return (
        `${status} *${q.title}*\n` +
        `   ${q.description}\n` +
        `   ${progressBar} ${progress}%\n` +
        `   🎁 Награда: ${q.reward} баллов`
      );
    })
    .join("\n\n");

  return `🎯 *Ваши задания:*\n\n${list}`;
}

export function formatOrdersList(orders: Order[]): string {
  if (orders.length === 0) {
    return "📭 У вас пока нет покупок.";
  }

  const list = orders
    .slice(0, 5)
    .map((o) => {
      const status = getOrderStatusEmoji(o.status);
      const date = formatDateShort(o.createdAt);
      const itemsCount = o.items.reduce((sum, item) => sum + item.quantity, 0);

      return (
        `${status} *#${o.orderNumber}*\n` +
        `   📅 ${date}\n` +
        `   📦 Товаров: ${itemsCount}\n` +
        `   💰 ${formatCurrency(o.totalAmount)}`
      );
    })
    .join("\n\n");

  return `📜 *История покупок:*\n\n${list}`;
}

export function formatCart(cart: CartItem[], _machineId?: string): string {
  if (!cart || cart.length === 0) {
    return "🛒 Ваша корзина пуста.";
  }

  const items = cart
    .map((item, i) => {
      return `${i + 1}. ${item.name} x${item.quantity} — ${formatCurrency(item.price * item.quantity)}`;
    })
    .join("\n");

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    `🛒 *Ваша корзина:*\n\n` +
    `${items}\n\n` +
    `💰 *Итого: ${formatCurrency(total)}*`
  );
}

export function formatReferralMessage(
  referralCode: string,
  referralLink: string,
  count: number,
): string {
  return (
    `🤝 *Реферальная программа*\n\n` +
    `Приглашайте друзей и получайте бонусы!\n\n` +
    `📤 Ваш код: \`${referralCode}\`\n` +
    `🔗 Ваша ссылка:\n${referralLink}\n\n` +
    `*Награды:*\n` +
    `👤 За каждого друга: 500 баллов\n` +
    `🎁 Ваш друг получит: 300 баллов\n\n` +
    `Приглашено друзей: ${count}`
  );
}

export function formatSupportMessage(
  supportUsername: string,
  supportEmail: string,
  supportPhone: string,
): string {
  return (
    `📞 *Служба поддержки VendHub*\n\n` +
    `Мы всегда готовы помочь!\n\n` +
    `📧 Email: ${supportEmail}\n` +
    `📱 Telegram: @${supportUsername}\n` +
    `📞 Телефон: ${supportPhone}\n\n` +
    `⏰ Время работы: 9:00 - 21:00`
  );
}

// ============================================
// Helpers
// ============================================

function getProgressBar(percent: number): string {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

export function truncate(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}
