import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { AgentSession } from "./agent-session.entity";

export enum ProgressStatus {
  STARTED = "started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  BLOCKED = "blocked",
}

export enum ProgressCategory {
  ANALYSIS = "analysis",
  CODE_GENERATION = "code_generation",
  TESTING = "testing",
  FIX = "fix",
  DOCUMENTATION = "documentation",
  REFACTORING = "refactoring",
  OTHER = "other",
}

@Entity("agent_progress")
@Index(["sessionId"])
export class AgentProgress extends BaseEntity {
  @Column({ type: "uuid" })
  sessionId: string;

  @ManyToOne(() => AgentSession, (session) => session.progressUpdates, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "session_id" })
  session: AgentSession;

  @Column({ type: "varchar", length: 100, nullable: true })
  taskId: string | null;

  @Column({
    type: "enum",
    enum: ProgressStatus,
    default: ProgressStatus.IN_PROGRESS,
  })
  status: ProgressStatus;

  @Column({
    type: "enum",
    enum: ProgressCategory,
    default: ProgressCategory.OTHER,
  })
  category: ProgressCategory;

  @Column({ type: "text" })
  message: string;

  @Column({ type: "jsonb", default: [] })
  filesChanged: string[];

  @Column({ type: "int", nullable: true })
  linesAdded: number | null;

  @Column({ type: "int", nullable: true })
  linesRemoved: number | null;

  @Column({ type: "int", nullable: true })
  durationMs: number | null;

  @Column({ type: "uuid", nullable: true })
  proposalId: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;
}
