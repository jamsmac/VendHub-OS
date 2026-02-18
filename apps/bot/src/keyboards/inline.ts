import { Markup } from "telegraf";
import { config } from "../config";
import {
  Machine,
  Product,
  Quest,
  TripStop,
  Vehicle,
  RouteInfo,
} from "../types";

// ============================================
// Inline Keyboards
// ============================================

/**
 * Main menu inline keyboard
 */
export const mainMenuInline = Markup.inlineKeyboard([
  [Markup.button.webApp("📱 Открыть приложение", config.miniAppUrl)],
  [
    Markup.button.callback("🗺 Найти автоматы", "find_machines"),
    Markup.button.callback("💎 Мои баллы", "my_points"),
  ],
  [
    Markup.button.callback("🎯 Задания", "quests"),
    Markup.button.callback("📜 История", "history"),
  ],
  [Markup.button.callback("❓ Помощь", "help")],
]);

/**
 * Points/Loyalty inline keyboard
 */
export const pointsInline = Markup.inlineKeyboard([
  [Markup.button.callback("🎁 Обменять баллы", "redeem_points")],
  [Markup.button.webApp("📱 Подробнее", `${config.miniAppUrl}/loyalty`)],
  [Markup.button.callback("🔙 Назад", "back_to_menu")],
]);

/**
 * Quests inline keyboard
 */
export const questsInline = Markup.inlineKeyboard([
  [Markup.button.webApp("📱 Открыть задания", `${config.miniAppUrl}/quests`)],
  [Markup.button.callback("🔙 Назад", "back_to_menu")],
]);

/**
 * History inline keyboard
 */
export const historyInline = Markup.inlineKeyboard([
  [Markup.button.webApp("📱 Вся история", `${config.miniAppUrl}/orders`)],
  [Markup.button.callback("🔙 Назад", "back_to_menu")],
]);

/**
 * No machines found inline keyboard
 */
export function noMachinesInline(lat?: number, lng?: number) {
  const mapUrl =
    lat && lng
      ? `${config.miniAppUrl}/map?lat=${lat}&lng=${lng}`
      : `${config.miniAppUrl}/map`;

  return Markup.inlineKeyboard([
    [Markup.button.webApp("📱 Открыть карту", mapUrl)],
    [Markup.button.callback("🔙 Назад", "back_to_menu")],
  ]);
}

/**
 * Machines list inline keyboard
 */
export function machinesListInline(
  machines: Machine[],
  lat?: number,
  lng?: number,
) {
  const mapUrl =
    lat && lng
      ? `${config.miniAppUrl}/map?lat=${lat}&lng=${lng}`
      : `${config.miniAppUrl}/map`;

  return Markup.inlineKeyboard([
    ...machines
      .slice(0, 5)
      .map((m) => [Markup.button.callback(`📍 ${m.name}`, `machine_${m.id}`)]),
    [Markup.button.webApp("🗺 Показать на карте", mapUrl)],
    [Markup.button.callback("🔙 Назад", "back_to_menu")],
  ]);
}

/**
 * Single machine inline keyboard
 */
export function machineInline(machine: Machine) {
  return Markup.inlineKeyboard([
    [
      Markup.button.webApp(
        "🛒 Выбрать товары",
        `${config.miniAppUrl}/machines/${machine.id}`,
      ),
    ],
    [
      Markup.button.url(
        "🗺 Открыть в картах",
        `https://www.google.com/maps?q=${machine.latitude},${machine.longitude}`,
      ),
    ],
    [
      Markup.button.callback(
        "📢 Сообщить о проблеме",
        `report_machine_${machine.id}`,
      ),
    ],
    [Markup.button.callback("🔙 К списку", "find_machines")],
  ]);
}

/**
 * Product inline keyboard
 */
export function productInline(product: Product, machineId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("➖", `qty_minus_${product.id}`),
      Markup.button.callback("1", "qty_display"),
      Markup.button.callback("➕", `qty_plus_${product.id}`),
    ],
    [
      Markup.button.callback(
        "🛒 В корзину",
        `add_to_cart_${product.id}_${machineId}`,
      ),
    ],
    [Markup.button.callback("🔙 Назад", `machine_${machineId}`)],
  ]);
}

/**
 * Cart inline keyboard
 */
export function cartInline(itemCount: number) {
  if (itemCount === 0) {
    return Markup.inlineKeyboard([
      [Markup.button.callback("🛒 Найти автомат", "find_machines")],
      [Markup.button.callback("🔙 Меню", "back_to_menu")],
    ]);
  }

  return Markup.inlineKeyboard([
    [Markup.button.callback("✅ Оформить заказ", "checkout")],
    [Markup.button.callback("🗑 Очистить", "clear_cart")],
    [Markup.button.callback("➕ Добавить ещё", "find_machines")],
    [Markup.button.callback("🔙 Меню", "back_to_menu")],
  ]);
}

/**
 * Order confirmation inline keyboard
 */
export function orderConfirmInline(orderId: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("✅ Подтвердить", `confirm_order_${orderId}`)],
    [Markup.button.callback("❌ Отменить", `cancel_order_${orderId}`)],
    [Markup.button.callback("✏️ Изменить", "edit_cart")],
  ]);
}

/**
 * Payment inline keyboard
 */
export function paymentInline(orderId: string, _amount: number) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("💳 Payme", `pay_payme_${orderId}`)],
    [Markup.button.callback("💳 Click", `pay_click_${orderId}`)],
    [Markup.button.callback("💎 Оплатить баллами", `pay_points_${orderId}`)],
    [Markup.button.callback("❌ Отмена", `cancel_order_${orderId}`)],
  ]);
}

/**
 * Order completed inline keyboard
 */
export function orderCompletedInline(orderId: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("⭐️ Оценить", `rate_order_${orderId}`)],
    [
      Markup.button.webApp(
        "📜 Детали заказа",
        `${config.miniAppUrl}/orders/${orderId}`,
      ),
    ],
    [Markup.button.callback("🔙 Меню", "back_to_menu")],
  ]);
}

/**
 * Rating inline keyboard
 */
export function ratingInline(orderId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("⭐️", `rate_${orderId}_1`),
      Markup.button.callback("⭐️⭐️", `rate_${orderId}_2`),
      Markup.button.callback("⭐️⭐️⭐️", `rate_${orderId}_3`),
    ],
    [
      Markup.button.callback("⭐️⭐️⭐️⭐️", `rate_${orderId}_4`),
      Markup.button.callback("⭐️⭐️⭐️⭐️⭐️", `rate_${orderId}_5`),
    ],
    [Markup.button.callback("⏭ Пропустить", "back_to_menu")],
  ]);
}

/**
 * Referral inline keyboard
 */
export function referralInline(referralLink: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.switchToChat(
        "📤 Поделиться",
        `Присоединяйся к VendHub! ${referralLink}`,
      ),
    ],
    [Markup.button.webApp("📱 Подробнее", `${config.miniAppUrl}/referrals`)],
    [Markup.button.callback("🔙 Назад", "back_to_menu")],
  ]);
}

/**
 * Redeem points inline keyboard
 */
export const redeemPointsInline = Markup.inlineKeyboard([
  [
    Markup.button.webApp(
      "🎁 Каталог наград",
      `${config.miniAppUrl}/loyalty?tab=rewards`,
    ),
  ],
  [Markup.button.callback("🔙 Назад", "my_points")],
]);

/**
 * Quest details inline keyboard
 */
export function questInline(quest: Quest) {
  return Markup.inlineKeyboard([
    [
      Markup.button.webApp(
        "📱 Подробнее",
        `${config.miniAppUrl}/quests/${quest.id}`,
      ),
    ],
    [Markup.button.callback("🔙 К заданиям", "quests")],
  ]);
}

/**
 * Settings inline keyboard
 */
export const settingsInline = Markup.inlineKeyboard([
  [Markup.button.callback("🌐 Язык", "settings_language")],
  [Markup.button.callback("🔔 Уведомления", "settings_notifications")],
  [Markup.button.callback("📱 Изменить номер", "settings_phone")],
  [Markup.button.callback("🔙 Назад", "back_to_menu")],
]);

/**
 * Language selection inline keyboard
 */
export const languageInline = Markup.inlineKeyboard([
  [Markup.button.callback("🇷🇺 Русский", "lang_ru")],
  [Markup.button.callback("🇺🇿 O'zbekcha", "lang_uz")],
  [Markup.button.callback("🇬🇧 English", "lang_en")],
  [Markup.button.callback("🔙 Назад", "settings")],
]);

/**
 * Notifications settings inline keyboard
 */
export function notificationsInline(enabled: boolean) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        enabled ? "🔔 Включены ✓" : "🔕 Выключены",
        "toggle_notifications",
      ),
    ],
    [Markup.button.callback("🔙 Назад", "settings")],
  ]);
}

/**
 * Complaint confirmation inline keyboard
 */
export const complaintConfirmInline = Markup.inlineKeyboard([
  [Markup.button.callback("✅ Отправить", "send_complaint")],
  [Markup.button.callback("❌ Отмена", "cancel_complaint")],
]);

/**
 * Back to menu inline keyboard
 */
export const backToMenuInline = Markup.inlineKeyboard([
  [Markup.button.callback("🔙 Главное меню", "back_to_menu")],
]);

// ============================================
// Trip Keyboards
// ============================================

/**
 * Trip menu inline keyboard
 */
export const tripMenuInline = Markup.inlineKeyboard([
  [Markup.button.callback("🚀 Nachat' poezdku", "trip_start")],
  [Markup.button.callback("📋 Moi poezdki", "trip_history")],
  [Markup.button.callback("🔙 Nazad", "back_to_menu")],
]);

/**
 * Active trip inline keyboard
 */
export function activeTripInline(tripId: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📍 Ostanovki", `trip_stops_${tripId}`)],
    [Markup.button.callback("🏁 Zavershit' poezdku", `trip_end_${tripId}`)],
    [Markup.button.callback("🔙 Nazad", "back_to_menu")],
  ]);
}

/**
 * Vehicle selection inline keyboard
 */
export function vehicleSelectInline(vehicles: Vehicle[]) {
  return Markup.inlineKeyboard([
    ...vehicles
      .slice(0, 8)
      .map((v) => [
        Markup.button.callback(
          `🚗 ${v.plate} (${v.model})`,
          `trip_vehicle_${v.id}`,
        ),
      ]),
    [Markup.button.callback("❌ Otmena", "back_to_menu")],
  ]);
}

/**
 * Route selection inline keyboard
 */
export function routeSelectInline(routes: RouteInfo[]) {
  return Markup.inlineKeyboard([
    ...routes
      .slice(0, 8)
      .map((r) => [
        Markup.button.callback(
          `📍 ${r.name} (${r.stopsCount} ost.)`,
          `trip_route_${r.id}`,
        ),
      ]),
    [Markup.button.callback("⏭ Bez marshruta", "trip_route_none")],
    [Markup.button.callback("❌ Otmena", "back_to_menu")],
  ]);
}

/**
 * Trip stops inline keyboard
 */
export function tripStopsInline(tripId: string, stops: TripStop[]) {
  return Markup.inlineKeyboard([
    ...stops
      .filter((s) => s.status !== "completed")
      .slice(0, 6)
      .map((s) => {
        const icon = s.status === "arrived" ? "📍" : "⬜️";
        return [
          Markup.button.callback(
            `${icon} ${s.sequence}. ${s.name}`,
            `trip_complete_stop_${tripId}_${s.id}`,
          ),
        ];
      }),
    [Markup.button.callback("🔙 K poezdke", `trip_status_${tripId}`)],
  ]);
}

/**
 * Trip completed inline keyboard
 */
export function tripCompletedInline(tripId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.webApp(
        "📊 Detali poezdki",
        `${config.miniAppUrl}/trips/${tripId}`,
      ),
    ],
    [Markup.button.callback("🔙 Menyu", "back_to_menu")],
  ]);
}

/**
 * Achievements inline keyboard
 */
export const achievementsInline = Markup.inlineKeyboard([
  [
    Markup.button.webApp(
      "🏆 Все достижения",
      `${config.miniAppUrl}/achievements`,
    ),
  ],
  [Markup.button.callback("🔙 Назад", "back_to_menu")],
]);

/**
 * Promo code inline keyboard
 */
export const promoInline = Markup.inlineKeyboard([
  [
    Markup.button.webApp(
      "🎟 Ввести в приложении",
      `${config.miniAppUrl}/promo-code`,
    ),
  ],
  [Markup.button.callback("🔙 Назад", "back_to_menu")],
]);

/**
 * Menu selection inline keyboard
 */
export function menuMachineInline(machineId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.webApp(
        "📱 Открыть меню",
        `${config.miniAppUrl}/menu/${machineId}`,
      ),
    ],
    [Markup.button.callback("🔙 Назад", "back_to_menu")],
  ]);
}

/**
 * Staff tasks inline keyboard
 */
export const staffTasksInline = Markup.inlineKeyboard([
  [Markup.button.callback("📋 Активные задачи", "staff_tasks_active")],
  [Markup.button.callback("✅ Выполненные", "staff_tasks_completed")],
  [Markup.button.callback("🔙 Назад", "back_to_menu")],
]);

/**
 * Staff route inline keyboard
 */
export const staffRouteInline = Markup.inlineKeyboard([
  [Markup.button.callback("🗺 Показать маршрут", "staff_show_route")],
  [Markup.button.callback("📊 Статистика дня", "staff_day_stats")],
  [Markup.button.callback("🔙 Назад", "back_to_menu")],
]);

/**
 * Staff alerts inline keyboard
 */
export const staffAlertsInline = Markup.inlineKeyboard([
  [Markup.button.callback("🔴 Только критичные", "staff_alerts_critical")],
  [Markup.button.callback("✅ Отметить все", "staff_alerts_read_all")],
  [Markup.button.callback("🔙 Назад", "back_to_menu")],
]);

/**
 * Pagination inline keyboard
 */
export function paginationInline(
  currentPage: number,
  totalPages: number,
  baseCallback: string,
) {
  const buttons = [];

  if (currentPage > 1) {
    buttons.push(
      Markup.button.callback("◀️", `${baseCallback}_${currentPage - 1}`),
    );
  }

  buttons.push(Markup.button.callback(`${currentPage}/${totalPages}`, "noop"));

  if (currentPage < totalPages) {
    buttons.push(
      Markup.button.callback("▶️", `${baseCallback}_${currentPage + 1}`),
    );
  }

  return Markup.inlineKeyboard([
    buttons,
    [Markup.button.callback("🔙 Назад", "back_to_menu")],
  ]);
}
