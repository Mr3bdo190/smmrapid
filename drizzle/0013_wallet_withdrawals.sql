-- 0013_wallet_withdrawals.sql
-- Wallet withdrawal management system

CREATE TABLE IF NOT EXISTS "withdrawals" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users" ("id"),
  "amount" DECIMAL(12,4) NOT NULL,
  "method" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "details" JSONB DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'Pending',
  "admin_note" TEXT,
  "resolved_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "withdrawals_user_idx" ON "withdrawals" ("user_id");
CREATE INDEX IF NOT EXISTS "withdrawals_status_idx" ON "withdrawals" ("status");
CREATE INDEX IF NOT EXISTS "withdrawals_created_at_idx" ON "withdrawals" ("created_at");
