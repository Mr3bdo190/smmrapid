-- Supabase-compatible PostgreSQL schema for SMM Panel
-- Generated from Drizzle ORM schema (src/db/schema.ts)
-- Run this in Supabase SQL Editor or via psql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================
CREATE TYPE role_enum AS ENUM ('admin', 'user');
CREATE TYPE user_status_enum AS ENUM ('active', 'suspended', 'banned');
CREATE TYPE provider_status_enum AS ENUM ('active', 'inactive');
CREATE TYPE category_status_enum AS ENUM ('active', 'inactive');
CREATE TYPE service_status_enum AS ENUM ('active', 'inactive');
CREATE TYPE order_status_enum AS ENUM ('Pending', 'Processing', 'In Progress', 'Completed', 'Partial', 'Canceled', 'Refunded');
CREATE TYPE payment_status_enum AS ENUM ('Pending', 'Approved', 'Rejected');
CREATE TYPE ticket_status_enum AS ENUM ('Open', 'Answered', 'Closed');
CREATE TYPE report_status_enum AS ENUM ('Unresolved', 'Resolved');
CREATE TYPE raffle_status_enum AS ENUM ('Open', 'Closed', 'Drawn');
CREATE TYPE refill_status_enum AS ENUM ('Pending', 'Completed', 'Rejected');
CREATE TYPE contact_message_status_enum AS ENUM ('New', 'Read', 'Replied');

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid TEXT NOT NULL UNIQUE,
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES users(id),
    role role_enum DEFAULT 'user' NOT NULL,
    name TEXT,
    email TEXT NOT NULL UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    email_verification_token TEXT,
    email_verification_expires TIMESTAMPTZ,
    password_reset_token TEXT,
    password_reset_expires TIMESTAMPTZ,
    balance NUMERIC(12, 4) DEFAULT '0.0000' NOT NULL,
    api_key TEXT UNIQUE,
    api_key_hash TEXT UNIQUE,
    status user_status_enum DEFAULT 'active' NOT NULL,
    game_points INTEGER DEFAULT 0 NOT NULL,
    game_last_click TIMESTAMPTZ,
    last_claim_date TIMESTAMPTZ,
    current_streak INTEGER DEFAULT 0 NOT NULL,
    keys INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Users indexes
CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_referral_code_idx ON users(referral_code);
CREATE INDEX users_referred_by_idx ON users(referred_by);
CREATE INDEX users_email_verification_token_idx ON users(email_verification_token);
CREATE INDEX users_password_reset_token_idx ON users(password_reset_token);

-- ============================================
-- PROVIDERS TABLE
-- ============================================
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    api_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    profit_margin INTEGER DEFAULT 50 NOT NULL,
    status provider_status_enum DEFAULT 'active' NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL
);

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    status category_status_enum DEFAULT 'active' NOT NULL
);

-- ============================================
-- SERVICES TABLE
-- ============================================
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) NOT NULL,
    provider_id UUID REFERENCES providers(id),
    provider_service_id TEXT,
    name TEXT NOT NULL,
    price_per_1k NUMERIC(12, 4) NOT NULL,
    provider_price NUMERIC(12, 4) DEFAULT '0.0000',
    min_quantity INTEGER NOT NULL,
    max_quantity INTEGER NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    cashback_percentage INTEGER DEFAULT 0 NOT NULL,
    refillable BOOLEAN DEFAULT FALSE NOT NULL,
    cancelable BOOLEAN DEFAULT FALSE NOT NULL,
    status service_status_enum DEFAULT 'active' NOT NULL
);

-- Services indexes
CREATE INDEX services_category_idx ON services(category_id);
CREATE INDEX services_provider_idx ON services(provider_id);
CREATE INDEX services_status_idx ON services(status);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    service_id UUID REFERENCES services(id) NOT NULL,
    link TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    charge NUMERIC(12, 4) NOT NULL,
    cost NUMERIC(12, 4) DEFAULT '0.0000' NOT NULL,
    status order_status_enum DEFAULT 'Pending' NOT NULL,
    provider_order_id TEXT,
    provider_error TEXT,
    start_count INTEGER DEFAULT 0 NOT NULL,
    remains INTEGER DEFAULT 0 NOT NULL,
    cancel_requested BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Orders indexes
CREATE INDEX orders_user_idx ON orders(user_id);
CREATE INDEX orders_service_idx ON orders(service_id);
CREATE INDEX orders_status_idx ON orders(status);
CREATE INDEX orders_provider_order_idx ON orders(provider_order_id);
CREATE INDEX orders_created_at_idx ON orders(created_at);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    amount NUMERIC(12, 4) NOT NULL,
    method TEXT NOT NULL,
    status payment_status_enum DEFAULT 'Pending' NOT NULL,
    transaction_id TEXT UNIQUE,
    transaction_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ
);

-- Payments indexes
CREATE INDEX payments_user_idx ON payments(user_id);
CREATE INDEX payments_status_idx ON payments(status);
CREATE INDEX payments_transaction_id_idx ON payments(transaction_id);
CREATE INDEX payments_created_at_idx ON payments(created_at);

-- ============================================
-- TICKETS TABLE
-- ============================================
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    subject TEXT NOT NULL,
    status ticket_status_enum DEFAULT 'Open' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tickets indexes
CREATE INDEX tickets_user_idx ON tickets(user_id);
CREATE INDEX tickets_status_idx ON tickets(status);

-- ============================================
-- TICKET MESSAGES TABLE
-- ============================================
CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) NOT NULL,
    sender_id UUID REFERENCES users(id) NOT NULL,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ticket messages indexes
CREATE INDEX ticket_messages_ticket_idx ON ticket_messages(ticket_id);
CREATE INDEX ticket_messages_sender_idx ON ticket_messages(sender_id);

-- ============================================
-- SETTINGS TABLE
-- ============================================
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES users(id) NOT NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Audit logs indexes
CREATE INDEX audit_logs_admin_idx ON audit_logs(admin_id);
CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
CREATE INDEX audit_logs_created_at_idx ON audit_logs(created_at);

-- ============================================
-- SYSTEM REPORTS TABLE
-- ============================================
CREATE TABLE system_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    error_reason TEXT NOT NULL,
    location TEXT NOT NULL,
    details TEXT,
    status report_status_enum DEFAULT 'Unresolved' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- System reports indexes
CREATE INDEX system_reports_user_idx ON system_reports(user_id);
CREATE INDEX system_reports_status_idx ON system_reports(status);

-- ============================================
-- SHORTLINKS TABLE
-- ============================================
CREATE TABLE shortlinks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    reward_amount NUMERIC(12, 4) NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- SHORTLINK CLAIMS TABLE
-- ============================================
CREATE TABLE shortlink_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    shortlink_id UUID REFERENCES shortlinks(id) NOT NULL,
    claimed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, shortlink_id)
);

-- Shortlink claims indexes
CREATE INDEX shortlink_claims_user_idx ON shortlink_claims(user_id);
CREATE INDEX shortlink_claims_shortlink_idx ON shortlink_claims(shortlink_id);

-- ============================================
-- SHORTLINK TOKENS TABLE
-- ============================================
CREATE TABLE shortlink_tokens (
    token TEXT PRIMARY KEY,
    user_id UUID REFERENCES users(id) NOT NULL,
    shortlink_id UUID REFERENCES shortlinks(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ
);

-- Shortlink tokens indexes
CREATE INDEX shortlink_tokens_user_idx ON shortlink_tokens(user_id);
CREATE INDEX shortlink_tokens_shortlink_idx ON shortlink_tokens(shortlink_id);
CREATE INDEX shortlink_tokens_expires_idx ON shortlink_tokens(expires_at);

-- ============================================
-- RAFFLES TABLE
-- ============================================
CREATE TABLE raffles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'Weekly Raffle',
    prize_amount NUMERIC(12, 4) NOT NULL,
    ticket_price NUMERIC(12, 4) NOT NULL,
    max_tickets INTEGER,
    max_tickets_per_user INTEGER,
    status raffle_status_enum DEFAULT 'Open' NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    winner_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Raffles indexes
CREATE INDEX raffles_status_idx ON raffles(status);
CREATE INDEX raffles_end_date_idx ON raffles(end_date);

-- ============================================
-- RAFFLE TICKETS TABLE
-- ============================================
CREATE TABLE raffle_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raffle_id UUID REFERENCES raffles(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Raffle tickets indexes
CREATE INDEX raffle_tickets_raffle_idx ON raffle_tickets(raffle_id);
CREATE INDEX raffle_tickets_user_idx ON raffle_tickets(user_id);

-- ============================================
-- MYSTERY BOX TIERS TABLE
-- ============================================
CREATE TABLE mystery_box_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    min_amount NUMERIC(12, 4) NOT NULL,
    max_amount NUMERIC(12, 4) NOT NULL,
    probability INTEGER NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL
);

-- ============================================
-- WALLET LEDGER TABLE
-- ============================================
CREATE TABLE wallet_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    amount NUMERIC(12, 4) NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    reference_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Wallet ledger indexes
CREATE INDEX wallet_ledger_user_idx ON wallet_ledger(user_id);
CREATE INDEX wallet_ledger_reference_idx ON wallet_ledger(reference_id);
CREATE INDEX wallet_ledger_created_at_idx ON wallet_ledger(created_at);

-- ============================================
-- REFERRAL CLICKS TABLE
-- ============================================
CREATE TABLE referral_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Referral clicks indexes
CREATE INDEX referral_clicks_code_idx ON referral_clicks(referral_code);
CREATE INDEX referral_clicks_created_at_idx ON referral_clicks(created_at);

-- ============================================
-- AFFILIATE COMMISSIONS TABLE
-- ============================================
CREATE TABLE affiliate_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES users(id) NOT NULL,
    referred_user_id UUID REFERENCES users(id) NOT NULL,
    payment_id UUID REFERENCES payments(id) NOT NULL UNIQUE,
    amount NUMERIC(12, 4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Affiliate commissions indexes
CREATE INDEX affiliate_commissions_affiliate_idx ON affiliate_commissions(affiliate_id);
CREATE INDEX affiliate_commissions_referred_idx ON affiliate_commissions(referred_user_id);
CREATE INDEX affiliate_commissions_payment_idx ON affiliate_commissions(payment_id);

-- ============================================
-- CONTACT MESSAGES TABLE
-- ============================================
CREATE TABLE contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status contact_message_status_enum DEFAULT 'New' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Contact messages indexes
CREATE INDEX contact_messages_email_idx ON contact_messages(email);
CREATE INDEX contact_messages_status_idx ON contact_messages(status);
CREATE INDEX contact_messages_created_at_idx ON contact_messages(created_at);

-- ============================================
-- REFILL REQUESTS TABLE
-- ============================================
CREATE TABLE refill_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    provider_refill_id TEXT,
    status refill_status_enum DEFAULT 'Pending' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Refill requests indexes
CREATE INDEX refill_requests_order_idx ON refill_requests(order_id);
CREATE INDEX refill_requests_user_idx ON refill_requests(user_id);
CREATE INDEX refill_requests_status_idx ON refill_requests(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS) - DISABLED FOR FIREBASE AUTH ARCHITECTURE
-- ============================================
-- NOTE: This application uses Firebase Authentication with a custom Express backend.
-- The backend verifies Firebase ID tokens and enforces authorization in middleware
-- (requireAuth, requireAdmin). Database connections use a service role that bypasses RLS.
-- 
-- RLS policies based on auth.uid() are incompatible with Firebase Auth because:
-- 1. auth.uid() returns a Supabase Auth UUID, not a Firebase UID
-- 2. The database connection is not authenticated as the end user
-- 
-- If you migrate to Supabase Auth, uncomment and adapt the policies below.
-- For now, RLS is left DISABLED (default) on all tables.
-- 
-- Example of how policies would look with Supabase Auth:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = uid);
-- ... etc.

-- ============================================
-- HELPER FUNCTIONS (for potential future Supabase Auth migration)
-- ============================================

-- Function to get current user's internal ID from Firebase UID
-- NOTE: Requires Supabase Auth integration to work with auth.uid()
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT id FROM users WHERE uid = auth.uid()::text;
$$;

-- Function to check if current user is admin
-- NOTE: Requires Supabase Auth integration to work with auth.uid()
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT role = 'admin' FROM users WHERE uid = auth.uid()::text;
$$;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DEFAULT SETTINGS
-- ============================================
INSERT INTO settings (key, value) VALUES
    ('site_name', 'RapidSMM'),
    ('currency_symbol', '$'),
    ('vodafone_cash_number', ''),
    ('site_description', 'Automated social media growth, dispatched instantly'),
    ('support_email', 'support@smmrapid.store'),
    ('site_logo', ''),
    ('usd_exchange_rate', '50'),
    ('affiliate_commission_percentage', '5')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- GRANTS FOR SUPABASE
-- ============================================
-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant select on all tables to anon (for public data)
GRANT SELECT ON providers, categories, services, shortlinks, mystery_box_tiers, raffles TO anon;

-- Grant all on all tables to authenticated (RLS would restrict if enabled)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant all on all sequences to authenticated
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- ============================================
-- REALTIME PUBLICATION (for Supabase Realtime)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE
    orders,
    payments,
    tickets,
    ticket_messages,
    wallet_ledger,
    raffle_tickets,
    shortlink_claims,
    affiliate_commissions,
    refill_requests;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'SMM Panel schema created successfully!';
    RAISE NOTICE 'Tables created: 22';
    RAISE NOTICE 'Enums created: 11';
    RAISE NOTICE 'Indexes created: 30+';
    RAISE NOTICE 'RLS policies: DISABLED (using Firebase Auth + backend middleware)';
    RAISE NOTICE 'Realtime publication configured for key tables';
END $$;
