-- RapidSMM Phase 2: persistent client notifications
-- Safe to run more than once.
BEGIN;
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at);
COMMIT;
