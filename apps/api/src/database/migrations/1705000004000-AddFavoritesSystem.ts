/**
 * Migration: Add Favorites System
 *
 * Creates favorites table for user favorite products and machines
 */

import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddFavoritesSystem1705000004000 implements MigrationInterface {
  name = 'AddFavoritesSystem1705000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. Create favorite_type enum type
    // ============================================
    await queryRunner.query(`
      CREATE TYPE "favorite_type_enum" AS ENUM ('product', 'machine')
    `);

    // ============================================
    // 2. Create favorites table
    // ============================================
    await queryRunner.createTable(
      new Table({
        name: 'favorites',
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
            name: 'type',
            type: 'favorite_type_enum',
          },
          {
            name: 'productId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'machineId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'sortOrder',
            type: 'int',
            default: 0,
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
    // 3. Create indexes
    // ============================================
    await queryRunner.createIndex(
      'favorites',
      new TableIndex({
        name: 'IDX_favorites_user_type',
        columnNames: ['userId', 'type'],
      }),
    );

    await queryRunner.createIndex(
      'favorites',
      new TableIndex({
        name: 'IDX_favorites_user_created',
        columnNames: ['userId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'favorites',
      new TableIndex({
        name: 'IDX_favorites_user',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'favorites',
      new TableIndex({
        name: 'IDX_favorites_product',
        columnNames: ['productId'],
        where: '"productId" IS NOT NULL',
      }),
    );

    await queryRunner.createIndex(
      'favorites',
      new TableIndex({
        name: 'IDX_favorites_machine',
        columnNames: ['machineId'],
        where: '"machineId" IS NOT NULL',
      }),
    );

    // Unique constraint to prevent duplicates
    await queryRunner.createIndex(
      'favorites',
      new TableIndex({
        name: 'IDX_favorites_unique',
        columnNames: ['userId', 'type', 'productId', 'machineId'],
        isUnique: true,
      }),
    );

    // ============================================
    // 4. Create foreign keys
    // ============================================
    await queryRunner.createForeignKey(
      'favorites',
      new TableForeignKey({
        name: 'FK_favorites_user',
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'favorites',
      new TableForeignKey({
        name: 'FK_favorites_product',
        columnNames: ['productId'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'favorites',
      new TableForeignKey({
        name: 'FK_favorites_machine',
        columnNames: ['machineId'],
        referencedTableName: 'machines',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('favorites', 'FK_favorites_machine');
    await queryRunner.dropForeignKey('favorites', 'FK_favorites_product');
    await queryRunner.dropForeignKey('favorites', 'FK_favorites_user');

    // Drop table
    await queryRunner.dropTable('favorites');

    // Drop enum type
    await queryRunner.query(`DROP TYPE "favorite_type_enum"`);
  }
}
