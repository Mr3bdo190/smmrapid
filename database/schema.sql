-- ====================================================================
-- SMM RAPID - COMPLETE SUPABASE POSTGRESQL DATABASE SCHEMA
-- Note: Row Level Security (RLS) is EXPLICITLY DISABLED on all tables as requested.
-- ====================================================================

-- 1. Users & Accounts
CREATE TABLE IF NOT EXISTS public.users (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(100) DEFAULT '',
  country VARCHAR(100) DEFAULT 'Egypt',
  balance NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (balance >= 0),
  total_spent NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (total_spent >= 0),
  total_orders INTEGER NOT NULL DEFAULT 0 CHECK (total_orders >= 0),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'vip', 'reseller', 'admin')),
  custom_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (custom_discount_percent >= 0 AND custom_discount_percent <= 100),
  password_hash VARCHAR(255),
  api_key VARCHAR(255) UNIQUE,
  bio TEXT DEFAULT '',
  avatar_config JSONB DEFAULT '{"presetId": "avatar-1", "backgroundColor": "#06b6d4", "accessory": "none", "accentColor": "#3b82f6"}'::jsonb,
  security_settings JSONB DEFAULT '{"twoFactorAuth": false, "twoFactorSecret": "", "loginAlertsEmail": true, "requirePinForOrders": false, "allowApiOrders": true, "whitelistedIps": "", "sessionTimeout": 60}'::jsonb,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_ip VARCHAR(100) DEFAULT '127.0.0.1'
);
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Services & Catalog
CREATE TABLE IF NOT EXISTS public.services (
  id VARCHAR(100) PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  category_ar VARCHAR(255) NOT NULL,
  category_en VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  rate_per_1000 NUMERIC(12, 4) NOT NULL CHECK (rate_per_1000 >= 0),
  min_quantity INTEGER NOT NULL DEFAULT 10 CHECK (min_quantity >= 1),
  max_quantity INTEGER NOT NULL DEFAULT 1000000 CHECK (max_quantity >= min_quantity),
  avg_time_ar VARCHAR(100) DEFAULT 'فوري (5-15 دقيقة)',
  avg_time_en VARCHAR(100) DEFAULT 'Instant (5-15 mins)',
  avg_speed_ar VARCHAR(100),
  avg_speed_en VARCHAR(100),
  refill_days INTEGER NOT NULL DEFAULT 0 CHECK (refill_days >= 0),
  speed VARCHAR(50) NOT NULL DEFAULT 'instant',
  badge VARCHAR(50),
  description_ar TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  provider_id VARCHAR(100),
  provider_service_id VARCHAR(100),
  provider_cost NUMERIC(12, 4) DEFAULT 0.0000,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;

-- 3. Orders & Tracking
CREATE TABLE IF NOT EXISTS public.orders (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_id VARCHAR(100) REFERENCES public.services(id) ON DELETE SET NULL,
  service_name_ar VARCHAR(255) NOT NULL,
  service_name_en VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  link TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  charge NUMERIC(12, 4) NOT NULL CHECK (charge >= 0),
  start_count INTEGER NOT NULL DEFAULT 0 CHECK (start_count >= 0),
  current_count INTEGER NOT NULL DEFAULT 0 CHECK (current_count >= 0),
  target_count INTEGER NOT NULL DEFAULT 0,
  remains INTEGER NOT NULL DEFAULT 0,
  provider_cost NUMERIC(12, 4) NOT NULL DEFAULT 0.0000 CHECK (provider_cost >= 0),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'in_progress', 'completed', 'canceled')),
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  speed_mode VARCHAR(50) NOT NULL DEFAULT 'instant' CHECK (speed_mode IN ('instant', 'gradual', 'drip')),
  drip_runs INTEGER DEFAULT 1,
  drip_interval_hours INTEGER DEFAULT 1,
  rated BOOLEAN NOT NULL DEFAULT FALSE,
  rating_score INTEGER CHECK (rating_score IS NULL OR (rating_score >= 1 AND rating_score <= 5)),
  rating_review TEXT,
  logs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- 4. Deposit Requests (Manual & E-Wallets)
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  method VARCHAR(100) NOT NULL,
  wallet_provider VARCHAR(50),
  sender_number VARCHAR(100),
  transfer_reference VARCHAR(255),
  amount_usd NUMERIC(12, 4) NOT NULL CHECK (amount_usd > 0),
  amount_egp NUMERIC(12, 4) NOT NULL CHECK (amount_egp > 0),
  bonus_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  account_number VARCHAR(100),
  transaction_hash TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.deposit_requests DISABLE ROW LEVEL SECURITY;

-- 5. Transactions History
CREATE TABLE IF NOT EXISTS public.transactions (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'order_charge', 'refund', 'bonus')),
  amount NUMERIC(12, 4) NOT NULL,
  method VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  note_ar TEXT DEFAULT '',
  note_en TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- 6. Customer Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) REFERENCES public.users(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  avatar TEXT DEFAULT '',
  country VARCHAR(100) DEFAULT 'Egypt',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  service_name_ar VARCHAR(255) NOT NULL,
  service_name_en VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  tags_ar TEXT[] DEFAULT '{}',
  tags_en TEXT[] DEFAULT '{}',
  comment_ar TEXT NOT NULL,
  comment_en TEXT NOT NULL,
  date VARCHAR(100) DEFAULT '',
  verified BOOLEAN NOT NULL DEFAULT TRUE,
  is_approved BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;

-- 7. Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  subject VARCHAR(255) NOT NULL,
  order_id VARCHAR(100),
  priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_update TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.support_tickets DISABLE ROW LEVEL SECURITY;

-- 8. Ticket Messages
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id VARCHAR(100) PRIMARY KEY,
  ticket_id VARCHAR(100) NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender VARCHAR(50) NOT NULL CHECK (sender IN ('user', 'agent')),
  sender_name VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.ticket_messages DISABLE ROW LEVEL SECURITY;

-- 9. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title_ar VARCHAR(255) NOT NULL,
  title_en VARCHAR(255) NOT NULL,
  message_ar TEXT NOT NULL,
  message_en TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'system' CHECK (type IN ('order', 'balance', 'system', 'offer')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  related_order_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- 10. Service Providers (API Integrations)
CREATE TABLE IF NOT EXISTS public.service_providers (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  balance NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  services_count INTEGER NOT NULL DEFAULT 0,
  auto_sync_rates BOOLEAN NOT NULL DEFAULT TRUE,
  auto_sync_status BOOLEAN NOT NULL DEFAULT TRUE,
  default_markup_percent NUMERIC(6, 2) NOT NULL DEFAULT 30.00,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.service_providers DISABLE ROW LEVEL SECURITY;

-- 11. Payment Gateways
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id VARCHAR(100) PRIMARY KEY,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('card', 'crypto', 'ewallet', 'wallet', 'bank', 'other')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  min_deposit NUMERIC(12, 4) NOT NULL DEFAULT 5.00,
  max_deposit NUMERIC(12, 4) NOT NULL DEFAULT 10000.00,
  fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  fixed_fee NUMERIC(12, 4) NOT NULL DEFAULT 0.00,
  bonus_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  exchange_rate NUMERIC(10, 4) NOT NULL DEFAULT 50.00,
  account_number VARCHAR(255) DEFAULT '',
  account_name VARCHAR(255) DEFAULT '',
  credentials JSONB DEFAULT '{}'::jsonb,
  instructions_ar TEXT DEFAULT '',
  instructions_en TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.payment_gateways DISABLE ROW LEVEL SECURITY;

-- 12. Discount Coupons
CREATE TABLE IF NOT EXISTS public.discount_coupons (
  id VARCHAR(100) PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  discount_percent NUMERIC(5, 2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  discount_fixed_usd NUMERIC(12, 4) DEFAULT 0.00,
  min_order_amount NUMERIC(12, 4) DEFAULT 0.00,
  max_discount_usd NUMERIC(12, 4) DEFAULT 100.00,
  usage_limit INTEGER DEFAULT 1000,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description_ar TEXT DEFAULT '',
  description_en TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.discount_coupons DISABLE ROW LEVEL SECURITY;

-- 13. Affiliates
CREATE TABLE IF NOT EXISTS public.affiliates (
  id VARCHAR(100) PRIMARY KEY,
  referrer_user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_user_name VARCHAR(255),
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  total_earned_usd NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.affiliates DISABLE ROW LEVEL SECURITY;

-- 14. Platform Settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  allow_registrations BOOLEAN NOT NULL DEFAULT TRUE,
  auto_refill_system BOOLEAN NOT NULL DEFAULT TRUE,
  live_support_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  drip_feed_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  require_review_approval BOOLEAN NOT NULL DEFAULT FALSE,
  e_wallets_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  crypto_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  egp_exchange_rate NUMERIC(10, 4) NOT NULL DEFAULT 50.00,
  vodafone_cash_number VARCHAR(100) DEFAULT '01012345678',
  orange_cash_number VARCHAR(100) DEFAULT '01212345678',
  etisalat_cash_number VARCHAR(100) DEFAULT '01112345678',
  instapay_username VARCHAR(100) DEFAULT 'smmrapid@instapay',
  usdt_trc20_address VARCHAR(255) DEFAULT 'TQ8z7b9h4xLkm93kdP92zQw81mskd02jdx',
  broadcast_announcement_ar TEXT DEFAULT '🎉 عرض حصري: بونص 10% مجاناً على جميع إيداعات فودافون كاش وإنستاباي اليوم!',
  broadcast_announcement_en TEXT DEFAULT '🎉 Special Bonus: 10% Extra Free on all Vodafone Cash & InstaPay deposits today!',
  broadcast_announcement_active BOOLEAN NOT NULL DEFAULT TRUE,
  -- Sha7nawy Gate Integration
  sha7nawy_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sha7nawy_base_url TEXT DEFAULT 'https://api.sha7nawy.com',
  sha7nawy_public_key TEXT DEFAULT '',
  sha7nawy_secret_key TEXT DEFAULT '',
  sha7nawy_webhook_url TEXT DEFAULT '',
  -- Heleket Crypto Gateway Integration
  heleket_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  heleket_base_url TEXT DEFAULT 'https://api.heleket.com',
  heleket_merchant_id TEXT DEFAULT '',
  heleket_api_key TEXT DEFAULT '',
  heleket_secret_key TEXT DEFAULT '',
  heleket_webhook_url TEXT DEFAULT '',
  heleket_supported_currencies TEXT DEFAULT 'USDT-TRC20,USDT-BEP20',
  auto_verify_payments BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.platform_settings DISABLE ROW LEVEL SECURITY;

-- 15. Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) REFERENCES public.users(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  type VARCHAR(50) NOT NULL,
  message_ar TEXT NOT NULL,
  message_en TEXT NOT NULL,
  amount NUMERIC(12, 4),
  badge VARCHAR(50),
  ip VARCHAR(100) DEFAULT '127.0.0.1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
