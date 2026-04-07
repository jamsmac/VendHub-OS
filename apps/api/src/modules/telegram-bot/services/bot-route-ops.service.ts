/**
 * Staff Bot — Route Operations Sub-Service
 * Route/trip management: start, end, GPS tracking, stop completion.
 * Uses TypeORM to query routes, route_stops, vehicles.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Telegraf, Markup } from "telegraf";
import { BotContext, TelegramSession } from "./bot-types";
import {
  Route,
  RouteStatus,
  RouteStopStatus,
} from "../../routes/entities/route.entity";
import { RoutePoint } from "../../routes/entities/route-point.entity";
import { Vehicle } from "../../vehicles/entities/vehicle.entity";

@Injectable()
export class BotRouteOpsService {
  private readonly logger = new Logger(BotRouteOpsService.name);
  private bot: Telegraf<BotContext>;
  private sessions: Map<number, TelegramSession>;

  constructor(
    @InjectRepository(Route)
    private readonly routeRepo: Repository<Route>,
    @InjectRepository(RoutePoint)
    private readonly routePointRepo: Repository<RoutePoint>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
  ) {}

  setBot(bot: Telegraf<BotContext>, sessions: Map<number, TelegramSession>) {
    this.bot = bot;
    this.sessions = sessions;
  }

  // ---------- Active Route ----------

  async showActiveRoute(ctx: BotContext) {
    if (!ctx.user) {
      await ctx.reply("❌ Вы не зарегистрированы. Используйте /start");
      return;
    }

    let activeRoute: Route | null = null;
    try {
      activeRoute = await this.routeRepo.findOne({
        where: {
          operatorId: ctx.user.id,
          status: RouteStatus.ACTIVE,
        },
        relations: ["vehicle"],
      });
    } catch {
      // Table may not exist
    }

    if (activeRoute) {
      await this.showRouteStatus(ctx, activeRoute);
      return;
    }

    // No active route — show route menu
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("🚀 Начать маршрут", "route_start")],
      [Markup.button.callback("📋 История маршрутов", "route_history")],
      [Markup.button.callback("🏠 В меню", "menu")],
    ]);

    await ctx.reply(
      "🗺 Управление маршрутами\n\nНет активного маршрута.",
      keyboard,
    );
  }

  // ---------- Route Status ----------

  private async showRouteStatus(ctx: BotContext, route: Route) {
    const startedAt = route.startedAt
      ? new Date(route.startedAt).toLocaleTimeString("ru-RU")
      : "—";

    // Count stops
    let totalStops = 0;
    let completedStops = 0;
    try {
      const stops = (route as unknown as Record<string, unknown>).stops as
        | { status: string }[]
        | undefined;
      if (Array.isArray(stops)) {
        totalStops = stops.length;
        completedStops = stops.filter(
          (s) => s.status === RouteStopStatus.COMPLETED,
        ).length;
      }
    } catch {
      // Ignore
    }

    const vehicleName = route.vehicle
      ? `${(route.vehicle as unknown as Record<string, unknown>).model ?? ""} (${(route.vehicle as unknown as Record<string, unknown>).plateNumber ?? ""})`
      : "—";

    const message =
      `🗺 Активный маршрут\n\n` +
      `📍 Название: ${route.name ?? "Маршрут"}\n` +
      `🚗 Транспорт: ${vehicleName}\n` +
      `⏰ Начат: ${startedAt}\n` +
      `📊 Остановки: ${completedStops}/${totalStops}\n` +
      `🔄 Статус: В пути`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("📍 Остановки", `route_stops:${route.id}`)],
      [Markup.button.callback("🏁 Завершить маршрут", `route_end:${route.id}`)],
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
  }

  // ---------- Start Route ----------

  async showVehicleSelection(ctx: BotContext) {
    if (!ctx.user || !ctx.organizationId) return;

    let vehicles: Vehicle[] = [];
    try {
      vehicles = await this.vehicleRepo.find({
        where: {
          organizationId: ctx.organizationId,
          status: "available" as unknown,
        } as unknown as Record<string, unknown>,
        take: 8,
      });
    } catch {
      // Table may not exist
    }

    if (vehicles.length === 0) {
      await ctx.reply(
        "🚗 Нет доступных транспортных средств.\n" + "Обратитесь к менеджеру.",
        Markup.inlineKeyboard([[Markup.button.callback("🏠 В меню", "menu")]]),
      );
      return;
    }

    const buttons = vehicles.map((v) => [
      Markup.button.callback(
        `🚗 ${(v as unknown as Record<string, unknown>).model ?? ""} (${(v as unknown as Record<string, unknown>).plateNumber ?? ""})`,
        `route_vehicle:${v.id}`,
      ),
    ]);
    buttons.push([Markup.button.callback("❌ Отмена", "menu")]);

    await ctx.reply(
      "🚗 Выберите транспортное средство:",
      Markup.inlineKeyboard(buttons),
    );
  }

  async selectVehicleAndStart(ctx: BotContext, vehicleId: string) {
    if (!ctx.user || !ctx.organizationId) return;

    // Find planned route for today
    let plannedRoute: Route | null = null;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      plannedRoute = await this.routeRepo.findOne({
        where: {
          operatorId: ctx.user.id,
          status: RouteStatus.PLANNED,
          organizationId: ctx.organizationId,
        },
        order: { createdAt: "DESC" },
      });
    } catch {
      // Table may not exist
    }

    if (plannedRoute) {
      // Activate planned route
      try {
        plannedRoute.status = RouteStatus.ACTIVE;
        plannedRoute.vehicleId = vehicleId;
        (plannedRoute as unknown as Record<string, unknown>).startedAt =
          new Date();
        await this.routeRepo.save(plannedRoute);

        await ctx.reply(
          `✅ Маршрут "${plannedRoute.name ?? "Маршрут"}" начат!\n\n` +
            "Отправляйте геолокацию для отслеживания.",
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "📍 Остановки",
                `route_stops:${plannedRoute.id}`,
              ),
            ],
            [Markup.button.callback("🏠 В меню", "menu")],
          ]),
        );
      } catch (err) {
        this.logger.error(`Failed to start route: ${err}`);
        await ctx.reply("❌ Не удалось начать маршрут.");
      }
    } else {
      // Create new ad-hoc route
      try {
        const route = this.routeRepo.create({
          operatorId: ctx.user.id,
          organizationId: ctx.organizationId,
          vehicleId,
          status: RouteStatus.ACTIVE,
          name: `Маршрут ${new Date().toLocaleDateString("ru-RU")}`,
        } as Partial<Route>);
        (route as unknown as Record<string, unknown>).startedAt = new Date();
        const saved = await this.routeRepo.save(route);

        await ctx.reply(
          "✅ Маршрут начат!\n\nОтправляйте геолокацию для отслеживания.",
          Markup.inlineKeyboard([
            [Markup.button.callback("📍 Остановки", `route_stops:${saved.id}`)],
            [Markup.button.callback("🏠 В меню", "menu")],
          ]),
        );
      } catch (err) {
        this.logger.error(`Failed to create route: ${err}`);
        await ctx.reply("❌ Не удалось создать маршрут.");
      }
    }
  }

  // ---------- End Route ----------

  async endRoute(ctx: BotContext, routeId: string) {
    if (!ctx.user) return;

    try {
      const route = await this.routeRepo.findOne({
        where: { id: routeId, operatorId: ctx.user.id },
      });

      if (!route || route.status !== RouteStatus.ACTIVE) {
        await ctx.reply("❌ Маршрут не найден или уже завершён.");
        return;
      }

      route.status = RouteStatus.COMPLETED;
      (route as unknown as Record<string, unknown>).completedAt = new Date();
      await this.routeRepo.save(route);

      const startedAt = (route as unknown as Record<string, unknown>)
        .startedAt as Date | null;
      let duration = "—";
      if (startedAt) {
        const mins = Math.round(
          (Date.now() - new Date(startedAt).getTime()) / 60000,
        );
        const hours = Math.floor(mins / 60);
        duration = hours > 0 ? `${hours}ч ${mins % 60}м` : `${mins}м`;
      }

      await ctx.reply(
        `🏁 Маршрут завершён!\n\n` +
          `⏱ Продолжительность: ${duration}\n` +
          `📍 Маршрут: ${route.name ?? "Маршрут"}`,
        Markup.inlineKeyboard([
          [Markup.button.callback("📊 Статистика дня", "day_stats")],
          [Markup.button.callback("🏠 В меню", "menu")],
        ]),
      );
    } catch (err) {
      this.logger.error(`Failed to end route: ${err}`);
      await ctx.reply("❌ Не удалось завершить маршрут.");
    }
  }

  // ---------- Route History ----------

  async showRouteHistory(ctx: BotContext) {
    if (!ctx.user) return;

    let routes: Route[] = [];
    try {
      routes = await this.routeRepo.find({
        where: {
          operatorId: ctx.user.id,
          status: In([RouteStatus.COMPLETED, RouteStatus.AUTO_CLOSED]),
        },
        order: { createdAt: "DESC" },
        take: 5,
      });
    } catch {
      // Table may not exist
    }

    if (routes.length === 0) {
      await ctx.reply(
        "📋 История маршрутов\n\nУ вас пока нет завершённых маршрутов.",
        Markup.inlineKeyboard([[Markup.button.callback("🏠 В меню", "menu")]]),
      );
      return;
    }

    let message = "📋 Последние маршруты\n\n";
    for (const route of routes) {
      const date = route.createdAt
        ? new Date(route.createdAt).toLocaleDateString("ru-RU")
        : "";
      const statusIcon = route.status === RouteStatus.COMPLETED ? "✅" : "⏰";
      message += `${statusIcon} ${route.name ?? "Маршрут"} — ${date}\n`;
    }

    await ctx.reply(
      message,
      Markup.inlineKeyboard([[Markup.button.callback("🏠 В меню", "menu")]]),
    );
  }

  // ---------- GPS Tracking ----------

  async handleGpsPoint(ctx: BotContext, latitude: number, longitude: number) {
    if (!ctx.user) return;

    // Find active route
    let activeRoute: Route | null = null;
    try {
      activeRoute = await this.routeRepo.findOne({
        where: {
          operatorId: ctx.user.id,
          status: RouteStatus.ACTIVE,
        },
      });
    } catch {
      return;
    }

    if (!activeRoute) return;

    // Save GPS point silently (no reply to avoid spam)
    try {
      const point = this.routePointRepo.create({
        routeId: activeRoute.id,
        latitude,
        longitude,
        timestamp: new Date(),
      } as Partial<RoutePoint>);
      await this.routePointRepo.save(point);
    } catch (err) {
      this.logger.debug(`Failed to save GPS point: ${err}`);
    }
  }
}
