/**
 * Owner User Seed Script
 *
 * Creates or updates the owner (superadmin) user for VendHub OS.
 * Run: npx ts-node -P tsconfig.json src/database/seeds/owner-seed.ts
 */

import { DataSource } from "typeorm";
import { Logger } from "@nestjs/common";
import { config } from "dotenv";
import * as bcrypt from "bcrypt";
import { randomUUID } from "crypto";

config({ path: ".env.local" });
config({ path: ".env" });

const logger = new Logger("OwnerSeed");

function getOwnerConfig() {
  const password = process.env.OWNER_PASSWORD;
  if (!password) {
    logger.error(
      "OWNER_PASSWORD env var is required.\n" +
        "Usage: OWNER_EMAIL=x OWNER_PASSWORD=y npx ts-node -P tsconfig.json src/database/seeds/owner-seed.ts",
    );
    process.exit(1);
  }
  return {
    email: process.env.OWNER_EMAIL || "admin@vendhub.uz",
    password,
    firstName: process.env.OWNER_FIRST_NAME || "Admin",
    lastName: process.env.OWNER_LAST_NAME || "Owner",
    phone: process.env.OWNER_PHONE || "+998901234567",
    telegramId: process.env.OWNER_TELEGRAM_ID || "",
    role: "owner" as const,
    status: "active" as const,
  };
}

const OWNER = getOwnerConfig();

async function seedOwner() {
  logger.log("Starting owner seed...");

  const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USER || "vendhub",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "vendhub",
    ssl:
      process.env.DB_SSL === "false"
        ? false
        : process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    logger.log("Database connection established");

    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // 1. Ensure organization exists
      const existingOrg = await qr.query(
        `SELECT id FROM organizations WHERE slug = $1 AND deleted_at IS NULL LIMIT 1`,
        ["vendhub-hq"],
      );

      let organizationId: string;

      if (existingOrg.length > 0) {
        organizationId = existingOrg[0].id;
        logger.log(`Using existing org: ${organizationId}`);
      } else {
        organizationId = randomUUID();
        await qr.query(
          `INSERT INTO organizations (id, name, slug, type, status, settings, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())`,
          [
            organizationId,
            "VendHub HQ",
            "vendhub-hq",
            "headquarters",
            "active",
            JSON.stringify({
              timezone: "Asia/Tashkent",
              currency: "UZS",
              language: "ru",
            }),
          ],
        );
        logger.log(`Created org VendHub HQ: ${organizationId}`);
      }

      // 2. Hash password
      const passwordHash = await bcrypt.hash(OWNER.password, 12);

      // 3. Upsert owner user
      const existingUser = await qr.query(
        `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
        [OWNER.email],
      );

      let userId: string;

      if (existingUser.length > 0) {
        userId = existingUser[0].id;
        // Update existing user to owner with new password
        await qr.query(
          `UPDATE users SET
            password = $1,
            role = $2,
            status = $3,
            telegram_id = $4,
            organization_id = $5,
            must_change_password = false,
            login_attempts = 0,
            locked_until = NULL,
            updated_at = NOW()
          WHERE id = $6`,
          [
            passwordHash,
            OWNER.role,
            OWNER.status,
            OWNER.telegramId,
            organizationId,
            userId,
          ],
        );
        logger.log(`Updated existing user ${OWNER.email} → owner`);
      } else {
        userId = randomUUID();
        await qr.query(
          `INSERT INTO users (
            id, email, password, first_name, last_name, phone,
            role, status, telegram_id, organization_id,
            two_factor_enabled, must_change_password,
            login_attempts, points_balance, total_points_earned,
            total_spent, total_orders, welcome_bonus_received,
            first_order_bonus_received, current_streak, longest_streak,
            password_changed_by_user, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            false, false,
            0, 0, 0,
            0, 0, false,
            false, 0, 0,
            false, NOW(), NOW()
          )`,
          [
            userId,
            OWNER.email,
            passwordHash,
            OWNER.firstName,
            OWNER.lastName,
            OWNER.phone,
            OWNER.role,
            OWNER.status,
            OWNER.telegramId,
            organizationId,
          ],
        );
        logger.log(`Created new owner user ${OWNER.email}`);
      }

      await qr.commitTransaction();

      logger.log("═══════════════════════════════════════════════════");
      logger.log("Owner user ready!");
      logger.log("═══════════════════════════════════════════════════");
      logger.log(`  Email:       ${OWNER.email}`);
      logger.log(`  Password:    [from OWNER_PASSWORD env]`);
      logger.log(`  Role:        ${OWNER.role}`);
      logger.log(`  Status:      ${OWNER.status}`);
      logger.log(`  Telegram ID: ${OWNER.telegramId}`);
      logger.log(`  Org:         VendHub HQ (${organizationId})`);
      logger.log(`  User ID:     ${userId}`);
      logger.log("═══════════════════════════════════════════════════");
    } catch (error: unknown) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error seeding owner: ${message}`);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

seedOwner()
  .then(() => {
    logger.log("Owner seed completed!");
    process.exit(0);
  })
  .catch((error: Error) => {
    logger.error(`Owner seed failed: ${error.message}`);
    process.exit(1);
  });
