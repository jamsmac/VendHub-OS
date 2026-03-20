/**
 * Quest Entity
 * Определение квеста/задания в программе лояльности
 */

import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Organization } from "../../organizations/entities/organization.entity";

// ============================================================================
// ENUMS
// ============================================================================

export enum QuestPeriod {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  ONE_TIME = "one_time",
  SPECIAL = "special",
}

export enum QuestType {
  ORDER_COUNT = "order_count",
  ORDER_AMOUNT = "order_amount",
  ORDER_SINGLE = "order_single",
  ORDER_CATEGORY = "order_category",
  ORDER_PRODUCT = "order_product",
  ORDER_TIME = "order_time",
  ORDER_MACHINE = "order_machine",
  REFERRAL = "referral",
  REVIEW = "review",
  SHARE = "share",
  VISIT = "visit",
  LOGIN_STREAK = "login_streak",
  PROFILE_COMPLETE = "profile_complete",
  FIRST_ORDER = "first_order",
  PAYMENT_TYPE = "payment_type",
  SPEND_POINTS = "spend_points",
  LOYAL_CUSTOMER = "loyal_customer",
  COLLECTOR = "collector",
}

export enum QuestDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
  LEGENDARY = "legendary",
}

@Entity("quests")
@Index(["organizationId", "period", "isActive"])
@Index(["period", "startsAt", "endsAt"])
export class Quest extends BaseEntity {
  // ===== Organization =====

  @ApiProperty({ description: "Organization ID" })
  @Column({ type: "uuid", nullable: true })
  @Index()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  // ===== Title & Description =====

  @ApiProperty({
    description: "Quest title (Russian)",
    example: "Сделать 3 заказа",
  })
  @Column({ type: "varchar", length: 100 })
  title: string;

  @ApiPropertyOptional({ description: "Quest title (Uzbek)" })
  @Column({ type: "varchar", length: 100, nullable: true })
  titleUz: string;

  @ApiProperty({ description: "Quest description (Russian)" })
  @Column({ type: "varchar", length: 500 })
  description: string;

  @ApiPropertyOptional({ description: "Quest description (Uzbek)" })
  @Column({ type: "varchar", length: 500, nullable: true })
  descriptionUz: string;

  // ===== Quest Config =====

  @ApiProperty({ description: "Quest period", enum: QuestPeriod })
  @Column({
    type: "enum",
    enum: QuestPeriod,
    enumName: "quest_period_enum",
  })
  period: QuestPeriod;

  @ApiProperty({ description: "Quest type", enum: QuestType })
  @Column({
    type: "enum",
    enum: QuestType,
    enumName: "quest_type_enum",
  })
  type: QuestType;

  @ApiProperty({ description: "Difficulty level", enum: QuestDifficulty })
  @Column({
    type: "enum",
    enum: QuestDifficulty,
    enumName: "quest_difficulty_enum",
    default: QuestDifficulty.MEDIUM,
  })
  difficulty: QuestDifficulty;

  @ApiProperty({
    description: "Target value to complete the quest",
    example: 3,
  })
  @Column({ type: "int" })
  targetValue: number;

  @ApiProperty({ description: "Points reward for completion", example: 50 })
  @Column({ type: "int" })
  rewardPoints: number;

  @ApiPropertyOptional({ description: "Additional rewards (JSONB)" })
  @Column({ type: "jsonb", nullable: true })
  additionalRewards: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Additional metadata (JSONB)" })
  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Requirements to unlock (JSONB)" })
  @Column({ type: "jsonb", nullable: true })
  requirements: Record<string, unknown>;

  // ===== Display =====

  @ApiProperty({ description: "Quest icon emoji", example: "🎯" })
  @Column({ type: "varchar", length: 10, default: "🎯" })
  icon: string;

  @ApiProperty({ description: "Quest color", example: "#4CAF50" })
  @Column({ type: "varchar", length: 20, default: "#4CAF50" })
  color: string;

  @ApiPropertyOptional({ description: "Quest image URL" })
  @Column({ type: "varchar", nullable: true })
  imageUrl: string;

  // ===== Date Range =====

  @ApiPropertyOptional({ description: "Quest start date (null = immediate)" })
  @Column({ type: "timestamp", nullable: true })
  startsAt: Date;

  @ApiPropertyOptional({ description: "Quest end date (null = permanent)" })
  @Column({ type: "timestamp", nullable: true })
  endsAt: Date;

  // ===== Status & Ordering =====

  @ApiProperty({ description: "Whether quest is active", default: true })
  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @ApiProperty({ description: "Featured on top", default: false })
  @Column({ type: "boolean", default: false })
  isFeatured: boolean;

  @ApiProperty({ description: "Display order", default: 0 })
  @Column({ type: "int", default: 0 })
  displayOrder: number;

  // ===== Stats =====

  @ApiProperty({ description: "Total users who started", default: 0 })
  @Column({ type: "int", default: 0 })
  totalStarted: number;

  @ApiProperty({ description: "Total users who completed", default: 0 })
  @Column({ type: "int", default: 0 })
  totalCompleted: number;
}
