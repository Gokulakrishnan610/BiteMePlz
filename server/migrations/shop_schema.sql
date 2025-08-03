-- Migration Script for Shops Table based on the Mongoose Shop Model

CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  image TEXT,
  shop_admin INTEGER NOT NULL, -- References users(id)
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  final_validity_time TIMESTAMP NOT NULL,
  next_opening_time TIMESTAMP NOT NULL DEFAULT (date_trunc('day', now() + interval '1 day') + interval '7 hour'),
  qr_validity_minutes INTEGER NOT NULL DEFAULT 20 CHECK (qr_validity_minutes BETWEEN 1 AND 60),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE shops
  ADD CONSTRAINT fk_shops_shop_admin FOREIGN KEY (shop_admin) REFERENCES users(id);
