-- Production hardening / missing objects. Safe to run after 0000.
ALTER TABLE IF EXISTS raffles ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Weekly Raffle';
ALTER TABLE IF EXISTS raffles ADD COLUMN IF NOT EXISTS max_tickets integer;
ALTER TABLE IF EXISTS raffles ADD COLUMN IF NOT EXISTS max_tickets_per_user integer;

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  amount numeric(12,4) NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  reference_id text,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES users(id),
  referred_user_id uuid NOT NULL REFERENCES users(id),
  payment_id uuid NOT NULL UNIQUE REFERENCES payments(id),
  amount numeric(12,4) NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_provider_order_id ON orders(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_raffle_tickets_raffle_id ON raffle_tickets(raffle_id);
CREATE INDEX IF NOT EXISTS idx_shortlink_claims_user_id ON shortlink_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_shortlink_tokens_user_id ON shortlink_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_id_created_at ON wallet_ledger(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON referral_clicks(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_id ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_balance_nonnegative;
ALTER TABLE users ADD CONSTRAINT users_balance_nonnegative CHECK (balance >= 0);
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_quantity_range;
ALTER TABLE services ADD CONSTRAINT services_quantity_range CHECK (min_quantity > 0 AND max_quantity >= min_quantity);
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_cashback_range;
ALTER TABLE services ADD CONSTRAINT services_cashback_range CHECK (cashback_percentage BETWEEN 0 AND 100);
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_amount_positive;
ALTER TABLE payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);
ALTER TABLE raffles DROP CONSTRAINT IF EXISTS raffles_positive_amounts;
ALTER TABLE raffles ADD CONSTRAINT raffles_positive_amounts CHECK (prize_amount > 0 AND ticket_price > 0);
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_referred_by_fk FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
