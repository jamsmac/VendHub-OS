/**
 * Migration: Add Loyalty System
 *
 * Creates points_transactions table and adds loyalty fields to users table
 */

import { MigrationInterface, QueryRunner, Table, TableIndex, TableColumn, TableForeignKey } from 'typeorm';

export class AddLoyaltySystem1705000001 implements MigrationInterface {
  name = 'AddLoyaltySystem1705000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Create loyalty_level enum type
    // ============================================
    await queryRunner.query(`
      CREATE TYPE "loyalty_level_enum" AS ENUM ('bronze', 'silver', 'gold', 'platinum')
    `);

    // ============================================
    // 2. Create points_transaction_type enum type
    // ============================================
    await queryRunner.query(`
      CREATE TYPE "points_transaction_type_enum" AS ENUM ('earn', 'spend', 'adjust', 'expire')
    `);

    // ============================================
    // 3. Create points_source enum type
    // ============================================
    await queryRunner.query(`
      CREATE TYPE "points_source_enum" AS ENUM (
        'order',
        'referral',
        'welcome_bonus',
        'first_order_bonus',
        'birthday_bonus',
        'streak_bonus',
        'quest_completion',
        'promotion',
        'manual_adjustment',
        'refund',
        'payment',
        'expiration',
        'level_up_bonus',
        'review_bonus',
        'social_share',
        'app_install'
      )
    `);

    // ============================================
    // 4. Create points_transactions table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'points_transactions',
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
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'points_transaction_type_enum',
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'balanceAfter',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'source',
            type: 'points_source_enum',
            isNullable: false,
          },
          {
            name: 'referenceId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'remainingAmount',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdById',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // ============================================
    // 5. Create indexes for points_transactions
    // ============================================
    await queryRunner.createIndex(
      'points_transactions',
      new TableIndex({
        name: 'IDX_points_transactions_org_user_created',
        columnNames: ['organizationId', 'userId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'points_transactions',
      new TableIndex({
        name: 'IDX_points_transactions_user_type',
        columnNames: ['userId', 'type'],
      }),
    );

    await queryRunner.createIndex(
      'points_transactions',
      new TableIndex({
        name: 'IDX_points_transactions_expiration',
        columnNames: ['expiresAt', 'remainingAmount'],
        where: '"expiresAt" IS NOT NULL AND "remainingAmount" > 0',
      }),
    );

    await queryRunner.createIndex(
      'points_transactions',
      new TableIndex({
        name: 'IDX_points_transactions_reference',
        columnNames: ['referenceId'],
        where: '"referenceId" IS NOT NULL',
      }),
    );

    await queryRunner.createIndex(
      'points_transactions',
      new TableIndex({
        name: 'IDX_points_transactions_source',
        columnNames: ['source'],
      }),
    );

    // ============================================
    // 6. Add loyalty fields to users table
    // ============================================

    // pointsBalance
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'pointsBalance',
        type: 'int',
        default: 0,
      }),
    );

    // loyaltyLevel
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'loyaltyLevel',
        type: 'loyalty_level_enum',
        default: "'bronze'",
      }),
    );

    // totalPointsEarned
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'totalPointsEarned',
        type: 'int',
        default: 0,
      }),
    );

    // totalSpent
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'totalSpent',
        type: 'decimal',
        precision: 15,
        scale: 2,
        default: 0,
      }),
    );

    // totalOrders
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'totalOrders',
        type: 'int',
        default: 0,
      }),
    );

    // welcomeBonusReceived
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'welcomeBonusReceived',
        type: 'boolean',
        default: false,
      }),
    );

    // firstOrderBonusReceived
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'firstOrderBonusReceived',
        type: 'boolean',
        default: false,
      }),
    );

    // currentStreak
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'currentStreak',
        type: 'int',
        default: 0,
      }),
    );

    // longestStreak
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'longestStreak',
        type: 'int',
        default: 0,
      }),
    );

    // lastOrderDate
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'lastOrderDate',
        type: 'date',
        isNullable: true,
      }),
    );

    // referralCode
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'referralCode',
        type: 'varchar',
        length: '20',
        isNullable: true,
        isUnique: true,
      }),
    );

    // referredById
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'referredById',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // ============================================
    // 7. Create indexes for users loyalty fields
    // ============================================
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_loyalty_level',
        columnNames: ['loyaltyLevel'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_referral_code',
        columnNames: ['referralCode'],
        where: '"referralCode" IS NOT NULL',
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_referred_by',
        columnNames: ['referredById'],
        where: '"referredById" IS NOT NULL',
      }),
    );

    // ============================================
    // 8. Create foreign keys
    // ============================================

    // points_transactions -> users
    await queryRunner.createForeignKey(
      'points_transactions',
      new TableForeignKey({
        name: 'FK_points_transactions_user',
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // points_transactions -> organizations
    await queryRunner.createForeignKey(
      'points_transactions',
      new TableForeignKey({
        name: 'FK_points_transactions_organization',
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // users.referredById -> users
    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        name: 'FK_users_referred_by',
        columnNames: ['referredById'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // ============================================
    // 9. Generate referral codes for existing users
    // ============================================
    await queryRunner.query(`
      UPDATE users
      SET "referralCode" = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
      WHERE "referralCode" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Drop foreign keys
    // ============================================
    await queryRunner.dropForeignKey('users', 'FK_users_referred_by');
    await queryRunner.dropForeignKey('points_transactions', 'FK_points_transactions_organization');
    await queryRunner.dropForeignKey('points_transactions', 'FK_points_transactions_user');

    // ============================================
    // 2. Drop indexes from users
    // ============================================
    await queryRunner.dropIndex('users', 'IDX_users_referred_by');
    await queryRunner.dropIndex('users', 'IDX_users_referral_code');
    await queryRunner.dropIndex('users', 'IDX_users_loyalty_level');

    // ============================================
    // 3. Drop loyalty columns from users
    // ============================================
    await queryRunner.dropColumn('users', 'referredById');
    await queryRunner.dropColumn('users', 'referralCode');
    await queryRunner.dropColumn('users', 'lastOrderDate');
    await queryRunner.dropColumn('users', 'longestStreak');
    await queryRunner.dropColumn('users', 'currentStreak');
    await queryRunner.dropColumn('users', 'firstOrderBonusReceived');
    await queryRunner.dropColumn('users', 'welcomeBonusReceived');
    await queryRunner.dropColumn('users', 'totalOrders');
    await queryRunner.dropColumn('users', 'totalSpent');
    await queryRunner.dropColumn('users', 'totalPointsEarned');
    await queryRunner.dropColumn('users', 'loyaltyLevel');
    await queryRunner.dropColumn('users', 'pointsBalance');

    // ============================================
    // 4. Drop points_transactions table
    // ============================================
    await queryRunner.dropTable('points_transactions');

    // ============================================
    // 5. Drop enum types
    // ============================================
    await queryRunner.query(`DROP TYPE "points_source_enum"`);
    await queryRunner.query(`DROP TYPE "points_transaction_type_enum"`);
    await queryRunner.query(`DROP TYPE "loyalty_level_enum"`);
  }
}
