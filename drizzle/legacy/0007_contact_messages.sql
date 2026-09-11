-- Public contact form submissions (no login required). Needed so anonymous visitors
-- and payment-processor reviewers have a visible, working way to reach support.
DO $$ BEGIN
  CREATE TYPE "contact_message_status" AS ENUM ('New', 'Read', 'Replied');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "contact_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "email" text NOT NULL,
  "subject" text NOT NULL,
  "message" text NOT NULL,
  "status" "contact_message_status" NOT NULL DEFAULT 'New',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "contact_messages_status_idx" ON "contact_messages" ("status");
CREATE INDEX IF NOT EXISTS "contact_messages_created_at_idx" ON "contact_messages" ("created_at" DESC);
