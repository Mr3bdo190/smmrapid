-- 0005: provider adapter configuration + the "still offered upstream" flag
--
-- Two columns the provider layer needs, both additive and safe to re-run.
--
-- 1. provider_services.is_active
--    A sync must never delete a service row: orders and pricing history reference it. When a
--    provider stops offering a service, the row is flagged instead, so it disappears from the
--    catalogue while past orders stay readable.
--
-- 2. providers.adapter_config
--    The common SMM panel API differs between suppliers only in action names, parameter names and
--    response field names. That mapping is configuration, not code, and it is NOT secret — the API
--    credential stays in providers.credentials_encrypted (AES-256-GCM, key from the environment).

alter table provider_services
  add column if not exists is_active boolean not null default true;

comment on column provider_services.is_active is
  'false = the provider no longer offers this service; the row is kept for order and price history';

create index if not exists provider_services_active_idx
  on provider_services (provider_id, is_active);

alter table providers
  add column if not exists adapter_config jsonb not null default '{}'::jsonb;

comment on column providers.adapter_config is
  'Non-secret per-provider adapter mapping: base action names, parameter names, response fields';
