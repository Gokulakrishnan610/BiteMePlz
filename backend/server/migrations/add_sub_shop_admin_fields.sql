-- Migration Script to add sub-shop admin fields to users table

-- Add new columns for sub-shop admin functionality
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_sub_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_admin UUID;

-- Add foreign key constraint for parent_admin
ALTER TABLE users
ADD CONSTRAINT fk_users_parent_admin 
FOREIGN KEY (parent_admin) REFERENCES users(id);

-- Add index for better performance when querying sub-admins
CREATE INDEX IF NOT EXISTS idx_users_sub_admin ON users(is_sub_admin);
CREATE INDEX IF NOT EXISTS idx_users_parent_admin ON users(parent_admin); 