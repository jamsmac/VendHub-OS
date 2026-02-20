/**
 * Migration: Add Quests System
 *
 * Creates quests and user_quests tables
 */

import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddQuestsSystem1705000002000 implements MigrationInterface {
  name = 'AddQuestsSystem1705000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Create enum types
    // ============================================
    await queryRunner.query(`
      CREATE TYPE "quest_period_enum" AS ENUM ('daily', 'weekly', 'monthly', 'one_time', 'special')
    `);

    await queryRunner.query(`
      CREATE TYPE "quest_type_enum" AS ENUM (
        'order_count', 'order_amount', 'order_single', 'order_category', 'order_product',
        'order_time', 'order_machine', 'referral', 'review', 'share', 'visit',
        'login_streak', 'profile_complete', 'first_order', 'payment_type',
        'spend_points', 'loyal_customer', 'collector'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "quest_difficulty_enum" AS ENUM ('easy', 'medium', 'hard', 'legendary')
    `);

    await queryRunner.query(`
      CREATE TYPE "quest_status_enum" AS ENUM ('available', 'in_progress', 'completed', 'claimed', 'expired')
    `);

    // ============================================
    // 2. Create quests table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'quests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'titleUz',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'descriptionUz',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'period',
            type: 'quest_period_enum',
          },
          {
            name: 'type',
            type: 'quest_type_enum',
          },
          {
            name: 'difficulty',
            type: 'quest_difficulty_enum',
            default: "'medium'",
          },
          {
            name: 'targetValue',
            type: 'int',
          },
          {
            name: 'rewardPoints',
            type: 'int',
          },
          {
            name: 'additionalRewards',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'requirements',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '10',
            default: "'🎯'",
          },
          {
            name: 'color',
            type: 'varchar',
            length: '20',
            default: "'#4CAF50'",
          },
          {
            name: 'imageUrl',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'startsAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'endsAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isFeatured',
            type: 'boolean',
            default: false,
          },
          {
            name: 'displayOrder',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalStarted',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalCompleted',
            type: 'int',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // ============================================
    // 3. Create user_quests table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'user_quests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'questId',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'quest_status_enum',
            default: "'in_progress'",
          },
          {
            name: 'currentValue',
            type: 'int',
            default: 0,
          },
          {
            name: 'targetValue',
            type: 'int',
          },
          {
            name: 'progressDetails',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'periodStart',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'periodEnd',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'rewardPoints',
            type: 'int',
          },
          {
            name: 'pointsClaimed',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'rewardsClaimed',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'startedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'claimedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expiredAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // ============================================
    // 4. Create indexes for quests
    // ============================================
    await queryRunner.createIndex(
      'quests',
      new TableIndex({
        name: 'IDX_quests_org_period_active',
        columnNames: ['organizationId', 'period', 'isActive'],
      }),
    );

    await queryRunner.createIndex(
      'quests',
      new TableIndex({
        name: 'IDX_quests_period_dates',
        columnNames: ['period', 'startsAt', 'endsAt'],
      }),
    );

    await queryRunner.createIndex(
      'quests',
      new TableIndex({
        name: 'IDX_quests_organization',
        columnNames: ['organizationId'],
      }),
    );

    // ============================================
    // 5. Create indexes for user_quests
    // ============================================
    await queryRunner.createIndex(
      'user_quests',
      new TableIndex({
        name: 'IDX_user_quests_user_status',
        columnNames: ['userId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'user_quests',
      new TableIndex({
        name: 'IDX_user_quests_quest_status',
        columnNames: ['questId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'user_quests',
      new TableIndex({
        name: 'IDX_user_quests_completed',
        columnNames: ['completedAt'],
        where: '"completedAt" IS NOT NULL',
      }),
    );

    await queryRunner.createIndex(
      'user_quests',
      new TableIndex({
        name: 'IDX_user_quests_user',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'user_quests',
      new TableIndex({
        name: 'IDX_user_quests_quest',
        columnNames: ['questId'],
      }),
    );

    await queryRunner.createIndex(
      'user_quests',
      new TableIndex({
        name: 'IDX_user_quests_unique_period',
        columnNames: ['userId', 'questId', 'periodStart'],
        isUnique: true,
      }),
    );

    // ============================================
    // 6. Create foreign keys
    // ============================================
    await queryRunner.createForeignKey(
      'quests',
      new TableForeignKey({
        name: 'FK_quests_organization',
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_quests',
      new TableForeignKey({
        name: 'FK_user_quests_user',
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_quests',
      new TableForeignKey({
        name: 'FK_user_quests_quest',
        columnNames: ['questId'],
        referencedTableName: 'quests',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('user_quests', 'FK_user_quests_quest');
    await queryRunner.dropForeignKey('user_quests', 'FK_user_quests_user');
    await queryRunner.dropForeignKey('quests', 'FK_quests_organization');

    // Drop tables
    await queryRunner.dropTable('user_quests');
    await queryRunner.dropTable('quests');

    // Drop enum types
    await queryRunner.query(`DROP TYPE "quest_status_enum"`);
    await queryRunner.query(`DROP TYPE "quest_difficulty_enum"`);
    await queryRunner.query(`DROP TYPE "quest_type_enum"`);
    await queryRunner.query(`DROP TYPE "quest_period_enum"`);
  }
}
