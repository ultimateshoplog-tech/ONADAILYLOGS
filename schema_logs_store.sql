-- =============================================================================
-- On A Daily Logs - Digital Store Database Schema
-- Clean Postgres schema without mock user data for testing deployment.
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS TABLE ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  balance DECIMAL(10, 2) DEFAULT 0.00,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_banned BOOLEAN DEFAULT FALSE,
  avatar VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── CATEGORIES TABLE ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'package',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── PRODUCTS TABLE ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  short_description VARCHAR(500),
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER DEFAULT -1, -- -1 means unlimited / single-use log
  product_data TEXT, -- Encrypted credentials (bank login, cookies, SMTP credentials, etc.)
  image_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  featured BOOLEAN DEFAULT FALSE,
  tags VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── ORDERS TABLE ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'refunded', 'cancelled')),
  product_data TEXT, -- Snapshot of credentials delivered
  credentials_accessed_at TIMESTAMPTZ,
  credentials_access_ip VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── DEPOSITS TABLE ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  method VARCHAR(20) NOT NULL CHECK (method IN ('bitcoin', 'usdt', 'oxapay', 'nowpayments')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  proof_url VARCHAR(255),
  transaction_hash VARCHAR(255),
  notes TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── REFUNDED LOGS TABLE ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refunded_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  recovered_data TEXT,
  refunded_amount NUMERIC(10,2),
  refunded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SITE SETTINGS TABLE ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── SEED CATEGORIES (NO MOCK USERS) ──────────────────────────────────────────
INSERT INTO categories (name, slug, description, icon) VALUES
  ('Bank Logs', 'bank-logs', 'High balance authenticated bank logs', 'credit-card'),
  ('Cards & Fullz', 'cards', 'Cards with full billing address details', 'database'),
  ('SMTP Servers', 'smtp', 'Bulk SMTP mailers for campaigns', 'mail'),
  ('RDP Access', 'rdp', 'Remote Desktop Protocol login access', 'monitor'),
  ('SSH Accounts', 'ssh', 'Secure Shell tunnel terminals', 'terminal'),
  ('Cheques & Accounts', 'cheques', 'Cheques and bank accounts info', 'file-text')
ON CONFLICT (slug) DO NOTHING;

-- ─── SEED DEFAULT SETTINGS ────────────────────────────────────────────────────
INSERT INTO site_settings (key, value) VALUES
  ('site_name', 'On A Daily Logs'),
  ('site_tagline', 'Premium Digital Assets & Access Tools'),
  ('min_deposit', '10.00'),
  ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);

-- ─── TRIGGER FUNCTION FOR UPDATED_AT ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
