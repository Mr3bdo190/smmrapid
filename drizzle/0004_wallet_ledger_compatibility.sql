-- Wallet ledger compatibility repair for older/manual deployments.
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  amount numeric(12,4) NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  reference_id text,
  created_at timestamp DEFAULT now() NOT NULL
);
ALTER TABLE wallet_ledger ALTER COLUMN type TYPE text USING type::text;
DO $$ DECLARE c record; BEGIN FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='wallet_ledger'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%type%' LOOP EXECUTE format('ALTER TABLE wallet_ledger DROP CONSTRAINT %I', c.conname); END LOOP; END $$;
ALTER TABLE wallet_ledger ALTER COLUMN amount TYPE numeric(12,4) USING amount::numeric;
ALTER TABLE wallet_ledger ALTER COLUMN reference_id TYPE text USING reference_id::text;
ALTER TABLE wallet_ledger ALTER COLUMN created_at TYPE timestamp USING created_at::timestamp;
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_id_created_at ON wallet_ledger(user_id, created_at);
