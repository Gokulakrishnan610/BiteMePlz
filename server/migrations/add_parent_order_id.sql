-- Add parent_order_id column to orders table for multi-shop orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS parent_order_id TEXT; 