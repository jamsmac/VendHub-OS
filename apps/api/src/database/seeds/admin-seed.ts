/**
 * Admin User Seed Script
 *
 * Creates the initial admin user for VendHub OS
 * Run with: pnpm db:seed:admin
 */

import { DataSource } from "typeorm";
import { config } from "dotenv";
import * as bcrypt from "bcrypt";
import { randomUUID } from "crypto";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@vendhub.uz";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_NAME = process.env.ADMIN_NAME || "System Admin";
const ADMIN_PHONE = process.env.ADMIN_PHONE || "+998901234567";

async function seedAdmin() {
  console.log("🌱 Starting admin seed...");

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
    console.log("✅ Database connection established");

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
        console.log(`⚠️ Admin user ${ADMIN_EMAIL} already exists`);
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
        console.log("✅ Created default organization: VendHub HQ");
      } else {
        organizationId = existingOrg[0].id;
        console.log("⚠️ Organization already exists, using existing");
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

      console.log("");
      console.log("═══════════════════════════════════════════════════");
      console.log("✅ Admin user created successfully!");
      console.log("═══════════════════════════════════════════════════");
      console.log("");
      console.log("  📧 Email:    ", ADMIN_EMAIL);
      console.log("  🔑 Password: ", ADMIN_PASSWORD);
      console.log("  👤 Name:     ", ADMIN_NAME);
      console.log("  📱 Phone:    ", ADMIN_PHONE);
      console.log("  🏢 Org:       VendHub HQ");
      console.log("  🔒 Role:      owner");
      console.log("");
      console.log("⚠️  Please change the password after first login!");
      console.log("═══════════════════════════════════════════════════");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("❌ Error seeding admin:", error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

// Run seed
seedAdmin()
  .then(() => {
    console.log("🎉 Admin seed completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Admin seed failed:", error);
    process.exit(1);
  });
