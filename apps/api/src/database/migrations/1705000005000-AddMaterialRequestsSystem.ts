import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaterialRequestsSystem1705000005000 implements MigrationInterface {
  name = 'AddMaterialRequestsSystem1705000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create material request status enum
    await queryRunner.query(`
      CREATE TYPE "material_request_status_enum" AS ENUM (
        'draft',
        'new',
        'approved',
        'rejected',
        'sent',
        'pending_payment',
        'paid',
        'partially_paid',
        'delivered',
        'completed',
        'cancelled'
      )
    `);

    // Create request priority enum
    await queryRunner.query(`
      CREATE TYPE "request_priority_enum" AS ENUM (
        'low',
        'normal',
        'high',
        'urgent'
      )
    `);

    // Create material_requests table
    await queryRunner.query(`
      CREATE TABLE "material_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" uuid NOT NULL,
        "requestNumber" varchar NOT NULL,
        "requesterId" uuid NOT NULL,
        "status" "material_request_status_enum" NOT NULL DEFAULT 'draft',
        "priority" "request_priority_enum" NOT NULL DEFAULT 'normal',
        "supplierId" uuid,
        "notes" text,
        "totalAmount" decimal(15,2) NOT NULL DEFAULT 0,
        "paidAmount" decimal(15,2) NOT NULL DEFAULT 0,
        "approvedBy" uuid,
        "approvedAt" timestamp,
        "rejectionReason" text,
        "rejectedBy" uuid,
        "rejectedAt" timestamp,
        "submittedAt" timestamp,
        "sentAt" timestamp,
        "deliveredAt" timestamp,
        "completedAt" timestamp,
        "cancelledAt" timestamp,
        "cancellationReason" text,
        "metadata" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_material_requests_number" UNIQUE ("requestNumber"),
        CONSTRAINT "PK_material_requests" PRIMARY KEY ("id")
      )
    `);

    // Create material_request_items table
    await queryRunner.query(`
      CREATE TABLE "material_request_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "requestId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "productName" varchar(255) NOT NULL,
        "productSku" varchar(100),
        "quantity" int NOT NULL,
        "unitPrice" decimal(15,2) NOT NULL,
        "totalPrice" decimal(15,2) NOT NULL,
        "deliveredQuantity" int NOT NULL DEFAULT 0,
        "notes" text,
        "metadata" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_material_request_items" PRIMARY KEY ("id")
      )
    `);

    // Create material_request_history table
    await queryRunner.query(`
      CREATE TABLE "material_request_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "requestId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "fromStatus" "material_request_status_enum" NOT NULL,
        "toStatus" "material_request_status_enum" NOT NULL,
        "comment" text,
        "metadata" jsonb,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_material_request_history" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_material_requests_org_status" ON "material_requests" ("organizationId", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_material_requests_requester" ON "material_requests" ("requesterId")`);
    await queryRunner.query(`CREATE INDEX "IDX_material_request_items_request_product" ON "material_request_items" ("requestId", "productId")`);
    await queryRunner.query(`CREATE INDEX "IDX_material_request_history_request_date" ON "material_request_history" ("requestId", "createdAt")`);

    // Create foreign keys
    await queryRunner.query(`
      ALTER TABLE "material_request_items"
      ADD CONSTRAINT "FK_material_request_items_request"
      FOREIGN KEY ("requestId") REFERENCES "material_requests"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "material_request_history"
      ADD CONSTRAINT "FK_material_request_history_request"
      FOREIGN KEY ("requestId") REFERENCES "material_requests"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "material_request_history" DROP CONSTRAINT "FK_material_request_history_request"`);
    await queryRunner.query(`ALTER TABLE "material_request_items" DROP CONSTRAINT "FK_material_request_items_request"`);
    await queryRunner.query(`DROP INDEX "IDX_material_request_history_request_date"`);
    await queryRunner.query(`DROP INDEX "IDX_material_request_items_request_product"`);
    await queryRunner.query(`DROP INDEX "IDX_material_requests_requester"`);
    await queryRunner.query(`DROP INDEX "IDX_material_requests_org_status"`);
    await queryRunner.query(`DROP TABLE "material_request_history"`);
    await queryRunner.query(`DROP TABLE "material_request_items"`);
    await queryRunner.query(`DROP TABLE "material_requests"`);
    await queryRunner.query(`DROP TYPE "request_priority_enum"`);
    await queryRunner.query(`DROP TYPE "material_request_status_enum"`);
  }
}
