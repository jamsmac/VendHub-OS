/**
 * Migration: Add Referrals System
 *
 * Creates referrals table for tracking referral invitations
 */

import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddReferralsSystem1705000003 implements MigrationInterface {
  name = 'AddReferralsSystem1705000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Create referral_status enum type
    // ============================================
    await queryRunner.query(`
      CREATE TYPE "referral_status_enum" AS ENUM ('pending', 'activated', 'rewarded', 'cancelled')
    `);

    // ============================================
    // 2. Create referrals table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'referrals',
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
          },
          {
            name: 'referrerId',
            type: 'uuid',
          },
          {
            name: 'referredId',
            type: 'uuid',
            isUnique: true,
          },
          {
            name: 'referralCode',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'status',
            type: 'referral_status_enum',
            default: "'pending'",
          },
          {
            name: 'referrerRewardPoints',
            type: 'int',
            default: 0,
          },
          {
            name: 'referredRewardPoints',
            type: 'int',
            default: 0,
          },
          {
            name: 'referrerRewardPaid',
            type: 'boolean',
            default: false,
          },
          {
            name: 'referredRewardPaid',
            type: 'boolean',
            default: false,
          },
          {
            name: 'activationOrderId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'activationOrderAmount',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'activatedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'source',
            type: 'varchar',
            length: '20',
            default: "'code'",
          },
          {
            name: 'utmCampaign',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
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
    // 3. Create indexes
    // ============================================
    await queryRunner.createIndex(
      'referrals',
      new TableIndex({
        name: 'IDX_referrals_referrer_status',
        columnNames: ['referrerId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'referrals',
      new TableIndex({
        name: 'IDX_referrals_referred',
        columnNames: ['referredId'],
      }),
    );

    await queryRunner.createIndex(
      'referrals',
      new TableIndex({
        name: 'IDX_referrals_org_created',
        columnNames: ['organizationId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'referrals',
      new TableIndex({
        name: 'IDX_referrals_organization',
        columnNames: ['organizationId'],
      }),
    );

    await queryRunner.createIndex(
      'referrals',
      new TableIndex({
        name: 'IDX_referrals_referrer',
        columnNames: ['referrerId'],
      }),
    );

    // ============================================
    // 4. Create foreign keys
    // ============================================
    await queryRunner.createForeignKey(
      'referrals',
      new TableForeignKey({
        name: 'FK_referrals_organization',
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'referrals',
      new TableForeignKey({
        name: 'FK_referrals_referrer',
        columnNames: ['referrerId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'referrals',
      new TableForeignKey({
        name: 'FK_referrals_referred',
        columnNames: ['referredId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('referrals', 'FK_referrals_referred');
    await queryRunner.dropForeignKey('referrals', 'FK_referrals_referrer');
    await queryRunner.dropForeignKey('referrals', 'FK_referrals_organization');

    // Drop table
    await queryRunner.dropTable('referrals');

    // Drop enum type
    await queryRunner.query(`DROP TYPE "referral_status_enum"`);
  }
}
