-- RapidSMM Phase 1 critical fixes
-- 1) Raffle tickets must support multiple tickets per user.
-- Existing installations created a unique (raffle_id, user_id) constraint,
-- which conflicts with the UI quantity selector and could overcharge users.
ALTER TABLE raffle_tickets DROP CONSTRAINT IF EXISTS raffle_tickets_raffle_id_user_id_key;
DROP INDEX IF EXISTS raffle_tickets_raffle_id_user_id_key;

-- Keep lookups fast after removing the uniqueness constraint.
CREATE INDEX IF NOT EXISTS raffle_tickets_raffle_user_idx ON raffle_tickets (raffle_id, user_id);
