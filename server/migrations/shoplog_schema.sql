-- Migration Script for Shop Logs Table based on the Mongoose ShopLog Model

CREATE TABLE IF NOT EXISTS shoplogs (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL, -- References shops(id)
  action TEXT NOT NULL CHECK (action IN (
    'shop_opened',
    'shop_closed',
    'shop_created',
    'shop_activated',
    'shop_deactivated',
    'shop_deleted',
    'shop_updated',
    'manual_close',
    'auto_close',
    'final_validity_expired',
    'settings_updated',
    'validity_updated',
    'qr_validity_updated',
    'product_created',
    'product_updated',
    'product_deleted',
    'product_activated',
    'product_deactivated',
    'stock_updated',
    'price_updated',
    'order_verified',
    'order_cancelled',
    'order_refunded',
    'login_attempt',
    'logout',
    'password_changed',
    'profile_updated',
    'payment_received',
    'refund_processed',
    'balance_updated'
  )),
  performed_by INTEGER NOT NULL, -- References users(id)
  previous_state JSONB DEFAULT '{}'::JSONB,
  new_state JSONB DEFAULT '{}'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  description TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT DEFAULT 'shop' CHECK (category IN ('shop', 'product', 'order', 'user', 'system', 'financial')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add Foreign Key Constraints
ALTER TABLE shoplogs
  ADD CONSTRAINT fk_shoplogs_shop FOREIGN KEY (shop_id) REFERENCES shops(id),
  ADD CONSTRAINT fk_shoplogs_performed_by FOREIGN KEY (performed_by) REFERENCES users(id);

-- Indexes for Better Query Performance
CREATE INDEX IF NOT EXISTS idx_shoplogs_shop_created_at ON shoplogs (shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shoplogs_action_created_at ON shoplogs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shoplogs_performed_by_created_at ON shoplogs (performed_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shoplogs_category_created_at ON shoplogs (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shoplogs_severity_created_at ON shoplogs (severity, created_at DESC);
