-- Phase 9: secure provider credentials + atomic order dispatch
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS dispatching boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS orders_dispatch_queue_idx ON orders(status, dispatching, created_at);
-- providers.api_key now stores AES-256-GCM ciphertext produced by the application.
-- Existing plaintext provider keys are encrypted automatically at application startup when
-- PROVIDER_ENCRYPTION_KEY is configured; no plaintext key is written back afterwards.
