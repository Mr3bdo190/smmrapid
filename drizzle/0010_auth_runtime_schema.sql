-- Repair migration for databases created from older 0000/0002 schemas.
-- The current auth query requires these users columns.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS users_api_key_hash_unique ON users(api_key_hash) WHERE api_key_hash IS NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_requested boolean NOT NULL DEFAULT false;
DO $$ BEGIN
  CREATE TYPE refill_status AS ENUM ('Pending','Completed','Rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS refill_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  user_id uuid NOT NULL REFERENCES users(id),
  provider_refill_id text,
  status refill_status NOT NULL DEFAULT 'Pending',
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refill_requests_order_idx ON refill_requests(order_id);
CREATE INDEX IF NOT EXISTS refill_requests_user_idx ON refill_requests(user_id);
DO $$ BEGIN
  CREATE TYPE contact_message_status AS ENUM ('New','Read','Replied');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status contact_message_status NOT NULL DEFAULT 'New',
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_messages_status_idx ON contact_messages(status);
CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx ON contact_messages(created_at DESC);
