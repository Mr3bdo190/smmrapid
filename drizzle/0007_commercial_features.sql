-- Commercial readiness: service capabilities and safe indexes. Idempotent.
ALTER TABLE services ADD COLUMN IF NOT EXISTS refillable boolean NOT NULL DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS cancelable boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_services_category_status_sort ON services(category_id,status,sort_order);
CREATE INDEX IF NOT EXISTS idx_services_provider_service ON services(provider_id,provider_service_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_method_status_created ON payments(method,status,created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON audit_logs(action_type,created_at);
