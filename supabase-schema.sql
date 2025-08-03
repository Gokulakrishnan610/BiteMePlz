-- Supabase Schema for REC-KIOSK
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (without foreign key constraints initially)
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    roll_no VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'shopAdmin', 'student')),
    shop UUID, -- Will add foreign key constraint later
    is_verified BOOLEAN DEFAULT FALSE,
    otp JSONB,
    password_reset_otp JSONB,
    password_reset_token JSONB,
    balance DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shops table (without foreign key constraints initially)
CREATE TABLE shops (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255) NOT NULL,
    image VARCHAR(500),
    shop_admin UUID NOT NULL, -- Will add foreign key constraint later
    is_active BOOLEAN DEFAULT TRUE,
    is_open BOOLEAN DEFAULT TRUE,
    final_validity_time TIMESTAMP WITH TIME ZONE NOT NULL,
    next_opening_time TIMESTAMP WITH TIME ZONE NOT NULL,
    qr_validity_minutes INTEGER DEFAULT 20 CHECK (qr_validity_minutes >= 1 AND qr_validity_minutes <= 60),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image VARCHAR(500),
    shop UUID NOT NULL REFERENCES shops(id),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    shop_id UUID NOT NULL REFERENCES shops(id),
    order_items JSONB NOT NULL,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    payment_result JSONB,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP WITH TIME ZONE,
    qr_code TEXT,
    qr_valid_until TIMESTAMP WITH TIME ZONE,
    balance_amount DECIMAL(10,2) DEFAULT 0,
    held_amount DECIMAL(10,2) DEFAULT 0,
    final_validity TIMESTAMP WITH TIME ZONE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    shop_id UUID REFERENCES shops(id),
    order_id UUID REFERENCES orders(id),
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('credit', 'debit', 'payment', 'refund')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shop logs table
CREATE TABLE shop_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id),
    action VARCHAR(100) NOT NULL,
    performed_by UUID REFERENCES users(id),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student analytics table
CREATE TABLE student_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    shop_id UUID REFERENCES shops(id),
    total_spent DECIMAL(10,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    favorite_products JSONB,
    spending_pattern JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints after all tables are created
ALTER TABLE users ADD CONSTRAINT fk_users_shop FOREIGN KEY (shop) REFERENCES shops(id);
ALTER TABLE shops ADD CONSTRAINT fk_shops_admin FOREIGN KEY (shop_admin) REFERENCES users(id);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_roll_no ON users(roll_no);
CREATE INDEX idx_users_shop ON users(shop);
CREATE INDEX idx_shops_admin ON shops(shop_admin);
CREATE INDEX idx_products_shop ON products(shop);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_shop ON orders(shop_id);
CREATE INDEX idx_orders_order_id ON orders(order_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_shop ON transactions(shop_id);
CREATE INDEX idx_shop_logs_shop ON shop_logs(shop_id);
CREATE INDEX idx_student_analytics_user ON student_analytics(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_analytics_updated_at BEFORE UPDATE ON student_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_analytics ENABLE ROW LEVEL SECURITY;

-- Users policies (simplified to avoid recursion)
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid()::text = id::text);
CREATE POLICY "Enable all access for now" ON users FOR ALL USING (true);

-- Shops policies (simplified to avoid recursion)
CREATE POLICY "Anyone can view active shops" ON shops FOR SELECT USING (is_active = true);
CREATE POLICY "Enable all access for now" ON shops FOR ALL USING (true);

-- Products policies (simplified to avoid recursion)
CREATE POLICY "Anyone can view available products" ON products FOR SELECT USING (is_available = true);
CREATE POLICY "Enable all access for now" ON products FOR ALL USING (true);

-- Orders policies (simplified to avoid recursion)
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Enable all access for now" ON orders FOR ALL USING (true);

-- Transactions policies (simplified to avoid recursion)
CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Enable all access for now" ON transactions FOR ALL USING (true);

-- Shop logs policies (simplified to avoid recursion)
CREATE POLICY "Enable all access for now" ON shop_logs FOR ALL USING (true);

-- Student analytics policies (simplified to avoid recursion)
CREATE POLICY "Users can view their own analytics" ON student_analytics FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Enable all access for now" ON student_analytics FOR ALL USING (true); 