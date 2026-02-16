-- User notification preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications_enabled BOOLEAN DEFAULT TRUE,
  daily_digest_enabled BOOLEAN DEFAULT TRUE,
  weekly_summary_enabled BOOLEAN DEFAULT TRUE,
  notification_email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
