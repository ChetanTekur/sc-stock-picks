-- Enable RLS on all tables
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- stocks: all authenticated users can read (shared data)
CREATE POLICY "Authenticated users can read stocks"
  ON stocks FOR SELECT
  USING (auth.role() = 'authenticated');

-- weekly_prices: all authenticated users can read
CREATE POLICY "Authenticated users can read prices"
  ON weekly_prices FOR SELECT
  USING (auth.role() = 'authenticated');

-- user_tickers: users can only access their own
CREATE POLICY "Users can view own tickers"
  ON user_tickers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tickers"
  ON user_tickers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickers"
  ON user_tickers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tickers"
  ON user_tickers FOR DELETE
  USING (auth.uid() = user_id);

-- stock_signals: all authenticated users can read
CREATE POLICY "Authenticated users can read signals"
  ON stock_signals FOR SELECT
  USING (auth.role() = 'authenticated');

-- notifications: users can only see their own
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- user_preferences: users can only manage their own
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- invite_tokens: only authenticated users can read valid tokens
CREATE POLICY "Anyone can read valid invite tokens"
  ON invite_tokens FOR SELECT
  USING (used_at IS NULL AND expires_at > NOW());
