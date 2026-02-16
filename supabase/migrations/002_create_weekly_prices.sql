-- Historical weekly OHLCV data
CREATE TABLE weekly_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  week_ending DATE NOT NULL,
  open_price DECIMAL(12, 4),
  high_price DECIMAL(12, 4),
  low_price DECIMAL(12, 4),
  close_price DECIMAL(12, 4) NOT NULL,
  volume BIGINT,
  sma_200w_at_week DECIMAL(12, 4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stock_id, week_ending)
);

CREATE INDEX idx_weekly_prices_stock_week ON weekly_prices(stock_id, week_ending DESC);
