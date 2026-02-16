-- Shared stock reference data
CREATE TABLE stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker VARCHAR(10) NOT NULL UNIQUE,
  company_name VARCHAR(255),
  current_price DECIMAL(12, 4),
  sma_200w DECIMAL(12, 4),
  price_vs_sma_pct DECIMAL(8, 4),
  sma_slope_ever_negative BOOLEAN DEFAULT TRUE,
  last_data_fetch TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stocks_ticker ON stocks(ticker);
