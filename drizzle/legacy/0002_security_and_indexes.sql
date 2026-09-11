-- Security hardening migration. Run after 0001.
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS users_api_key_hash_unique ON users(api_key_hash) WHERE api_key_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_raffle_tickets_user_id ON raffle_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_status_created ON orders(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_category_status ON services(category_id, status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON ticket_messages(created_at);
