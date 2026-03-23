import { Entity, Column, OneToMany, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { AgentProgress } from "./agent-progress.entity";

export enum AgentType {
  CLAUDE_CODE = "claude_code",
  GEMINI_CLI = "gemini_cli",
  CURSOR = "cursor",
  OPENCODE = "opencode",
  CUSTOM = "custom",
}

export enum AgentSessionStatus {
  RUNNING = "running",
  WAITING = "waiting",
  IDLE = "idle",
  ERROR = "error",
  COMPLETED = "completed",
}

@Entity("agent_sessions")
@Index(["sessionId"], { unique: true })
@Index(["status"])
@Index(["organizationId"])
export class AgentSession extends BaseEntity {
  @Column({ type: "uuid", nullable: true })
  organizationId: string | null;

  @Column({ type: "varchar", length: 100, unique: true })
  sessionId: string;

  @Column({ type: "varchar", length: 200 })
  name: string;

  @Column({
    type: "enum",
    enum: AgentType,
    default: AgentType.CUSTOM,
  })
  agentType: AgentType;

  @Column({
    type: "enum",
    enum: AgentSessionStatus,
    default: AgentSessionStatus.RUNNING,
  })
  status: AgentSessionStatus;

  @Column({ type: "varchar", length: 500, nullable: true })
  currentTask: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  workingDirectory: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  profile: string | null;

  @Column({ type: "jsonb", default: [] })
  attachedMcps: string[];

  @Column({ type: "timestamp with time zone", nullable: true })
  lastActivityAt: Date | null;

  @Column({ type: "int", default: 0 })
  messagesCount: number;

  @Column({ type: "int", default: 0 })
  proposalsCount: number;

  @Column({ type: "int", default: 0 })
  filesChangedCount: number;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  @OneToMany(() => AgentProgress, (progress) => progress.session)
  progressUpdates: AgentProgress[];
}
