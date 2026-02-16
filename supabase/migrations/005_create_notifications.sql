-- Sent notification log
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES stock_signals(id),
  channel VARCHAR(20) DEFAULT 'email',
  email_subject VARCHAR(255),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  resend_message_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'bounced'))
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_sent ON notifications(sent_at DESC);
