/**
 * Achievement Entity
 * Определения достижений
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ApiProperty } from "@nestjs/swagger";
import { Organization } from "../../organizations/entities/organization.entity";
import {
  AchievementConditionType,
  AchievementCategory,
  AchievementRarity,
} from "../constants/achievement.constants";
import { UserAchievement } from "./user-achievement.entity";

@Entity("achievements")
@Index(["organizationId", "isActive"])
@Index(["category", "rarity"])
@Index(["conditionType"])
export class Achievement extends BaseEntity {
  // ===== Organization =====

  @ApiProperty({
    description: "Organization ID (null for global achievements)",
  })
  @Column({ type: "uuid", nullable: true })
  @Index()
  organizationId: string | null;

  @ManyToOne(() => Organization, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  // ===== Basic Info =====

  @ApiProperty({ description: "Achievement name" })
  @Column({ type: "varchar", length: 100 })
  name: string;

  @ApiProperty({ description: "Achievement name in Uzbek" })
  @Column({ type: "varchar", length: 100, nullable: true })
  nameUz: string | null;

  @ApiProperty({ description: "Achievement description" })
  @Column({ type: "varchar", length: 500 })
  description: string;

  @ApiProperty({ description: "Achievement description in Uzbek" })
  @Column({ type: "varchar", length: 500, nullable: true })
  descriptionUz: string | null;

  // ===== Condition =====

  @ApiProperty({
    description: "Condition type to unlock achievement",
    enum: AchievementConditionType,
  })
  @Column({
    type: "enum",
    enum: AchievementConditionType,
  })
  conditionType: AchievementConditionType;

  @ApiProperty({
    description: "Target value for condition (e.g. 10 orders, 5 machines)",
    example: 10,
  })
  @Column({ type: "int" })
  conditionValue: number;

  @ApiProperty({
    description: "Additional condition metadata",
    nullable: true,
  })
  @Column({ type: "jsonb", nullable: true })
  conditionMetadata: {
    // Для LOYALTY_LEVEL
    required_level?: string;
    // Для ORDER_AMOUNT - минимальная сумма
    min_amount?: number;
    // Для EARLY_BIRD/NIGHT_OWL - час
    hour?: number;
    // Для WEEKEND_WARRIOR - минимум заказов в выходной
    weekend_orders?: number;
    // Для UNIQUE_PRODUCTS - конкретная категория
    category_id?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  } | null;

  // ===== Reward =====

  @ApiProperty({
    description: "Bonus points awarded for unlocking",
    example: 100,
  })
  @Column({ type: "int", default: 0 })
  bonusPoints: number;

  // ===== Visual =====

  @ApiProperty({ description: "Achievement icon (emoji or URL)" })
  @Column({ type: "varchar", length: 10, default: "🏆" })
  icon: string;

  @ApiProperty({ description: "Achievement image URL", nullable: true })
  @Column({ type: "varchar", nullable: true })
  imageUrl: string | null;

  // ===== Classification =====

  @ApiProperty({
    description: "Achievement category",
    enum: AchievementCategory,
  })
  @Column({
    type: "enum",
    enum: AchievementCategory,
    default: AchievementCategory.BEGINNER,
  })
  category: AchievementCategory;

  @ApiProperty({
    description: "Achievement rarity",
    enum: AchievementRarity,
  })
  @Column({
    type: "enum",
    enum: AchievementRarity,
    default: AchievementRarity.COMMON,
  })
  rarity: AchievementRarity;

  // ===== Status =====

  @ApiProperty({ description: "Is achievement active" })
  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @ApiProperty({ description: "Is achievement hidden until unlocked" })
  @Column({ type: "boolean", default: false })
  isHidden: boolean;

  @ApiProperty({ description: "Display order" })
  @Column({ type: "int", default: 0 })
  displayOrder: number;

  // ===== Statistics =====

  @ApiProperty({ description: "Total times unlocked by users" })
  @Column({ type: "int", default: 0 })
  totalUnlocked: number;

  // ===== Relations =====

  @OneToMany(() => UserAchievement, (ua) => ua.achievement)
  userAchievements: UserAchievement[];
}
