-- Migration Script for Products Table based on the Mongoose Product Model

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  image TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('food', 'beverages', 'snacks', 'stationery', 'electronics', 'others')),
  price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  shop_id INTEGER NOT NULL, -- References shops(id)
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE products
  ADD CONSTRAINT fk_products_shop FOREIGN KEY (shop_id) REFERENCES shops(id);
