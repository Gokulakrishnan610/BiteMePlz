-- Migration Script for Student Analytics Table based on the Mongoose StudentAnalytics Model

CREATE TABLE IF NOT EXISTS studentanalytics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,            -- References users(id)
  shop_id INTEGER NOT NULL,            -- References shops(id)
  session_id TEXT NOT NULL,
  activity TEXT NOT NULL CHECK (activity IN (
    'shop_visit',
    'product_view',
    'cart_add',
    'cart_remove',
    'checkout_start',
    'payment_attempt',
    'payment_success',
    'payment_failed',
    'order_placed',
    'qr_generated',
    'qr_verified',
    'order_expired',
    'wallet_used',
    'search_performed',
    'category_filtered'
  )),
  product_id INTEGER,                  -- References products(id)
  order_id INTEGER,                    -- References orders(id)
  metadata JSONB DEFAULT '{}'::JSONB,
  "timestamp" TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE studentanalytics
  ADD CONSTRAINT fk_studentanalytics_user FOREIGN KEY (user_id) REFERENCES users(id),
  ADD CONSTRAINT fk_studentanalytics_shop FOREIGN KEY (shop_id) REFERENCES shops(id),
  ADD CONSTRAINT fk_studentanalytics_product FOREIGN KEY (product_id) REFERENCES products(id),
  ADD CONSTRAINT fk_studentanalytics_order FOREIGN KEY (order_id) REFERENCES orders(id);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_studentanalytics_user_timestamp ON studentanalytics (user_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_studentanalytics_shop_timestamp ON studentanalytics (shop_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_studentanalytics_activity_timestamp ON studentanalytics (activity, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_studentanalytics_session_timestamp ON studentanalytics (session_id, "timestamp" DESC);
