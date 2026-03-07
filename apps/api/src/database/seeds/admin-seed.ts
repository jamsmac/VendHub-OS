/**
 * Admin User Seed Script
 *
 * Creates the initial admin user for VendHub OS
 * Run with: pnpm db:seed:admin
 */

import { DataSource } from "typeorm";
import { Logger } from "@nestjs/common";
import { config } from "dotenv";
import * as bcrypt from "bcrypt";
import { randomUUID } from "crypto";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

const logger = new Logger("AdminSeed");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@vendhub.uz";
const ADMIN_NAME = process.env.ADMIN_NAME || "System Admin";
const ADMIN_PHONE = process.env.ADMIN_PHONE || "+998901234567";

function getAdminPassword(): string {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ADMIN_PASSWORD env var is REQUIRED in production. Refusing to use a default password.",
    );
  }
  const generated = randomUUID().slice(0, 16);
  logger.warn(
    `No ADMIN_PASSWORD set. Generated temporary password: ${generated}`,
  );
  return generated;
}

const ADMIN_PASSWORD = getAdminPassword();

async function seedAdmin() {
  logger.log("Starting admin seed...");

  const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USER || "vendhub",
    password: process.env.DB_PASSWORD || "vendhub",
    database: process.env.DB_NAME || "vendhub",
    entities: [__dirname + "/../../**/*.entity{.ts,.js}"],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    logger.log("Database connection established");

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if admin already exists
      const existingAdmin = await queryRunner.manager.query(
        `SELECT id FROM users WHERE email = $1`,
        [ADMIN_EMAIL],
      );

      if (existingAdmin.length > 0) {
        logger.warn(`Admin user ${ADMIN_EMAIL} already exists`);
        await queryRunner.rollbackTransaction();
        return;
      }

      // Create default organization first
      const orgId = randomUUID();
      const orgSlug = "vendhub-hq";

      const existingOrg = await queryRunner.manager.query(
        `SELECT id FROM organizations WHERE slug = $1`,
        [orgSlug],
      );

      let organizationId = orgId;

      if (existingOrg.length === 0) {
        await queryRunner.manager.query(
          `INSERT INTO organizations (id, name, slug, type, status, settings, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [
            orgId,
            "VendHub HQ",
            orgSlug,
            "headquarters",
            "active",
            JSON.stringify({
              timezone: "Asia/Tashkent",
              currency: "UZS",
              language: "ru",
            }),
          ],
        );
        logger.log("Created default organization: VendHub HQ");
      } else {
        organizationId = existingOrg[0].id;
        logger.warn("Organization already exists, using existing");
      }

      // Hash password
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      const userId = randomUUID();

      // Create admin user
      await queryRunner.manager.query(
        `INSERT INTO users (
          id, email, password_hash, first_name, last_name, phone,
          role, organization_id, status, email_verified,
          two_factor_enabled, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          userId,
          ADMIN_EMAIL,
          passwordHash,
          ADMIN_NAME.split(" ")[0] || "Admin",
          ADMIN_NAME.split(" ")[1] || "User",
          ADMIN_PHONE,
          "owner",
          organizationId,
          "active",
          true,
          false,
        ],
      );

      await queryRunner.commitTransaction();

      logger.log("═══════════════════════════════════════════════════");
      logger.log("Admin user created successfully!");
      logger.log("═══════════════════════════════════════════════════");
      logger.log(`  Email:     ${ADMIN_EMAIL}`);
      logger.log(
        `  Password:  ${process.env.ADMIN_PASSWORD ? "[from ADMIN_PASSWORD env]" : ADMIN_PASSWORD}`,
      );
      logger.log(`  Name:      ${ADMIN_NAME}`);
      logger.log(`  Phone:     ${ADMIN_PHONE}`);
      logger.log(`  Org:       VendHub HQ`);
      logger.log(`  Role:      owner`);
      logger.warn("Please change the password after first login!");
      logger.log("═══════════════════════════════════════════════════");
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error seeding admin: ${message}`);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

// Run seed
seedAdmin()
  .then(() => {
    logger.log("Admin seed completed!");
    process.exit(0);
  })
  .catch((error: Error) => {
    logger.error(`Admin seed failed: ${error.message}`);
    process.exit(1);
  });
