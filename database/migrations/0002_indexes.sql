-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- SMM Rapid — 0002: indexes and uniqueness guards
--
-- Every index here exists for a query the application actually runs (customer lists, admin
-- queues, ledger lookups, webhook dedupe). Nothing is added "just in case": each one costs
-- write time and storage.
--
-- Safe to re-run: all statements are CREATE INDEX IF NOT EXISTS / CREATE UNIQUE INDEX IF NOT
-- EXISTS. Nothing is dropped or rewritten.
-- ═══════════════════════════════════════════════════════════════════════════════════════════

-- ── users & access ---------------------------------------------------------------------------
create index if not exists users_status_idx            on users (status);
create index if not exists users_created_at_idx        on users (created_at desc);
create index if not exists user_roles_role_idx         on user_roles (role_id);
create index if not exists role_permissions_perm_idx   on role_permissions (permission_id);

-- ── configuration ----------------------------------------------------------------------------
create index if not exists settings_group_idx          on settings (group_key);

-- ── providers & catalog ----------------------------------------------------------------------
create index if not exists providers_active_priority_idx on providers (is_active, priority);
create index if not exists provider_services_provider_idx on provider_services (provider_id, fetched_at desc);
create index if not exists provider_sync_logs_provider_idx on provider_sync_logs (provider_id, started_at desc);
create index if not exists provider_sync_logs_status_idx on provider_sync_logs (status);

create index if not exists categories_active_sort_idx  on categories (is_active, sort_order) where deleted_at is null;
create index if not exists services_category_active_idx on services (category_id, is_active, sort_order) where deleted_at is null;
create index if not exists services_provider_idx        on services (provider_id) where provider_id is not null;
create index if not exists services_provider_ref_idx    on services (provider_id, provider_service_id) where provider_service_id is not null;
create index if not exists services_featured_idx        on services (is_featured, sort_order) where is_active and deleted_at is null;
create index if not exists service_variants_service_idx on service_variants (service_id, is_active, sort_order);

-- ── coupons ----------------------------------------------------------------------------------
create index if not exists coupons_active_window_idx    on coupons (is_active, expires_at);
create index if not exists coupon_redemptions_user_idx  on coupon_redemptions (coupon_id, user_id);
create index if not exists coupon_redemptions_order_idx on coupon_redemptions (order_id) where order_id is not null;

-- ── wallet & ledger --------------------------------------------------------------------------
create index if not exists wallet_transactions_user_idx    on wallet_transactions (user_id, created_at desc);
create index if not exists wallet_transactions_wallet_idx  on wallet_transactions (wallet_id, created_at desc);
create index if not exists wallet_transactions_type_idx    on wallet_transactions (type, created_at desc);
create index if not exists wallet_transactions_order_idx   on wallet_transactions (order_id) where order_id is not null;
create index if not exists wallet_transactions_payment_idx on wallet_transactions (payment_id) where payment_id is not null;
create index if not exists wallet_transactions_comm_idx    on wallet_transactions (commission_id) where commission_id is not null;

-- ── payments ---------------------------------------------------------------------------------
create index if not exists payments_user_idx            on payments (user_id, created_at desc);
create index if not exists payments_status_idx          on payments (status, created_at desc);
create index if not exists payments_created_at_idx      on payments (created_at desc);
-- a gateway reference may exist only once: the second occurrence is a replay, not a new payment
create unique index if not exists payments_gateway_reference_key
  on payments (gateway, provider_reference) where provider_reference is not null;
create index if not exists payment_attempts_payment_idx on payment_attempts (payment_id, created_at desc);
create index if not exists payment_attempts_gateway_idx on payment_attempts (gateway, created_at desc);
create index if not exists webhook_events_status_idx    on webhook_events (status, received_at desc);
create index if not exists webhook_events_payment_idx   on webhook_events (payment_id) where payment_id is not null;

-- ── orders -----------------------------------------------------------------------------------
create index if not exists orders_user_idx              on orders (user_id, created_at desc);
create index if not exists orders_user_status_idx       on orders (user_id, status);
create index if not exists orders_status_idx            on orders (status, created_at desc);
create index if not exists orders_created_at_idx        on orders (created_at desc);
create index if not exists orders_service_idx           on orders (service_id);
create index if not exists orders_provider_idx          on orders (provider_id) where provider_id is not null;
create index if not exists orders_provider_order_idx    on orders (provider_id, provider_order_id) where provider_order_id is not null;
create index if not exists orders_drip_idx              on orders (runs_at) where drip_feed and runs_at is not null;
create index if not exists order_items_order_idx        on order_items (order_id);
create index if not exists order_status_history_order_idx on order_status_history (order_id, created_at desc);

-- ── referrals & affiliates -------------------------------------------------------------------
create index if not exists referrals_referrer_idx       on referrals (referrer_user_id, created_at desc);
create index if not exists referrals_code_idx           on referrals (code);
create index if not exists referral_clicks_code_idx     on referral_clicks (code, created_at desc);
create index if not exists referral_clicks_referrer_idx on referral_clicks (referrer_user_id, created_at desc) where referrer_user_id is not null;
create index if not exists affiliate_commissions_referrer_idx on affiliate_commissions (referrer_user_id, status, created_at desc);
create index if not exists affiliate_commissions_status_idx   on affiliate_commissions (status, created_at desc);
create index if not exists affiliate_commissions_order_idx    on affiliate_commissions (order_id) where order_id is not null;
create index if not exists affiliate_withdrawals_user_idx     on affiliate_withdrawals (user_id, status);
create index if not exists affiliate_withdrawals_queue_idx    on affiliate_withdrawals (status, requested_at desc);

-- ── support ----------------------------------------------------------------------------------
create index if not exists tickets_user_idx             on tickets (user_id, created_at desc);
create index if not exists tickets_queue_idx            on tickets (status, priority, last_message_at desc);
create index if not exists tickets_assigned_idx         on tickets (assigned_admin_id) where assigned_admin_id is not null;
create index if not exists ticket_messages_ticket_idx   on ticket_messages (ticket_id, created_at desc);
create index if not exists ticket_messages_public_idx   on ticket_messages (ticket_id, created_at) where is_internal = false;

-- ── notifications ----------------------------------------------------------------------------
-- the badge counts unread rows, and the list reads newest-first: both are covered here
create index if not exists notifications_unread_idx       on notifications (user_id) where read_at is null;
create index if not exists notifications_user_time_idx    on notifications (user_id, created_at desc);
create index if not exists admin_notifications_unread_idx on admin_notifications (admin_user_id) where read_at is null;
create index if not exists admin_notifications_admin_time_idx on admin_notifications (admin_user_id, created_at desc);
create index if not exists admin_notifications_queue_idx  on admin_notifications (type, created_at desc);

-- ── content & SEO ----------------------------------------------------------------------------
create index if not exists banners_placement_idx        on banners (placement, is_active, sort_order);
create index if not exists pages_status_idx             on pages (status) where deleted_at is null;
create index if not exists posts_public_idx             on posts (status, published_at desc) where deleted_at is null;
create index if not exists posts_category_idx           on posts (category_id, published_at desc);
create index if not exists post_tags_tag_idx            on post_tags (tag);
-- blog search: one expression index, Arabic-safe ('simple' never stems a language it doesn't know)
create index if not exists posts_search_idx
  on posts using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(title_ar, '') || ' ' || coalesce(body_md, '') || ' ' || coalesce(body_md_ar, '')));
create index if not exists seo_metadata_entity_idx      on seo_metadata (entity_type, entity_id);

-- ── logs -------------------------------------------------------------------------------------
-- the support reference printed to a customer is looked up here first
create index if not exists system_logs_ref_idx          on system_logs (ref) where ref is not null;
create index if not exists system_logs_level_idx        on system_logs (level, created_at desc);
create index if not exists audit_logs_created_idx       on audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx         on audit_logs (actor_user_id, created_at desc) where actor_user_id is not null;
create index if not exists audit_logs_entity_idx        on audit_logs (entity_type, entity_id);
create index if not exists audit_logs_action_idx        on audit_logs (action, created_at desc);

insert into schema_migrations (filename, note)
values ('0002_indexes.sql', 'query indexes + uniqueness guards (gateway reference, slug, tags)')
on conflict (filename) do nothing;
