-- 0009_daily_missions.sql
CREATE TABLE IF NOT EXISTS daily_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL,
  target numeric(12,4) NOT NULL,
  reward_amount numeric(12,4) NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_mission_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES daily_missions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claim_date text NOT NULL,
  reward_amount numeric(12,4) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT daily_mission_claim_unique UNIQUE (mission_id,user_id,claim_date),
  CONSTRAINT daily_mission_target_positive CHECK (reward_amount > 0)
);

CREATE INDEX IF NOT EXISTS daily_mission_claims_user_date_idx ON daily_mission_claims(user_id,claim_date);
CREATE INDEX IF NOT EXISTS daily_mission_claims_mission_idx ON daily_mission_claims(mission_id);

INSERT INTO daily_missions (title,description,type,target,reward_amount,status)
SELECT * FROM (VALUES
 ('Daily Shopper','Place 1 order today and claim a bonus.','orders',1,1,'active'),
 ('Daily Top Up','Add at least 100 to your wallet today and claim a bonus.','deposit',100,3,'active'),
 ('Daily Ambassador','Bring 1 new user through your referral link today.','referrals',1,2,'active')
) AS v(title,description,type,target,reward_amount,status)
WHERE NOT EXISTS (SELECT 1 FROM daily_missions);

-- Verify:
SELECT id,title,type,target,reward_amount,status FROM daily_missions ORDER BY created_at;
