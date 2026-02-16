-- Computed signal state per stock
CREATE TABLE stock_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  signal_type VARCHAR(10) NOT NULL CHECK (signal_type IN ('BUY', 'SELL_HIGH', 'SELL_LOW', 'NEUTRAL')),
  is_active BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_signals_active ON stock_signals(stock_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_stock_signals_stock ON stock_signals(stock_id);
