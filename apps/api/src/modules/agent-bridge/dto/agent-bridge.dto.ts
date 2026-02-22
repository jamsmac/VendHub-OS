import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  IsUUID,
  Length,
  Min,
} from "class-validator";
import {
  AgentType,
  AgentSessionStatus,
} from "../entities/agent-session.entity";
import {
  ProgressStatus,
  ProgressCategory,
} from "../entities/agent-progress.entity";

export class RegisterSessionDto {
  @ApiProperty({ description: "External session ID from agent-deck" })
  @IsString()
  @Length(1, 100)
  sessionId: string;

  @ApiProperty({ description: "Session display name" })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiPropertyOptional({ description: "Agent type", enum: AgentType })
  @IsOptional()
  @IsEnum(AgentType)
  agentType?: AgentType;

  @ApiPropertyOptional({ description: "Current task description" })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  currentTask?: string;

  @ApiPropertyOptional({ description: "Working directory path" })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  workingDirectory?: string;

  @ApiPropertyOptional({ description: "Agent profile name" })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  profile?: string;

  @ApiPropertyOptional({ description: "Attached MCP server names" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachedMcps?: string[];

  @ApiPropertyOptional({ description: "Additional metadata" })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateSessionDto {
  @ApiPropertyOptional({
    description: "Session status",
    enum: AgentSessionStatus,
  })
  @IsOptional()
  @IsEnum(AgentSessionStatus)
  status?: AgentSessionStatus;

  @ApiPropertyOptional({ description: "Current task" })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  currentTask?: string;

  @ApiPropertyOptional({ description: "Messages count" })
  @IsOptional()
  @IsInt()
  @Min(0)
  messagesCount?: number;

  @ApiPropertyOptional({ description: "Proposals count" })
  @IsOptional()
  @IsInt()
  @Min(0)
  proposalsCount?: number;

  @ApiPropertyOptional({ description: "Files changed count" })
  @IsOptional()
  @IsInt()
  @Min(0)
  filesChangedCount?: number;

  @ApiPropertyOptional({ description: "Additional metadata" })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class ReportProgressDto {
  @ApiProperty({ description: "External session ID" })
  @IsString()
  @Length(1, 100)
  sessionId: string;

  @ApiPropertyOptional({ description: "Task ID within the session" })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  taskId?: string;

  @ApiPropertyOptional({ description: "Progress status", enum: ProgressStatus })
  @IsOptional()
  @IsEnum(ProgressStatus)
  status?: ProgressStatus;

  @ApiPropertyOptional({
    description: "Progress category",
    enum: ProgressCategory,
  })
  @IsOptional()
  @IsEnum(ProgressCategory)
  category?: ProgressCategory;

  @ApiProperty({ description: "Progress message" })
  @IsString()
  @Length(1, 5000)
  message: string;

  @ApiPropertyOptional({ description: "Changed file paths" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filesChanged?: string[];

  @ApiPropertyOptional({ description: "Lines added" })
  @IsOptional()
  @IsInt()
  @Min(0)
  linesAdded?: number;

  @ApiPropertyOptional({ description: "Lines removed" })
  @IsOptional()
  @IsInt()
  @Min(0)
  linesRemoved?: number;

  @ApiPropertyOptional({ description: "Duration in milliseconds" })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;

  @ApiPropertyOptional({ description: "Proposal UUID" })
  @IsOptional()
  @IsUUID()
  proposalId?: string;

  @ApiPropertyOptional({ description: "Additional metadata" })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
