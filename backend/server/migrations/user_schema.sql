-- Migration Script for Users Table based on the Mongoose User Model

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  roll_no TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'shopAdmin', 'student')),
  shop_id INTEGER, -- Optional reference to shops(id)
  is_verified BOOLEAN DEFAULT FALSE,
  otp JSONB,                 -- Stores { "code": String, "expires_at": Timestamp }
  password_reset_otp JSONB,  -- Stores { "code": String, "expires_at": Timestamp }
  password_reset_token JSONB,-- Stores { "token": String, "expires_at": Timestamp }
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add Foreign Key Constraint for shop reference if needed
ALTER TABLE users
  ADD CONSTRAINT fk_users_shop FOREIGN KEY (shop_id) REFERENCES shops(id);
