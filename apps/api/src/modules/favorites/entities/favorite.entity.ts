/**
 * Favorite Entity
 * Избранные продукты и автоматы пользователя
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { Machine } from '../../machines/entities/machine.entity';

/**
 * Тип избранного
 */
export enum FavoriteType {
  PRODUCT = 'product',
  MACHINE = 'machine',
}

@Entity('favorites')
@Index(['userId', 'type'])
@Index(['userId', 'createdAt'])
@Unique(['userId', 'type', 'productId', 'machineId'])
export class Favorite extends BaseEntity {
  // ===== User =====

  @ApiProperty({ description: 'User ID' })
  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // ===== Type =====

  @ApiProperty({
    description: 'Favorite type',
    enum: FavoriteType,
  })
  @Column({
    type: 'enum',
    enum: FavoriteType,
  })
  type: FavoriteType;

  // ===== Product (if type = product) =====

  @ApiProperty({ description: 'Product ID', nullable: true })
  @Column({ nullable: true })
  @Index()
  productId: string;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // ===== Machine (if type = machine) =====

  @ApiProperty({ description: 'Machine ID', nullable: true })
  @Column({ nullable: true })
  @Index()
  machineId: string;

  @ManyToOne(() => Machine, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  // ===== Metadata =====

  @ApiProperty({ description: 'User notes', nullable: true })
  @Column({ length: 255, nullable: true })
  notes: string;

  @ApiProperty({ description: 'Display order within favorites' })
  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
