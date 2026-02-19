// ─── Types ────────────────────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "system" | "task" | "inventory" | "payment" | "alert" | "maintenance";
  channels: ("push" | "email" | "sms" | "telegram" | "in_app")[];
  priority: "high" | "medium" | "low";
  status: "read" | "unread";
  related_entity_type?: string;
  related_entity_id?: string;
  created_at: string;
  read_at?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: "system" | "task" | "inventory" | "payment" | "alert" | "maintenance";
  channels: ("push" | "email" | "sms" | "telegram")[];
  subject: string;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

export interface NotificationRule {
  id: string;
  name: string;
  event: string;
  conditions: string;
  recipients: string;
  channels: ("push" | "email" | "sms" | "telegram")[];
  is_active: boolean;
  created_at: string;
}

export interface NotificationCampaign {
  id: string;
  name: string;
  message: string;
  audience_count: number;
  channels: ("push" | "email" | "sms" | "telegram")[];
  status: "draft" | "scheduled" | "sent" | "cancelled";
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  scheduled_at?: string;
  created_at: string;
}

export interface ChannelSettings {
  push: boolean;
  email: boolean;
  sms: boolean;
  telegram: boolean;
  in_app: boolean;
  sound: boolean;
}

export interface TypeChannelPreferences {
  [type: string]: {
    push: boolean;
    email: boolean;
    sms: boolean;
    telegram: boolean;
  };
}
