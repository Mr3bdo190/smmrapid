-- Phase 7: per-service fulfillment routing
-- provider = automatically submit to configured provider
-- manual = create/charge order but never submit it to a provider

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_execution_mode') THEN
    CREATE TYPE service_execution_mode AS ENUM ('provider','manual');
  END IF;
END $$;

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS execution_mode service_execution_mode NOT NULL DEFAULT 'provider';

UPDATE services SET execution_mode='provider' WHERE execution_mode IS NULL;

CREATE INDEX IF NOT EXISTS services_execution_mode_idx ON services(execution_mode);

