-- Provider-sourced service metadata. Safe/idempotent.
ALTER TABLE services ADD COLUMN IF NOT EXISTS provider_meta jsonb;
CREATE INDEX IF NOT EXISTS idx_services_provider_meta_gin ON services USING gin (provider_meta);
