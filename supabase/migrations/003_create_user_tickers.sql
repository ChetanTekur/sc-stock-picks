-- Per-user tracking relationship
CREATE TABLE user_tickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  is_owned BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, stock_id)
);

CREATE INDEX idx_user_tickers_user ON user_tickers(user_id);
CREATE INDEX idx_user_tickers_stock ON user_tickers(stock_id);
