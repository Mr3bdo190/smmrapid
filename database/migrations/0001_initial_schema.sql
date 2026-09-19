-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- SMM Rapid — 0001: initial schema
--
-- Target: a FRESH Supabase PostgreSQL project (PG 15+). No legacy schema, no legacy data.
-- Applied by the owner, in filename order. Safe to re-run (see "idempotency" per table).
--
-- CONVENTIONS (binding for every later migration)
--   * MONEY is always a bigint in MINOR UNITS (cents) — columns end in `_minor`.
--     No float, no numeric, no money type for amounts. numeric is used ONLY for
--     percentages, fx rates and provider ratios, which are not amounts.
--   * The wallet balance is a cache of the ledger: it may only move through
--     wallet_apply() (see 0003). A trigger blocks any other balance change.
--   * IDs: uuid for entities referenced by APIs/URLs; bigint identity for append-only
--     streams (ledger, logs, events, messages) where index locality matters.
--   * Enums are used for closed sets that the product owns; text + CHECK for sets that
--     are expected to grow (notification types, banner placements, adapter keys).
--   * Content that an admin can remove keeps a nullable `deleted_at` (soft delete);
--     financial rows are never deleted.
--   * Timestamps are `timestamptz`, defaulting to now(). `updated_at` is maintained by a
--     trigger (set_updated_at) — never by the client.
--   * Customer-facing text is stored twice where it is user-visible: the source language
--     plus an optional Arabic override (`*_ar`).
--   * No secrets, keys or credentials in the database: provider credentials are stored
--     encrypted (providers.credentials_encrypted) with the key held in the environment.
-- ═══════════════════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- migration bookkeeping (so the owner can always see what has been applied)
-- ───────────────────────────────────────────────────────────────────────────────────────────
create table if not exists schema_migrations (
  filename      text primary key,
  applied_at    timestamptz not null default now(),
  applied_by    text not null default current_user,
  note          text
);

comment on table schema_migrations is 'One row per applied migration/seed file — the record of what has run.';

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- enum types
-- ───────────────────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_status') then
    create type user_status as enum ('active', 'suspended', 'banned');
  end if;
  if not exists (select 1 from pg_type where typname = 'audit_actor_type') then
    create type audit_actor_type as enum ('user', 'admin', 'system');
  end if;
  if not exists (select 1 from pg_type where typname = 'execution_mode') then
    create type execution_mode as enum ('provider', 'manual');
  end if;
  if not exists (select 1 from pg_type where typname = 'price_unit') then
    create type price_unit as enum ('per_1000', 'per_item');
  end if;
  if not exists (select 1 from pg_type where typname = 'input_type') then
    create type input_type as enum ('link', 'text', 'list', 'email', 'username', 'number', 'custom');
  end if;
  if not exists (select 1 from pg_type where typname = 'provider_sync_status') then
    create type provider_sync_status as enum ('running', 'completed', 'failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum ('pending', 'processing', 'in_progress', 'completed', 'partial', 'canceled', 'failed', 'refunded');
  end if;
  if not exists (select 1 from pg_type where typname = 'order_event_source') then
    create type order_event_source as enum ('system', 'admin', 'provider', 'user');
  end if;
  if not exists (select 1 from pg_type where typname = 'wallet_direction') then
    create type wallet_direction as enum ('credit', 'debit');
  end if;
  if not exists (select 1 from pg_type where typname = 'wallet_tx_type') then
    create type wallet_tx_type as enum (
      'payment', 'order_charge', 'order_refund', 'manual_adjustment',
      'bonus', 'affiliate_commission', 'withdrawal', 'fee'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_gateway') then
    create type payment_gateway as enum ('shahnawy', 'heleket');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('pending', 'approved', 'rejected', 'expired', 'canceled');
  end if;
  if not exists (select 1 from pg_type where typname = 'webhook_status') then
    create type webhook_status as enum ('received', 'processed', 'ignored', 'failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'coupon_type') then
    create type coupon_type as enum ('percent', 'fixed');
  end if;
  if not exists (select 1 from pg_type where typname = 'coupon_scope') then
    create type coupon_scope as enum ('all', 'category', 'service');
  end if;
  if not exists (select 1 from pg_type where typname = 'referral_status') then
    create type referral_status as enum ('pending', 'active', 'blocked');
  end if;
  if not exists (select 1 from pg_type where typname = 'commission_type') then
    create type commission_type as enum ('order_percent', 'signup_bonus', 'manual');
  end if;
  if not exists (select 1 from pg_type where typname = 'commission_status') then
    create type commission_status as enum ('pending', 'approved', 'paid', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'withdrawal_status') then
    create type withdrawal_status as enum ('pending', 'approved', 'rejected', 'paid');
  end if;
  if not exists (select 1 from pg_type where typname = 'ticket_priority') then
    create type ticket_priority as enum ('low', 'normal', 'high', 'urgent');
  end if;
  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type ticket_status as enum ('open', 'pending', 'answered', 'closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'ticket_author_type') then
    create type ticket_author_type as enum ('user', 'admin', 'system');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type content_status as enum ('draft', 'published', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'log_level') then
    create type log_level as enum ('debug', 'info', 'warn', 'error');
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- users & access control
-- ───────────────────────────────────────────────────────────────────────────────────────────
create table if not exists users (
  id                    uuid primary key default gen_random_uuid(),
  firebase_uid          text not null unique,
  email                 text not null,
  email_verified        boolean not null default false,
  display_name          text,
  avatar_url            text,
  referral_code         text unique,
  status                user_status not null default 'active',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  constraint users_email_not_blank check (char_length(trim(email)) between 3 and 320)
);

comment on table users is 'One row per Firebase account. firebase_uid is the only identity link; the API never trusts a client-sent user id or role.';
comment on column users.referral_code is 'The code this user shares with referrals (unique, nullable until first needed).';

create unique index if not exists users_email_lower_key on users (lower(email));

create table if not exists user_profiles (
  user_id               uuid primary key references users (id) on delete cascade,
  locale                text not null default 'ar',
  timezone              text not null default 'Africa/Cairo',
  phone                 text,
  country_code          char(2),
  company               text,
  onboarding_completed_at timestamptz,
  tour_dismissed_at     timestamptz,
  last_login_at         timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint user_profiles_locale_known check (locale in ('ar', 'en'))
);

create table if not exists roles (
  id                    uuid primary key default gen_random_uuid(),
  key                   text not null unique,
  name                  text not null,
  description           text,
  is_system             boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint roles_key_format check (key ~ '^[a-z][a-z0-9_.-]{1,48}$')
);

comment on table roles is 'Named roles (admin, support, finance …). Staff roles are rows, never a boolean column.';

create table if not exists permissions (
  id                    uuid primary key default gen_random_uuid(),
  key                   text not null unique,
  group_key             text not null,
  description           text,
  created_at            timestamptz not null default now(),
  constraint permissions_key_format check (key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')
);

comment on table permissions is 'Permission keys such as users.view / orders.refund. Checked server-side on every admin route.';

create table if not exists role_permissions (
  role_id               uuid not null references roles (id) on delete cascade,
  permission_id         uuid not null references permissions (id) on delete cascade,
  created_at            timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists user_roles (
  user_id               uuid not null references users (id) on delete cascade,
  role_id               uuid not null references roles (id) on delete restrict,
  granted_by            uuid references users (id) on delete set null,
  granted_at            timestamptz not null default now(),
  primary key (user_id, role_id)
);

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- configuration
-- ───────────────────────────────────────────────────────────────────────────────────────────
create table if not exists settings (
  key                   text primary key,
  value                 jsonb not null,
  group_key             text not null default 'general',
  description           text,
  updated_by            uuid references users (id) on delete set null,
  updated_at            timestamptz not null default now(),
  constraint settings_key_format check (key ~ '^[a-z][a-z0-9_.]{2,63}$')
);

comment on table settings is 'Admin-editable configuration (site name, limits, exchange rate, copy). Secrets never live here — they are environment variables.';

create table if not exists feature_flags (
  key                   text primary key,
  enabled               boolean not null default false,
  rollout_percent       smallint not null default 100 check (rollout_percent between 0 and 100),
  description           text,
  updated_by            uuid references users (id) on delete set null,
  updated_at            timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- providers & the synced catalog they offer
-- ───────────────────────────────────────────────────────────────────────────────────────────
create table if not exists providers (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  slug                  text not null unique,
  adapter_key           text not null,
  base_url              text,
  credentials_encrypted text,
  is_active             boolean not null default true,
  priority              integer not null default 100,
  balance_minor         bigint check (balance_minor >= 0),
  balance_currency      char(3) not null default 'USD',
  last_sync_at          timestamptz,
  last_sync_status      provider_sync_status,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  constraint providers_adapter_key_format check (adapter_key ~ '^[a-z][a-z0-9_-]{1,48}$')
);

comment on table providers is 'One row per SMM supplier. adapter_key selects the code adapter; credentials are encrypted at rest with PROVIDER_ENCRYPTION_KEY (env).';
comment on column providers.balance_minor is 'Last known supplier balance (minor units) — informational, refreshed by the balance job.';

create table if not exists provider_services (
  id                    uuid primary key default gen_random_uuid(),
  provider_id           uuid not null references providers (id) on delete cascade,
  provider_service_id   text not null,
  name                  text not null,
  type                  text,
  rate_minor            bigint check (rate_minor >= 0),
  rate_currency         char(3) not null default 'USD',
  min_quantity          bigint check (min_quantity >= 0),
  max_quantity          bigint check (max_quantity >= 0),
  supports_refill       boolean not null default false,
  supports_cancel       boolean not null default false,
  supports_drip_feed    boolean not null default false,
  raw                   jsonb,
  fetched_at            timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint provider_services_unique_ref unique (provider_id, provider_service_id)
);

comment on table provider_services is 'Snapshot of what a supplier currently offers (source data for sync). Our own services reference it by (provider_id, provider_service_id).';

create table if not exists provider_sync_logs (
  id                    bigint generated always as identity primary key,
  provider_id           uuid not null references providers (id) on delete cascade,
  status                provider_sync_status not null default 'running',
  started_at            timestamptz not null default now(),
  finished_at           timestamptz,
  added_count           integer not null default 0,
  updated_count         integer not null default 0,
  disabled_count        integer not null default 0,
  message               text,
  error                 text,
  started_by            uuid references users (id) on delete set null
);

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- catalog: categories, services, variants
-- ───────────────────────────────────────────────────────────────────────────────────────────
create table if not exists categories (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  name_ar               text,
  slug                  text not null unique,
  description           text,
  description_ar        text,
  icon_key              text,
  sort_order            integer not null default 100,
  is_active             boolean not null default true,
  markup_percent        numeric(7,4) not null default 0 check (markup_percent >= 0 and markup_percent <= 100000),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  constraint categories_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,62}$')
);

comment on column categories.markup_percent is 'Default markup applied to provider cost for services in this category. Percent, not money.';

create table if not exists services (
  id                    uuid primary key default gen_random_uuid(),
  category_id           uuid not null references categories (id) on delete restrict,
  provider_id           uuid references providers (id) on delete set null,
  provider_service_id   text,
  name                  text not null,
  name_ar               text,
  slug                  text not null unique,
  description           text,
  description_ar        text,
  type                  text,
  execution_mode        execution_mode not null default 'provider',
  price_unit            price_unit not null default 'per_1000',
  price_minor           bigint not null default 0 check (price_minor >= 0),
  provider_cost_minor   bigint not null default 0 check (provider_cost_minor >= 0),
  markup_percent        numeric(7,4) check (markup_percent >= 0 and markup_percent <= 100000),
  markup_fixed_minor    bigint check (markup_fixed_minor >= 0),
  min_quantity          bigint not null default 1 check (min_quantity > 0),
  max_quantity          bigint not null default 1000000 check (max_quantity > 0),
  supports_refill       boolean not null default false,
  supports_cancel       boolean not null default false,
  supports_drip_feed    boolean not null default false,
  input_type            input_type not null default 'link',
  input_hint            text,
  input_hint_ar         text,
  estimated_time        text,
  sort_order            integer not null default 100,
  is_active             boolean not null default true,
  is_featured           boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  constraint services_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  constraint services_quantity_order check (max_quantity >= min_quantity),
  constraint services_provider_ref_consistent check (
    (provider_id is null and provider_service_id is null) or (provider_id is not null)
  )
);

comment on column services.price_minor is 'Customer price per `price_unit` (per 1000 units or per item), minor units. Authoritative for orders; recomputed by the pricing engine when cost or markup changes.';
comment on column services.provider_cost_minor is 'Our cost per `price_unit` from the supplier (minor units). Never shown to customers.';
comment on column services.input_type is 'Drives the order form control and its hint (link/text/list/email/username/number/custom).';

create table if not exists service_variants (
  id                    uuid primary key default gen_random_uuid(),
  service_id            uuid not null references services (id) on delete cascade,
  name                  text not null,
  name_ar               text,
  price_minor           bigint not null default 0 check (price_minor >= 0),
  min_quantity          bigint not null default 1 check (min_quantity > 0),
  max_quantity          bigint not null default 1000000 check (max_quantity > 0),
  is_active             boolean not null default true,
  sort_order            integer not null default 100,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint service_variants_quantity_order check (max_quantity >= min_quantity),
  constraint service_variants_unique_name unique (service_id, name)
);

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- coupons
-- ───────────────────────────────────────────────────────────────────────────────────────────
create table if not exists coupons (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null unique,
  type                  coupon_type not null,
  percent_bp            integer check (percent_bp between 0 and 10000),
  amount_minor          bigint check (amount_minor >= 0),
  max_discount_minor    bigint check (max_discount_minor >= 0),
  min_order_minor       bigint not null default 0 check (min_order_minor >= 0),
  scope                 coupon_scope not null default 'all',
  category_id           uuid references categories (id) on delete set null,
  service_id            uuid references services (id) on delete set null,
  usage_limit           integer check (usage_limit is null or usage_limit > 0),
  per_user_limit        integer not null default 1 check (per_user_limit > 0),
  used_count            integer not null default 0 check (used_count >= 0),
  starts_at             timestamptz,
  expires_at            timestamptz,
  is_active             boolean not null default true,
  created_by            uuid references users (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint coupons_code_upper check (code = upper(code)),
  constraint coupons_value_matches_type check (
    (type = 'percent' and percent_bp is not null and amount_minor is null) or
    (type = 'fixed'   and amount_minor is not null and percent_bp is null)
  ),
  constraint coupons_scope_target check (
    (scope = 'all' and category_id is null and service_id is null) or
    (scope = 'category' and category_id is not null and service_id is null) or
    (scope = 'service' and service_id is not null)
  ),
  constraint coupons_window check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create table if not exists coupon_redemptions (
  id                    uuid primary key default gen_random_uuid(),
  coupon_id             uuid not null references coupons (id) on delete restrict,
  user_id               uuid not null references users (id) on delete cascade,
  order_id              uuid,
  discount_minor        bigint not null check (discount_minor >= 0),
  created_at            timestamptz not null default now()
);

comment on table coupon_redemptions is 'One row per use. order_id FK is added after orders exists, to keep table creation order readable.';

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- wallet & ledger
-- ───────────────────────────────────────────────────────────────────────────────────────────
create table if not exists wallets (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references users (id) on delete cascade,
  currency              char(3) not null default 'USD',
  balance_minor         bigint not null default 0 check (balance_minor >= 0),
  version               bigint not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table wallets is 'Cache of the ledger — one wallet per user. balance_minor moves ONLY through wallet_apply() (guarded by a trigger, see 0003).';
comment on column wallets.version is 'Incremented on every balance change (optimistic locking / debugging aid).';

create table if not exists wallet_transactions (
  id                    bigint generated always as identity primary key,
  wallet_id             uuid not null references wallets (id) on delete restrict,
  user_id               uuid not null references users (id) on delete restrict,
  direction             wallet_direction not null,
  type                  wallet_tx_type not null,
  amount_minor          bigint not null check (amount_minor > 0),
  balance_after_minor   bigint not null check (balance_after_minor >= 0),
  currency              char(3) not null default 'USD',
  description           text,
  order_id              uuid,
  payment_id            uuid,
  commission_id         uuid,
  idempotency_key       text unique,
  actor_user_id         uuid references users (id) on delete set null,
  metadata              jsonb,
  created_at            timestamptz not null default now()
);

comment on table wallet_transactions is 'Append-only ledger. Every balance movement has exactly one row here; balance_after_minor makes the history auditable and reconcilable.';
comment on column wallet_transactions.idempotency_key is 'Optional unique key (e.g. gateway event id) so a retried call cannot move money twice.';

create table if not exists system_logs (
  id                    bigint generated always as identity primary key,
  level                 log_level not null default 'error',
  message               text not null,
  context               jsonb,
  ref                   text,
  route                 text,
  user_id               uuid references users (id) on delete set null,
  created_at            timestamptz not null default now()
);

comment on table system_logs is 'Server-side error/operation log. The `ref` is the support reference shown to a customer when something internal fails.';

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- payments
-- ───────────────────────────────────────────────────────────────────────────────────────────
create table if not exists payments (
  id                    uuid primary key default gen_random_uuid(),
  public_id             text not null unique default ('PAY' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  user_id               uuid not null references users (id) on delete restrict,
  gateway               payment_gateway not null,
  method                text not null,
  status                payment_status not null default 'pending',
  currency              char(3) not null default 'USD',
  amount_minor          bigint not null check (amount_minor >= 0),
  gateway_currency      char(3),
  gateway_amount_minor  bigint check (gateway_amount_minor is null or gateway_amount_minor >= 0),
  fx_rate               numeric(14,6) check (fx_rate is null or fx_rate > 0),
  provider_reference    text,
  provider_payload      jsonb,
  customer_note         text,
  admin_note            text,
  idempotency_key       text unique,
  resolved_at           timestamptz,
  resolved_by           uuid references users (id) on delete set null,
  wallet_transaction_id bigint references wallet_transactions (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table payments is 'A deposit attempt. amount_minor is what lands in the wallet (USD); gateway_* describe what the customer paid at the gateway.';
comment on column payments.provider_payload is 'Raw gateway payload for support/debugging. Server-only: never returned to a customer response.';
comment on column payments.admin_note is 'Reason a human admin rejected/approved — shown to the customer so a rejection is never unexplained.';

create table if not exists payment_attempts (
  id                    bigint generated always as identity primary key,
  payment_id            uuid references payments (id) on delete cascade,
  user_id               uuid references users (id) on delete set null,
  gateway               payment_gateway not null,
  operation             text not null,
  http_status           integer,
  success               boolean not null default false,
  request               jsonb,
  response              jsonb,
  error_code            text,
  error_message         text,
  created_at            timestamptz not null default now()
);

comment on table payment_attempts is 'One row per gateway call (create/verify). request/response are redacted server-side before insert.';

create table if not exists webhook_events (
  id                    bigint generated always as identity primary key,
  gateway               payment_gateway not null,
  event_id              text not null,
  payment_id            uuid references payments (id) on delete set null,
  signature_valid       boolean not null default false,
  status                webhook_status not null default 'received',
  payload               jsonb,
  error                 text,
  received_at           timestamptz not null default now(),
  processed_at          timestamptz,
  constraint webhook_events_unique_event unique (gateway, event_id)
);

comment on table webhook_events is 'Idempotency guard for gateway callbacks: the unique (gateway, event_id) makes a replayed webhook a no-op instead of a double credit.';

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- orders
-- ───────────────────────────────────────────────────────────────────────────────────────────
create table if not exists orders (
  id                    uuid primary key default gen_random_uuid(),
  public_id             text not null unique default ('ORD' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  user_id               uuid not null references users (id) on delete restrict,
  service_id            uuid not null references services (id) on delete restrict,
  variant_id            uuid references service_variants (id) on delete set null,
  provider_id           uuid references providers (id) on delete set null,
  provider_order_id     text,
  coupon_id             uuid references coupons (id) on delete set null,
  status                order_status not null default 'pending',
  target                text not null,
  quantity              bigint not null check (quantity > 0),
  charge_minor          bigint not null check (charge_minor >= 0),
  discount_minor        bigint not null default 0 check (discount_minor >= 0),
  provider_cost_minor   bigint not null default 0 check (provider_cost_minor >= 0),
  profit_minor          bigint generated always as (charge_minor - provider_cost_minor) stored,
  refunded_minor        bigint not null default 0 check (refunded_minor >= 0),
  start_count           bigint check (start_count is null or start_count >= 0),
  remains               bigint check (remains is null or remains >= 0),
  drip_feed             boolean not null default false,
  runs_at               timestamptz,
  idempotency_key       text unique,
  provider_error        text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  completed_at          timestamptz,
  constraint orders_target_length check (char_length(target) between 1 and 5000),
  constraint orders_refund_within_charge check (refunded_minor <= charge_minor)
);

comment on table orders is 'A customer order. `target` is free text (link, username, email, or a newline-separated list) and is forwarded exactly as typed.';
comment on column orders.provider_order_id is 'Supplier-side id. Server/admin only — never returned to the customer.';
comment on column orders.profit_minor is 'Generated: charge - provider cost. May be negative (a loss) and is never exposed to customers.';

create table if not exists order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references orders (id) on delete cascade,
  variant_id            uuid references service_variants (id) on delete set null,
  label                 text,
  quantity              bigint not null check (quantity > 0),
  unit_price_minor      bigint not null check (unit_price_minor >= 0),
  subtotal_minor        bigint not null check (subtotal_minor >= 0),
  created_at            timestamptz not null default now()
);

comment on table order_items is 'Line items for multi-variant/package orders. Simple orders have one row here or none (the order itself carries quantity/charge).';

create table if not exists order_status_history (
  id                    bigint generated always as identity primary key,
  order_id              uuid not null references orders (id) on delete cascade,
  from_status           order_status,
  to_status             order_status not null,
  source                order_event_source not null default 'system',
  actor_user_id         uuid references users (id) on delete set null,
  note                  text,
  created_at            timestamptz not null default now()
);

-- late FK: coupon_redemptions.order_id → orders.id
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'coupon_redemptions_order_id_fkey'
  ) then
    alter table coupon_redemptions
      add constraint coupon_redemptions_order_id_fkey
      foreign key (order_id) references orders (id) on delete set null;
  end if;
end $$;

-- late FK: wallet_transactions.order_id / payment_id / commission_id
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wallet_transactions_order_id_fkey') then
    alter table wallet_transactions
      add constraint wallet_transactions_order_id_fkey
      foreign key (order_id) references orders (id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wallet_transactions_payment_id_fkey') then
    alter table wallet_transactions
      add constraint wallet_transactions_payment_id_fkey
      foreign key (payment_id) references payments (id) on delete set null;
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- referrals & affiliate earnings
-- ───────────────────────────────────────────────────────────────────────────────────────────
create table if not exists referrals (
  id                    uuid primary key default gen_random_uuid(),
  referrer_user_id      uuid not null references users (id) on delete cascade,
  referred_user_id      uuid not null unique references users (id) on delete cascade,
  code                  text not null,
  status                referral_status not null default 'pending',
  converted_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint referrals_no_self check (referrer_user_id <> referred_user_id)
);

create table if not exists referral_clicks (
  id                    bigint generated always as identity primary key,
  code                  text not null,
  referrer_user_id      uuid references users (id) on delete set null,
  landing_path          text,
  ip_hash               text,
  user_agent            text,
  created_at            timestamptz not null default now()
);

comment on column referral_clicks.ip_hash is 'Hashed at ingest (never the raw address) — enough to spot abuse without storing personal data.';

create table if not exists affiliate_commissions (
  id                    uuid primary key default gen_random_uuid(),
  referrer_user_id      uuid not null references users (id) on delete restrict,
  referred_user_id      uuid references users (id) on delete set null,
  type                  commission_type not null default 'order_percent',
  order_id              uuid references orders (id) on delete set null,
  payment_id            uuid references payments (id) on delete set null,
  base_amount_minor     bigint not null default 0 check (base_amount_minor >= 0),
  rate_percent          numeric(7,4) check (rate_percent is null or (rate_percent >= 0 and rate_percent <= 100)),
  amount_minor          bigint not null check (amount_minor >= 0),
  status                commission_status not null default 'pending',
  approved_at           timestamptz,
  paid_at               timestamptz,
  rejection_reason      text,
  metadata              jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table affiliate_commissions is 'Referral earnings. Approval never touches a wallet by itself: paying a commission writes a wallet_transactions row of type affiliate_commission.';

create table if not exists affiliate_withdrawals (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references users (id) on delete restrict,
  amount_minor          bigint not null check (amount_minor > 0),
  currency              char(3) not null default 'USD',
  method                text not null,
  destination           text not null,
  status                withdrawal_status not null default 'pending',
  admin_note            text,
  wallet_transaction_id bigint references wallet_transactions (id) on delete set null,
  requested_at          timestamptz not null default now(),
  resolved_at           timestamptz,
  resolved_by           uuid references users (id) on delete set null,
  updated_at            timestamptz not null default now()
);

comment on table affiliate_withdrawals is 'Payout request against affiliate earnings. Created pending; the admin settles it out of band and marks it approved/paid.';

-- late FK: wallet_transactions.commission_id → affiliate_commissions
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wallet_transactions_commission_id_fkey') then
    alter table wallet_transactions
      add constraint wallet_transactions_commission_id_fkey
      foreign key (commission_id) references affiliate_commissions (id) on delete set null;
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- support tickets
-- ───────────────────────────────────────────────────────────────────────────────────────────
create table if not exists tickets (
  id                    uuid primary key default gen_random_uuid(),
  public_id             text not null unique default ('TKT' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  user_id               uuid not null references users (id) on delete cascade,
  subject               text not null,
  category              text,
  priority              ticket_priority not null default 'normal',
  status                ticket_status not null default 'open',
  assigned_admin_id     uuid references users (id) on delete set null,
  last_message_at       timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  closed_at             timestamptz,
  constraint tickets_subject_length check (char_length(trim(subject)) between 3 and 200)
);

create table if not exists ticket_messages (
  id                    bigint generated always as identity primary key,
  ticket_id             uuid not null references tickets (id) on delete cascade,
  author_type           ticket_author_type not null,
  author_user_id        uuid references users (id) on delete set null,
  body                  text not null,
  attachments           jsonb not null default '[]'::jsonb,
  is_internal           boolean not null default false,
  created_at            timestamptz not null default now(),
  constraint ticket_messages_body_length check (char_length(trim(body)) between 1 and 10000)
);

comment on column ticket_messages.is_internal is 'Admin-only note. The API must filter is_internal = false for every customer-facing query.';

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- notifications
-- ───────────────────────────────────────────────────────────────────────────────────────────
create table if not exists notifications (
  id                    bigint generated always as identity primary key,
  user_id               uuid not null references users (id) on delete cascade,
  type                  text not null,
  title                 text not null,
  body                  text,
  link                  text,
  read_at               timestamptz,
  created_at            timestamptz not null default now()
);

comment on table notifications is 'Customer notifications. Read state is per row (one row per event), so a badge can count items and drop by exactly one.';

create table if not exists admin_notifications (
  id                    bigint generated always as identity primary key,
  admin_user_id         uuid not null references users (id) on delete cascade,
  type                  text not null,
  title                 text not null,
  body                  text,
  link                  text,
  read_at               timestamptz,
  created_at            timestamptz not null default now()
);

comment on table admin_notifications is 'Per-admin queue items (new deposit, new ticket …). One row per admin per event gives an independent badge and per-item read state.';

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- content & SEO
-- ───────────────────────────────────────────────────────────────────────────────────────────
create table if not exists banners (
  id                    uuid primary key default gen_random_uuid(),
  placement             text not null default 'home_hero',
  title                 text,
  title_ar              text,
  subtitle              text,
  subtitle_ar           text,
  image_url             text,
  link_url              text,
  cta_label             text,
  cta_label_ar          text,
  is_active             boolean not null default true,
  starts_at             timestamptz,
  ends_at               timestamptz,
  sort_order            integer not null default 100,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists pages (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  title                 text not null,
  title_ar              text,
  body_md               text not null default '',
  body_md_ar            text,
  status                content_status not null default 'draft',
  published_at          timestamptz,
  updated_by            uuid references users (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  constraint pages_slug_format check (slug ~ '^[a-z0-9][a-z0-9/-]{0,79}$')
);

create table if not exists post_categories (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  name                  text not null,
  name_ar               text,
  description           text,
  sort_order            integer not null default 100,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists posts (
  id                    uuid primary key default gen_random_uuid(),
  category_id           uuid references post_categories (id) on delete set null,
  slug                  text not null unique,
  title                 text not null,
  title_ar              text,
  excerpt               text,
  body_md               text not null default '',
  body_md_ar            text,
  cover_image_url       text,
  author_user_id        uuid references users (id) on delete set null,
  status                content_status not null default 'draft',
  reading_minutes       integer check (reading_minutes is null or reading_minutes > 0),
  published_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  constraint posts_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,99}$')
);

create table if not exists post_tags (
  post_id               uuid not null references posts (id) on delete cascade,
  tag                   text not null,
  primary key (post_id, tag)
);

create table if not exists seo_metadata (
  id                    uuid primary key default gen_random_uuid(),
  entity_type           text not null,
  entity_id             uuid,
  path                  text not null unique,
  locale                char(2) not null default 'ar',
  title                 text,
  description           text,
  canonical_url         text,
  robots                text not null default 'index,follow',
  og_title              text,
  og_description        text,
  og_image_url          text,
  twitter_card          text default 'summary_large_image',
  structured_data       jsonb,
  updated_by            uuid references users (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint seo_metadata_locale_known check (locale in ('ar', 'en'))
);

comment on table seo_metadata is 'Per-route SEO overrides. Rows for service/category pages are generated from the entity and may be overridden here.';

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- audit
-- ───────────────────────────────────────────────────────────────────────────────────────────
create table if not exists audit_logs (
  id                    bigint generated always as identity primary key,
  actor_type            audit_actor_type not null default 'system',
  actor_user_id         uuid references users (id) on delete set null,
  action                text not null,
  entity_type           text,
  entity_id             text,
  old_value             jsonb,
  new_value             jsonb,
  ip                    inet,
  user_agent            text,
  ref                   text,
  created_at            timestamptz not null default now()
);

comment on table audit_logs is 'Append-only record of sensitive operations (logins, admin actions, balance changes, payment decisions). Never stores secrets or password material.';

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- updated_at maintenance
-- ───────────────────────────────────────────────────────────────────────────────────────────
create or replace function set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

comment on function set_updated_at() is 'Generic BEFORE UPDATE trigger: keeps updated_at accurate without trusting the client.';

do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'user_profiles', 'roles', 'settings', 'feature_flags', 'providers',
    'provider_services', 'categories', 'services', 'service_variants', 'coupons',
    'wallets', 'payments', 'orders', 'referrals', 'affiliate_commissions',
    'affiliate_withdrawals', 'tickets', 'banners', 'pages', 'post_categories',
    'posts', 'seo_metadata'
  ]
  loop
    if not exists (
      select 1 from pg_trigger where tgname = t || '_set_updated_at'
    ) then
      execute format(
        'create trigger %I before update on %I for each row execute function set_updated_at()',
        t || '_set_updated_at', t
      );
    end if;
  end loop;
end $$;

insert into schema_migrations (filename, note)
values ('0001_initial_schema.sql', 'tables, enums, constraints, updated_at triggers')
on conflict (filename) do nothing;
