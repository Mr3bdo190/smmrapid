-- RapidSMM 2.0 clean database reset.
-- BACKUP FIRST. This permanently deletes all RapidSMM application data.
DROP TABLE IF EXISTS refill_requests, contact_messages, affiliate_commissions, referral_clicks, wallet_ledger,
  raffle_tickets, raffles, mystery_box_tiers, shortlink_tokens, shortlink_claims, shortlinks,
  system_reports, audit_logs, ticket_messages, tickets, payments, orders, services, categories, providers, settings, users CASCADE;
DROP TYPE IF EXISTS refill_status, contact_message_status, raffle_status, report_status, ticket_status,
  payment_status, order_status, service_status, category_status, provider_status, user_status, role CASCADE;
