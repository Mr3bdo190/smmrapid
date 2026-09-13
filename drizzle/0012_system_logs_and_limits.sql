-- Phase 9.5: system_logs table + financial limit settings
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL,
  message text NOT NULL,
  details text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS system_logs_level_idx ON system_logs(level);
CREATE INDEX IF NOT EXISTS system_logs_created_at_idx ON system_logs(created_at);

-- Default financial limit settings (only inserted if not already present)
INSERT INTO settings (key, value) VALUES
  ('min_deposit_amount', '1'),
  ('min_withdrawal_amount', '5')
ON CONFLICT (key) DO NOTHING;
