BEGIN;

CREATE TABLE IF NOT EXISTS affiliate_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  amount numeric(12,4) NOT NULL CHECK (amount > 0),
  method text NOT NULL,
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  admin_note text,
  created_at timestamp NOT NULL DEFAULT now(),
  resolved_at timestamp
);
CREATE INDEX IF NOT EXISTS affiliate_withdrawals_user_idx ON affiliate_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS affiliate_withdrawals_status_idx ON affiliate_withdrawals(status);
CREATE INDEX IF NOT EXISTS affiliate_withdrawals_created_at_idx ON affiliate_withdrawals(created_at);

CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'percent',
  value numeric(12,4) NOT NULL CHECK (value > 0),
  min_spend numeric(12,4) NOT NULL DEFAULT 0,
  max_discount numeric(12,4),
  usage_limit integer,
  per_user_limit integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamp,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coupons_status_idx ON coupons(status);

CREATE TABLE IF NOT EXISTS coupon_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES coupons(id),
  user_id uuid NOT NULL REFERENCES users(id),
  order_id uuid REFERENCES orders(id),
  discount numeric(12,4) NOT NULL CHECK (discount >= 0),
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coupon_uses_coupon_idx ON coupon_uses(coupon_id);
CREATE INDEX IF NOT EXISTS coupon_uses_user_idx ON coupon_uses(user_id);
CREATE INDEX IF NOT EXISTS coupon_uses_order_idx ON coupon_uses(order_id);

-- Phase 3 settings. Safe to re-run.
INSERT INTO settings(key,value) VALUES
 ('affiliate_min_withdrawal','5'),
 ('affiliate_withdrawal_enabled','true'),
 ('coupon_enabled','true')
ON CONFLICT (key) DO NOTHING;

COMMIT;
