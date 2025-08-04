-- Migration Script for Transactions Table based on the Mongoose Transaction Model

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL,         -- References shops(id)
  order_id INTEGER NOT NULL,         -- References orders(id)
  user_id INTEGER NOT NULL,          -- References users(id)
  type TEXT NOT NULL CHECK (type IN ('payment', 'refund', 'verification', 'expiry', 'cancellation')),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  payment_method TEXT CHECK (payment_method IN ('balance', 'razorpay')),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_shop FOREIGN KEY (shop_id) REFERENCES shops(id),
  ADD CONSTRAINT fk_transactions_order FOREIGN KEY (order_id) REFERENCES orders(id),
  ADD CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(id);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_shop_created_at ON transactions (shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions (order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
