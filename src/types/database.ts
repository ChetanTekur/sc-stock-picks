export type SignalType = "BUY" | "SELL_HIGH" | "SELL_LOW" | "NEUTRAL";
export type NotificationStatus = "sent" | "delivered" | "failed" | "bounced";

export interface Stock {
  id: string;
  ticker: string;
  company_name: string | null;
  current_price: number | null;
  sma_200w: number | null;
  price_vs_sma_pct: number | null;
  sma_slope_ever_negative: boolean;
  last_data_fetch: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyPrice {
  id: string;
  stock_id: string;
  week_ending: string;
  open_price: number | null;
  high_price: number | null;
  low_price: number | null;
  close_price: number;
  volume: number | null;
  sma_200w_at_week: number | null;
  created_at: string;
}

export interface UserTicker {
  id: string;
  user_id: string;
  stock_id: string;
  is_owned: boolean;
  added_at: string;
}

export interface StockSignal {
  id: string;
  stock_id: string;
  signal_type: SignalType;
  is_active: boolean;
  triggered_at: string;
  resolved_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  signal_id: string | null;
  channel: string;
  email_subject: string | null;
  sent_at: string;
  resend_message_id: string | null;
  status: NotificationStatus;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  email_notifications_enabled: boolean;
  daily_digest_enabled: boolean;
  weekly_summary_enabled: boolean;
  notification_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface InviteToken {
  id: string;
  token: string;
  created_by: string | null;
  used_by: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}
