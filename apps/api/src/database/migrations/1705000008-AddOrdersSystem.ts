import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrdersSystem1705000008 implements MigrationInterface {
  name = 'AddOrdersSystem1705000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create order status enum
    await queryRunner.query(`
      CREATE TYPE "order_status_enum" AS ENUM (
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'completed',
        'cancelled'
      )
    `);

    // Create payment status enum
    await queryRunner.query(`
      CREATE TYPE "payment_status_enum" AS ENUM (
        'pending',
        'paid',
        'refunded',
        'failed'
      )
    `);

    // Create payment method enum
    await queryRunner.query(`
      CREATE TYPE "payment_method_enum" AS ENUM (
        'cash',
        'card',
        'telegram',
        'qr',
        'bonus'
      )
    `);

    // Create orders table
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "orderNumber" varchar NOT NULL,
        "userId" uuid,
        "machineId" uuid,
        "status" "order_status_enum" NOT NULL DEFAULT 'pending',
        "paymentStatus" "payment_status_enum" NOT NULL DEFAULT 'pending',
        "paymentMethod" "payment_method_enum",
        "subtotal" decimal(15,2) NOT NULL DEFAULT 0,
        "tax" decimal(15,2) NOT NULL DEFAULT 0,
        "discount" decimal(15,2) NOT NULL DEFAULT 0,
        "total" decimal(15,2) NOT NULL DEFAULT 0,
        "paidAmount" decimal(15,2) NOT NULL DEFAULT 0,
        "customerPhone" varchar(20),
        "customerEmail" varchar(255),
        "customerName" varchar(200),
        "notes" text,
        "cancellationReason" text,
        "completedAt" timestamp,
        "metadata" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_orders_number" UNIQUE ("orderNumber"),
        CONSTRAINT "PK_orders" PRIMARY KEY ("id")
      )
    `);

    // Create order_items table
    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orderId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "productName" varchar(255) NOT NULL,
        "productSku" varchar(100),
        "quantity" integer NOT NULL DEFAULT 1,
        "unitPrice" decimal(15,2) NOT NULL,
        "discount" decimal(15,2) NOT NULL DEFAULT 0,
        "total" decimal(15,2) NOT NULL,
        "slotNumber" varchar(20),
        "dispensed" boolean NOT NULL DEFAULT false,
        "dispensedAt" timestamp,
        "metadata" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_items" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_orders_org_status" ON "orders" ("organizationId", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_user" ON "orders" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_machine" ON "orders" ("machineId")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_created" ON "orders" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_payment_status" ON "orders" ("paymentStatus")`);
    await queryRunner.query(`CREATE INDEX "IDX_order_items_order" ON "order_items" ("orderId")`);
    await queryRunner.query(`CREATE INDEX "IDX_order_items_product" ON "order_items" ("productId")`);

    // Create foreign keys
    await queryRunner.query(`
      ALTER TABLE "order_items"
      ADD CONSTRAINT "FK_order_items_order"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_order"`);
    await queryRunner.query(`DROP INDEX "IDX_order_items_product"`);
    await queryRunner.query(`DROP INDEX "IDX_order_items_order"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_payment_status"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_created"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_machine"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_user"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_org_status"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TYPE "payment_method_enum"`);
    await queryRunner.query(`DROP TYPE "payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "order_status_enum"`);
  }
}
