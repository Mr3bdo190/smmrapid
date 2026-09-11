-- Complete affiliate/referral hardening.
-- Safe to run after the existing migrations.
CREATE INDEX IF NOT EXISTS referral_clicks_code_idx ON referral_clicks (referral_code);
CREATE INDEX IF NOT EXISTS users_referred_by_idx ON users (referred_by);
CREATE INDEX IF NOT EXISTS affiliate_commissions_affiliate_idx ON affiliate_commissions (affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS affiliate_commissions_referred_idx ON affiliate_commissions (referred_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS affiliate_commissions_payment_idx ON affiliate_commissions (payment_id);
