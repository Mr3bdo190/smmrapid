-- Runtime auth compatibility for older production databases.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key_hash text;
CREATE INDEX IF NOT EXISTS users_email_verification_token_idx ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS users_password_reset_token_idx ON users(password_reset_token);
CREATE UNIQUE INDEX IF NOT EXISTS users_api_key_hash_unique ON users(api_key_hash) WHERE api_key_hash IS NOT NULL;
COMMIT;
