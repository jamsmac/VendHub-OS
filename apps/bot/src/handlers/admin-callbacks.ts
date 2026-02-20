/**
 * Admin/Staff Callback Handlers
 * Task management, route display, day stats, and alert callbacks
 * for admin and manager roles.
 * Split from callbacks.ts
 */

import { Telegraf } from "telegraf";
import { BotContext } from "../types";
import { api } from "../utils/api";
import {
  mainMenuInline,
  staffTasksInline,
  staffAlertsInline,
} from "../keyboards/inline";

// ============================================
// Register Admin Callbacks
// ============================================

export function registerAdminCallbacks(bot: Telegraf<BotContext>) {
  bot.action("staff_tasks_active", handleStaffTasksActive);
  bot.action("staff_tasks_completed", handleStaffTasksCompleted);
  bot.action("staff_show_route", handleStaffShowRoute);
  bot.action("staff_day_stats", handleStaffDayStats);
  bot.action("staff_alerts_critical", handleStaffAlertsCritical);
  bot.action("staff_alerts_read_all", handleStaffAlertsReadAll);
}

// ============================================
// Staff Callbacks
// ============================================

async function handleStaffTasksActive(ctx: BotContext) {
  await ctx.answerCbQuery();
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const tasks = await api.getStaffTasks(user.id, "assigned");
  if (tasks.length === 0) {
    await ctx.editMessageText("✅ Нет активных задач!", staffTasksInline);
    return;
  }

  const list = tasks
    .slice(0, 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((t: any, i: number) => {
      const typeLabels: Record<string, string> = {
        refill: "📦",
        collection: "💰",
        cleaning: "🧹",
        repair: "🔧",
        audit: "📋",
      };
      return `${i + 1}. ${typeLabels[t.taskType] || "📋"} ${t.machine?.name || ""} — ${t.taskType}`;
    })
    .join("\n");

  await ctx.editMessageText(
    `📋 *Активные задачи (${tasks.length}):*\n\n${list}`,
    { parse_mode: "Markdown", ...staffTasksInline },
  );
}

async function handleStaffTasksCompleted(ctx: BotContext) {
  await ctx.answerCbQuery();
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const tasks = await api.getStaffTasks(user.id, "completed");
  if (tasks.length === 0) {
    await ctx.editMessageText(
      "📭 Нет завершённых задач за сегодня.",
      staffTasksInline,
    );
    return;
  }

  const list = tasks
    .slice(0, 10)
    .map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any, i: number) =>
        `${i + 1}. ✅ ${t.machine?.name || ""} — ${t.taskType}`,
    )
    .join("\n");

  await ctx.editMessageText(
    `✅ *Завершённые задачи (${tasks.length}):*\n\n${list}`,
    { parse_mode: "Markdown", ...staffTasksInline },
  );
}

async function handleStaffShowRoute(ctx: BotContext) {
  await ctx.answerCbQuery();
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const tasks = await api.getStaffTasks(user.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const active = tasks.filter((t: any) =>
    ["assigned", "in_progress"].includes(t.status),
  );

  if (active.length === 0) {
    await ctx.editMessageText("✅ Маршрут пуст!", mainMenuInline);
    return;
  }

  // Group by machine, build route list
  const machines = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  active.forEach((t: any) => {
    const mid = t.machineId || t.machine?.id;
    if (mid && !machines.has(mid)) {
      machines.set(mid, t.machine?.name || mid);
    }
  });

  const routeList = Array.from(machines.values())
    .map((name, i) => `${i + 1}. 📍 ${name}`)
    .join("\n");

  await ctx.editMessageText(
    `🗺 *Маршрут:*\n\n${routeList}\n\nВсего: ${machines.size} точек`,
    { parse_mode: "Markdown", ...mainMenuInline },
  );
}

async function handleStaffDayStats(ctx: BotContext) {
  await ctx.answerCbQuery();
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const stats = await api.getStaffDayStats(user.id);
  if (!stats) {
    await ctx.editMessageText("📊 Нет данных за сегодня.", mainMenuInline);
    return;
  }

  await ctx.editMessageText(
    `📊 *Статистика дня:*\n\n` +
      `✅ Выполнено: ${stats.completedTasks || 0}\n` +
      `📋 В работе: ${stats.inProgressTasks || 0}\n` +
      `🏭 Автоматов: ${stats.machinesServiced || 0}\n` +
      `🚗 Расстояние: ${stats.distanceKm || 0} км`,
    { parse_mode: "Markdown", ...mainMenuInline },
  );
}

async function handleStaffAlertsCritical(ctx: BotContext) {
  await ctx.answerCbQuery();
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const alerts = await api.getStaffAlerts(user.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const critical = alerts.filter((a: any) => a.severity === "critical");

  if (critical.length === 0) {
    await ctx.editMessageText(
      "✅ Нет критических уведомлений.",
      staffAlertsInline,
    );
    return;
  }

  const list = critical
    .slice(0, 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((a: any, i: number) => `${i + 1}. 🔴 ${a.title || a.message}`)
    .join("\n");

  await ctx.editMessageText(
    `🔴 *Критические (${critical.length}):*\n\n${list}`,
    { parse_mode: "Markdown", ...staffAlertsInline },
  );
}

async function handleStaffAlertsReadAll(ctx: BotContext) {
  await ctx.answerCbQuery("Все прочитаны");
  await ctx.editMessageText(
    "✅ Все уведомления отмечены как прочитанные.",
    mainMenuInline,
  );
}
