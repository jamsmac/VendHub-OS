import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAgentBridgeTables1714000000000 implements MigrationInterface {
  name = "AddAgentBridgeTables1714000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "agent_type_enum" AS ENUM (
        'claude_code', 'gemini_cli', 'cursor', 'opencode', 'custom'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "agent_session_status_enum" AS ENUM (
        'running', 'waiting', 'idle', 'error', 'completed'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "progress_status_enum" AS ENUM (
        'started', 'in_progress', 'completed', 'failed', 'blocked'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "progress_category_enum" AS ENUM (
        'analysis', 'code_generation', 'testing', 'fix',
        'documentation', 'refactoring', 'other'
      )
    `);

    // Create agent_sessions table
    await queryRunner.query(`
      CREATE TABLE "agent_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "session_id" varchar(100) NOT NULL,
        "name" varchar(200) NOT NULL,
        "agent_type" "agent_type_enum" NOT NULL DEFAULT 'custom',
        "status" "agent_session_status_enum" NOT NULL DEFAULT 'running',
        "current_task" varchar(500),
        "working_directory" varchar(200),
        "profile" varchar(100),
        "attached_mcps" jsonb NOT NULL DEFAULT '[]',
        "last_activity_at" TIMESTAMP WITH TIME ZONE,
        "messages_count" integer NOT NULL DEFAULT 0,
        "proposals_count" integer NOT NULL DEFAULT 0,
        "files_changed_count" integer NOT NULL DEFAULT 0,
        "metadata" jsonb,
        CONSTRAINT "PK_agent_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_agent_sessions_session_id" UNIQUE ("session_id")
      )
    `);

    // Create agent_progress table
    await queryRunner.query(`
      CREATE TABLE "agent_progress" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "session_id" uuid NOT NULL,
        "task_id" varchar(100),
        "status" "progress_status_enum" NOT NULL DEFAULT 'in_progress',
        "category" "progress_category_enum" NOT NULL DEFAULT 'other',
        "message" text NOT NULL,
        "files_changed" jsonb NOT NULL DEFAULT '[]',
        "lines_added" integer,
        "lines_removed" integer,
        "duration_ms" integer,
        "proposal_id" uuid,
        "metadata" jsonb,
        CONSTRAINT "PK_agent_progress" PRIMARY KEY ("id"),
        CONSTRAINT "FK_agent_progress_session" FOREIGN KEY ("session_id")
          REFERENCES "agent_sessions"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_agent_sessions_session_id"
        ON "agent_sessions" ("session_id")
        WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_agent_sessions_status"
        ON "agent_sessions" ("status")
        WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_agent_progress_session_id"
        ON "agent_progress" ("session_id")
        WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_agent_progress_session_id"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_sessions_status"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_agent_sessions_session_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_progress"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_sessions"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "progress_category_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "progress_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "agent_session_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "agent_type_enum"`);
  }
}
