-- Refill & cancel support for orders, plus a couple of columns/tables needed for
-- the currency-conversion and pagination fixes.

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "refillable" boolean NOT NULL DEFAULT false;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "cancelable" boolean NOT NULL DEFAULT false;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancel_requested" boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  CREATE TYPE "refill_status" AS ENUM ('Pending', 'Completed', 'Rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "refill_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL REFERENCES "orders"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "provider_refill_id" text,
  "status" "refill_status" NOT NULL DEFAULT 'Pending',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "refill_requests_order_idx" ON "refill_requests" ("order_id");
CREATE INDEX IF NOT EXISTS "refill_requests_user_idx" ON "refill_requests" ("user_id");

-- Helpful indexes for the new paginated admin list endpoints.
CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "payments_created_at_idx" ON "payments" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" ("created_at" DESC);
