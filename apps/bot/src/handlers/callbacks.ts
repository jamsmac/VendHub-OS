/**
 * Callback Registration (Coordinator)
 * Delegates to split handler files:
 * - client-callbacks.ts  → Navigation, Points, Machine, Cart, Order,
 *                          Payment, Rating, Settings, Complaint, Achievements
 * - operator-callbacks.ts → Trip management (start, vehicle, route, stops, end)
 * - admin-callbacks.ts    → Staff tasks, route, day stats, alerts
 */

import { Telegraf } from "telegraf";
import { BotContext } from "../types";
import { registerClientCallbacks } from "./client-callbacks";
import { registerOperatorCallbacks } from "./operator-callbacks";
import { registerAdminCallbacks } from "./admin-callbacks";

// ============================================
// Register All Callbacks
// ============================================

export function registerCallbacks(bot: Telegraf<BotContext>) {
  registerClientCallbacks(bot);
  registerOperatorCallbacks(bot);
  registerAdminCallbacks(bot);
}

export default { registerCallbacks };
