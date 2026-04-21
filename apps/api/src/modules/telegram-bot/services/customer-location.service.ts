/**
 * Customer Bot — Location Sub-Service
 * Find nearby vending machines by geolocation.
 * Uses TypeORM to query machines table with distance calculation.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Telegraf, Markup } from "telegraf";
import {
  CustomerBotContext,
  CustomerSession,
  CustomerSessionState,
} from "./customer-types";
import { Machine } from "../../machines/entities/machine.entity";

const SEARCH_RADIUS_KM = 5;

@Injectable()
export class CustomerLocationService {
  private readonly logger = new Logger(CustomerLocationService.name);
  private bot: Telegraf<CustomerBotContext>;
  private sessions: Map<number, CustomerSession>;

  constructor(
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
  ) {}

  setBot(
    bot: Telegraf<CustomerBotContext>,
    sessions: Map<number, CustomerSession>,
  ) {
    this.bot = bot;
    this.sessions = sessions;
  }

  // ---------- Request Location ----------

  async requestLocation(ctx: CustomerBotContext) {
    const session = this.getOrCreateSession(ctx.from!.id);
    session.state = CustomerSessionState.AWAITING_LOCATION;
    this.sessions.set(ctx.from!.id, session);

    await ctx.reply(
      "📍 Отправьте вашу геолокацию, чтобы найти ближайшие автоматы VendHub.",
      Markup.keyboard([
        [Markup.button.locationRequest("📍 Отправить местоположение")],
        ["❌ Отмена"],
      ]).resize(),
    );
  }

  // ---------- Handle Location ----------

  async handleLocation(ctx: CustomerBotContext, lat: number, lng: number) {
    const session = this.sessions.get(ctx.from!.id);
    if (session) {
      session.state = CustomerSessionState.IDLE;
    }

    // Remove location keyboard
    await ctx.reply("🔍 Ищу ближайшие автоматы...", Markup.removeKeyboard());

    let machines: (Machine & { distance_km?: number })[] = [];

    try {
      // Haversine-based distance query for PostgreSQL
      const result = await this.machineRepo
        .createQueryBuilder("m")
        .addSelect(
          `(6371 * acos(cos(radians(:lat)) * cos(radians(m.latitude)) * cos(radians(m.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(m.latitude))))`,
          "distance_km",
        )
        .where("m.latitude IS NOT NULL")
        .andWhere("m.longitude IS NOT NULL")
        .andWhere("m.status = :status", { status: "active" })
        .andWhere("m.deleted_at IS NULL")
        .setParameters({ lat, lng })
        .having("distance_km <= :radius", { radius: SEARCH_RADIUS_KM })
        .orderBy("distance_km", "ASC")
        .limit(5)
        .getRawAndEntities();

      machines = result.entities.map((entity, idx) => {
        const raw = result.raw[idx];
        const m = entity as Machine & { distance_km?: number };
        if (raw) m.distance_km = parseFloat(raw.distance_km);
        return m;
      });
    } catch (err) {
      this.logger.error(`Failed to query nearby machines: ${err}`);
    }

    if (machines.length === 0) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("🔄 Попробовать снова", "find_machines")],
        [Markup.button.callback("🏠 В меню", "menu")],
      ]);
      await ctx.reply(
        `😔 В радиусе ${SEARCH_RADIUS_KM} км автоматы не найдены.\n` +
          "Попробуйте из другого места или расширьте поиск.",
        keyboard,
      );
      return;
    }

    let message = `📍 Найдено ${machines.length} автомат${this.pluralize(machines.length)} рядом:\n\n`;

    const buttons: (
      | ReturnType<typeof Markup.button.callback>
      | ReturnType<typeof Markup.button.url>
    )[][] = [];

    for (const machine of machines) {
      const dist = machine.distance_km
        ? `${machine.distance_km.toFixed(1)} км`
        : "";
      const address =
        (machine as unknown as Record<string, unknown>).address ?? "";
      message += `🏪 ${machine.name ?? machine.machineNumber}\n`;
      if (address) message += `   📍 ${address}\n`;
      if (dist) message += `   📏 ${dist}\n`;
      message += "\n";

      const machineButtons: (
        | ReturnType<typeof Markup.button.callback>
        | ReturnType<typeof Markup.button.url>
      )[] = [
        Markup.button.callback(
          `📋 ${machine.name ?? machine.machineNumber}`,
          `machine:${machine.id}`,
        ),
      ];

      if (machine.latitude && machine.longitude) {
        machineButtons.push(
          Markup.button.url(
            "🗺",
            `https://maps.google.com/maps?q=${machine.latitude},${machine.longitude}`,
          ),
        );
      }

      buttons.push(machineButtons);
    }

    buttons.push([Markup.button.callback("🏠 В меню", "menu")]);

    await ctx.reply(message, Markup.inlineKeyboard(buttons));
  }

  // ---------- Helpers ----------

  private getOrCreateSession(userId: number): CustomerSession {
    return (
      this.sessions.get(userId) ?? {
        state: CustomerSessionState.IDLE,
        data: {},
      }
    );
  }

  private pluralize(n: number): string {
    if (n % 10 === 1 && n % 100 !== 11) return "";
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100))
      return "а";
    return "ов";
  }
}
