-- Migration Script for Orders and Order Items Tables based on the Mongoose Order Model

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE, -- Generated order identifier
  user_id INTEGER NOT NULL,      -- References users(id)
  shop_id INTEGER NOT NULL,      -- References shops(id)
  total_price NUMERIC NOT NULL DEFAULT 0.0,
  
  -- Payment Result fields (flattened)
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  payment_status TEXT,
  
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMP,
  
  qr_code TEXT,
  qr_valid_until TIMESTAMP,
  
  balance_amount NUMERIC DEFAULT 0,
  held_amount NUMERIC DEFAULT 0,
  
  final_validity TIMESTAMP,
  
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  expires_at TIMESTAMP NOT NULL,
  
  parent_order_id TEXT, -- For multi-shop orders
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shop_id INTEGER;

-- Order Items Table

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,      -- References orders(id)
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  image TEXT NOT NULL,
  price NUMERIC NOT NULL,
  product_id INTEGER NOT NULL     -- References products(id)
);

-- Foreign Key Constraints for Orders Table
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
  ADD CONSTRAINT fk_orders_shop FOREIGN KEY (shop_id) REFERENCES shops(id);

-- Foreign Key Constraint for Order Items Table
ALTER TABLE order_items
  ADD CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id);
