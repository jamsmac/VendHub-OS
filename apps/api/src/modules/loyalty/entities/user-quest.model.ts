/**
 * User Quest Entity
 * Прогресс пользователя по квесту
 */

import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { User } from "../../users/entities/user.entity";
import { Quest } from "./quest.model";

// ============================================================================
// ENUM
// ============================================================================

export enum UserQuestStatus {
  AVAILABLE = "available",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CLAIMED = "claimed",
  EXPIRED = "expired",
}

@Entity("user_quests")
@Index(["userId", "status"])
@Index(["questId", "status"])
@Index(["userId", "questId", "periodStart"], { unique: true })
export class UserQuest extends BaseEntity {
  // ===== User =====

  @ApiProperty({ description: "User ID" })
  @Column({ type: "uuid" })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  // ===== Quest =====

  @ApiProperty({ description: "Quest ID" })
  @Column({ type: "uuid" })
  @Index()
  questId: string;

  @ManyToOne(() => Quest, { onDelete: "CASCADE", eager: true })
  @JoinColumn({ name: "quest_id" })
  quest: Quest;

  // ===== Progress =====

  @ApiProperty({ description: "Quest status", enum: UserQuestStatus })
  @Column({
    type: "enum",
    enum: UserQuestStatus,
    enumName: "quest_status_enum",
    default: UserQuestStatus.IN_PROGRESS,
  })
  status: UserQuestStatus;

  @ApiProperty({ description: "Current progress value", default: 0 })
  @Column({ type: "int", default: 0 })
  currentValue: number;

  @ApiProperty({ description: "Target value to reach" })
  @Column({ type: "int" })
  targetValue: number;

  @ApiPropertyOptional({ description: "Detailed progress info (JSONB)" })
  @Column({ type: "jsonb", nullable: true })
  progressDetails: Record<string, unknown>;

  // ===== Period =====

  @ApiPropertyOptional({
    description: "Period start date (for recurring quests)",
  })
  @Column({ type: "date", nullable: true })
  periodStart: Date;

  @ApiPropertyOptional({
    description: "Period end date (for recurring quests)",
  })
  @Column({ type: "date", nullable: true })
  periodEnd: Date;

  // ===== Rewards =====

  @ApiProperty({ description: "Points reward for this quest" })
  @Column({ type: "int" })
  rewardPoints: number;

  @ApiPropertyOptional({ description: "Points actually claimed" })
  @Column({ type: "int", nullable: true })
  pointsClaimed: number;

  @ApiPropertyOptional({ description: "Additional rewards claimed (JSONB)" })
  @Column({ type: "jsonb", nullable: true })
  rewardsClaimed: Record<string, unknown>;

  // ===== Timestamps =====

  @ApiProperty({ description: "When user started the quest" })
  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  startedAt: Date;

  @ApiPropertyOptional({ description: "When quest was completed" })
  @Column({ type: "timestamp", nullable: true })
  completedAt: Date;

  @ApiPropertyOptional({ description: "When reward was claimed" })
  @Column({ type: "timestamp", nullable: true })
  claimedAt: Date;

  @ApiPropertyOptional({ description: "When quest expired" })
  @Column({ type: "timestamp", nullable: true })
  expiredAt: Date;
}
