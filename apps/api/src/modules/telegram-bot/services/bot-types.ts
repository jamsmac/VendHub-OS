/**
 * Shared types for Telegram Bot sub-services
 */

import { Context } from "telegraf";
import { User } from "../../users/entities/user.entity";

export interface BotContext extends Context {
  user?: User;
  organizationId?: string;
}

export interface TelegramSession {
  state: SessionState;
  data: Record<string, unknown>;
}

export enum SessionState {
  IDLE = "idle",
  AWAITING_TASK_COMPLETE = "awaiting_task_complete",
  AWAITING_PHOTO_BEFORE = "awaiting_photo_before",
  AWAITING_PHOTO_AFTER = "awaiting_photo_after",
  AWAITING_COMMENT = "awaiting_comment",
  AWAITING_CASH_AMOUNT = "awaiting_cash_amount",
  AWAITING_REJECTION_REASON = "awaiting_rejection_reason",
}
