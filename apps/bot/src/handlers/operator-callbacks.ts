/**
 * Operator Callback Handlers
 * Trip management callbacks for field operators (start, history,
 * vehicle/route selection, stops, status, end trip).
 * Split from callbacks.ts
 */

import { Telegraf } from "telegraf";
import { BotContext } from "../types";
import { api } from "../utils/api";
import { transitionStep, resetStep } from "../states";
import {
  backToMenuInline,
  activeTripInline,
  vehicleSelectInline,
  routeSelectInline,
  tripStopsInline,
  tripCompletedInline,
} from "../keyboards/inline";

// ============================================
// Register Operator Callbacks
// ============================================

export function registerOperatorCallbacks(bot: Telegraf<BotContext>) {
  bot.action("trip_start", handleTripStartCb);
  bot.action("trip_history", handleTripHistory);
  bot.action(/^trip_vehicle_(.+)$/, handleTripVehicleSelect);
  bot.action(/^trip_route_(.+)$/, handleTripRouteSelect);
  bot.action(/^trip_end_(.+)$/, handleTripEndCb);
  bot.action(/^trip_stops_(.+)$/, handleTripStopsList);
  bot.action(/^trip_status_(.+)$/, handleTripStatusCb);
  bot.action(/^trip_complete_stop_(.+)_(.+)$/, handleTripCompleteStop);
}

// ============================================
// Trip Callbacks
// ============================================

async function handleTripStartCb(ctx: BotContext) {
  await ctx.answerCbQuery();

  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const activeTrip = await api.getActiveTrip(user.id);
  if (activeTrip) {
    await ctx.editMessageText("⚠️ У вас уже есть активная поездка.", {
      ...activeTripInline(activeTrip.id),
    });
    return;
  }

  const vehicles = await api.getAvailableVehicles();
  if (vehicles.length === 0) {
    await ctx.editMessageText("❌ Нет доступных ТС.", backToMenuInline);
    return;
  }

  transitionStep(ctx, "trip_selecting_vehicle");
  ctx.session.data = {};

  await ctx.editMessageText("🚗 *Выбор транспорта*\n\nВыберите ТС:", {
    parse_mode: "Markdown",
    ...vehicleSelectInline(vehicles),
  });
}

async function handleTripHistory(ctx: BotContext) {
  await ctx.answerCbQuery();

  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const trips = await api.getUserTrips(user.id, 5);
  if (trips.length === 0) {
    await ctx.editMessageText("ℹ️ У вас пока нет поездок.", backToMenuInline);
    return;
  }

  const tripsList = trips
    .map((t, i) => {
      const date = t.startedAt
        ? new Date(t.startedAt).toLocaleDateString("ru-RU")
        : "N/A";
      const statusIcon =
        t.status === "completed"
          ? "✅"
          : t.status === "in_progress"
            ? "🚗"
            : "❌";
      return `${i + 1}. ${statusIcon} ${t.routeName || "Без маршрута"} — ${date}`;
    })
    .join("\n");

  await ctx.editMessageText(`📋 *Последние поездки:*\n\n${tripsList}`, {
    parse_mode: "Markdown",
    ...backToMenuInline,
  });
}

async function handleTripVehicleSelect(ctx: BotContext) {
  await ctx.answerCbQuery();
  const vehicleId = ctx.match?.[1];
  if (!vehicleId) return;

  ctx.session.data = { ...ctx.session.data, vehicleId };
  transitionStep(ctx, "trip_selecting_route");

  const routes = await api.getAvailableRoutes();
  if (routes.length === 0) {
    // No routes available, start without route
    const user = await api.getUserByTelegramId(ctx.from!.id);
    if (!user) return;

    const trip = await api.startTrip(user.id, vehicleId);
    if (!trip) {
      await ctx.editMessageText(
        "❌ Ошибка создания поездки.",
        backToMenuInline,
      );
      return;
    }

    transitionStep(ctx, "trip_active");
    ctx.session.data = { tripId: trip.id };

    await ctx.editMessageText(
      "✅ *Поездка начата!*\n\n" +
        `ТС: ${trip.vehiclePlate || "N/A"}\n` +
        "Отправляйте геолокацию для отслеживания.",
      { parse_mode: "Markdown", ...activeTripInline(trip.id) },
    );
    return;
  }

  await ctx.editMessageText(
    "📍 *Выбор маршрута*\n\nВыберите маршрут или начните без маршрута:",
    { parse_mode: "Markdown", ...routeSelectInline(routes) },
  );
}

async function handleTripRouteSelect(ctx: BotContext) {
  await ctx.answerCbQuery();
  const routeId = ctx.match?.[1];
  const vehicleId = ctx.session.data?.vehicleId;

  if (!vehicleId) {
    await ctx.editMessageText(
      "❌ Ошибка: транспорт не выбран.",
      backToMenuInline,
    );
    return;
  }

  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const trip = await api.startTrip(
    user.id,
    vehicleId,
    routeId === "none" ? undefined : routeId,
  );

  if (!trip) {
    await ctx.editMessageText("❌ Ошибка создания поездки.", backToMenuInline);
    return;
  }

  transitionStep(ctx, "trip_active");
  ctx.session.data = { tripId: trip.id };

  await ctx.editMessageText(
    "✅ *Поездка начата!*\n\n" +
      `Маршрут: ${trip.routeName || "Без маршрута"}\n` +
      `ТС: ${trip.vehiclePlate || "N/A"}\n\n` +
      "📍 Отправляйте геолокацию для отслеживания.",
    { parse_mode: "Markdown", ...activeTripInline(trip.id) },
  );
}

async function handleTripEndCb(ctx: BotContext) {
  await ctx.answerCbQuery();
  const tripId = ctx.match?.[1];
  if (!tripId) return;

  const result = await api.endTrip(tripId);
  if (!result) {
    await ctx.editMessageText(
      "❌ Ошибка завершения поездки.",
      backToMenuInline,
    );
    return;
  }

  resetStep(ctx);
  ctx.session.data = undefined;

  const duration =
    result.startedAt && result.completedAt
      ? Math.round(
          (new Date(result.completedAt).getTime() -
            new Date(result.startedAt).getTime()) /
            60000,
        )
      : 0;

  await ctx.editMessageText(
    `✅ *Поездка завершена!*\n\n` +
      `Маршрут: ${result.routeName || "Без маршрута"}\n` +
      `Длительность: ${duration} мин\n` +
      `Остановки: ${result.stopsCompleted}/${result.stopsTotal}\n` +
      `Аномалий: ${result.anomaliesCount}`,
    { parse_mode: "Markdown", ...tripCompletedInline(tripId) },
  );
}

async function handleTripStopsList(ctx: BotContext) {
  await ctx.answerCbQuery();
  const tripId = ctx.match?.[1];
  if (!tripId) return;

  const stops = await api.getTripStops(tripId);
  if (stops.length === 0) {
    await ctx.editMessageText(
      "ℹ️ В поездке нет остановок.",
      activeTripInline(tripId),
    );
    return;
  }

  const stopsList = stops
    .map((s) => {
      const icon =
        s.status === "completed" ? "✅" : s.status === "arrived" ? "📍" : "⬜️";
      return `${icon} ${s.sequence}. ${s.name}${s.address ? ` — ${s.address}` : ""}`;
    })
    .join("\n");

  await ctx.editMessageText(
    `📍 *Остановки:*\n\n${stopsList}\n\nНажмите на остановку для отметки:`,
    { parse_mode: "Markdown", ...tripStopsInline(tripId, stops) },
  );
}

async function handleTripStatusCb(ctx: BotContext) {
  await ctx.answerCbQuery();
  const tripId = ctx.match?.[1];
  if (!tripId) return;

  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const activeTrip = await api.getActiveTrip(user.id);
  if (!activeTrip) {
    await ctx.editMessageText("ℹ️ Поездка не найдена.", backToMenuInline);
    return;
  }

  const elapsed = activeTrip.startedAt
    ? Math.round(
        (Date.now() - new Date(activeTrip.startedAt).getTime()) / 60000,
      )
    : 0;

  await ctx.editMessageText(
    `🚗 *Статус поездки*\n\n` +
      `Маршрут: ${activeTrip.routeName || "Без маршрута"}\n` +
      `ТС: ${activeTrip.vehiclePlate || "N/A"}\n` +
      `В пути: ${elapsed} мин\n` +
      `Остановки: ${activeTrip.stopsCompleted}/${activeTrip.stopsTotal}\n` +
      `Аномалий: ${activeTrip.anomaliesCount}`,
    { parse_mode: "Markdown", ...activeTripInline(activeTrip.id) },
  );
}

async function handleTripCompleteStop(ctx: BotContext) {
  await ctx.answerCbQuery("Отмечено!");
  const tripId = ctx.match?.[1];
  const stopId = ctx.match?.[2];
  if (!tripId || !stopId) return;

  const success = await api.completeStop(tripId, stopId);
  if (!success) {
    await ctx.answerCbQuery("Ошибка отметки остановки");
    return;
  }

  // Refresh stops list
  const stops = await api.getTripStops(tripId);
  const stopsList = stops
    .map((s) => {
      const icon =
        s.status === "completed" ? "✅" : s.status === "arrived" ? "📍" : "⬜️";
      return `${icon} ${s.sequence}. ${s.name}`;
    })
    .join("\n");

  const completed = stops.filter((s) => s.status === "completed").length;

  await ctx.editMessageText(
    `📍 *Остановки (${completed}/${stops.length}):*\n\n${stopsList}`,
    { parse_mode: "Markdown", ...tripStopsInline(tripId, stops) },
  );
}
