/**
 * Shared types for Customer Telegram Bot sub-services
 */

import { Context } from "telegraf";
import { ClientUser } from "../../client/entities/client-user.entity";

export interface CustomerBotContext extends Context {
  telegramId?: string;
  clientUser?: ClientUser;
}

export interface CustomerSession {
  state: CustomerSessionState;
  data: Record<string, unknown>;
}

export enum CustomerSessionState {
  IDLE = "idle",
  // Complaint flow
  AWAITING_MACHINE_CODE = "awaiting_machine_code",
  AWAITING_COMPLAINT_TYPE = "awaiting_complaint_type",
  AWAITING_COMPLAINT_DESCRIPTION = "awaiting_complaint_description",
  AWAITING_PHONE = "awaiting_phone",
  AWAITING_PHOTO = "awaiting_photo",
  AWAITING_REFUND_DETAILS = "awaiting_refund_details",
  // Status flow
  AWAITING_TRANSACTION_ID = "awaiting_transaction_id",
  // Order flow
  AWAITING_ORDER_NUMBER = "awaiting_order_number",
}
