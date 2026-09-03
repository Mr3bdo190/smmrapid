-- Starter commercial catalog for moderation/demo readiness.
-- IMPORTANT: These entries are only legitimate to publish if you can actually fulfill them
-- (through a connected provider or your own/manual fulfillment process).
-- The migration is idempotent and does not overwrite existing services.
BEGIN;

CREATE TEMP TABLE IF NOT EXISTS _starter_categories (
  name text PRIMARY KEY,
  sort_order integer NOT NULL
) ON COMMIT DROP;

INSERT INTO _starter_categories(name, sort_order) VALUES
  ('Instagram', 10),
  ('TikTok', 20),
  ('YouTube', 30),
  ('Telegram', 40),
  ('Facebook', 50)
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, sort_order, status)
SELECT sc.name, sc.sort_order, 'active'::category_status
FROM _starter_categories sc
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE lower(c.name) = lower(sc.name));

-- Only add a service when an equivalent name is not already present.
-- Prices are USD per 1,000 units and are intentionally conservative starter prices.
WITH starter AS (
  SELECT * FROM (VALUES
    ('Instagram','Instagram Followers - Starter','Realistic starter follower service. Fulfillment must be connected to a real provider or handled manually.',2.50,100,10000),
    ('Instagram','Instagram Likes - Starter','Instagram post likes. Fulfillment must be connected to a real provider or handled manually.',1.50,100,20000),
    ('Instagram','Instagram Views - Starter','Instagram video/reel views. Fulfillment must be connected to a real provider or handled manually.',0.80,500,100000),
    ('Instagram','Instagram Story Views - Starter','Instagram story views. Fulfillment must be connected to a real provider or handled manually.',1.20,100,20000),
    ('TikTok','TikTok Followers - Starter','TikTok follower service. Fulfillment must be connected to a real provider or handled manually.',3.00,100,10000),
    ('TikTok','TikTok Likes - Starter','TikTok likes. Fulfillment must be connected to a real provider or handled manually.',1.25,100,50000),
    ('TikTok','TikTok Views - Starter','TikTok video views. Fulfillment must be connected to a real provider or handled manually.',0.70,500,100000),
    ('YouTube','YouTube Views - Starter','YouTube video views. Fulfillment must be connected to a real provider or handled manually.',2.00,500,50000),
    ('YouTube','YouTube Subscribers - Starter','YouTube subscriber service. Fulfillment must be connected to a real provider or handled manually.',8.00,100,10000),
    ('YouTube','YouTube Likes - Starter','YouTube video likes. Fulfillment must be connected to a real provider or handled manually.',3.00,100,20000),
    ('Telegram','Telegram Channel Members - Starter','Telegram channel member service. Fulfillment must be connected to a real provider or handled manually.',4.00,100,10000),
    ('Telegram','Telegram Post Views - Starter','Telegram post views. Fulfillment must be connected to a real provider or handled manually.',1.00,500,100000),
    ('Facebook','Facebook Page Followers - Starter','Facebook page follower service. Fulfillment must be connected to a real provider or handled manually.',4.00,100,10000),
    ('Facebook','Facebook Post Likes - Starter','Facebook post likes. Fulfillment must be connected to a real provider or handled manually.',1.75,100,20000),
    ('Facebook','Facebook Video Views - Starter','Facebook video views. Fulfillment must be connected to a real provider or handled manually.',1.00,500,100000)
  ) AS t(category_name, service_name, description, price_per_1k, min_quantity, max_quantity)
)
INSERT INTO services (
  category_id, provider_id, provider_service_id, name, price_per_1k,
  provider_price, min_quantity, max_quantity, description, sort_order,
  cashback_percentage, status
)
SELECT c.id, NULL, NULL, s.service_name, s.price_per_1k::numeric(12,4),
       0::numeric(12,4), s.min_quantity, s.max_quantity, s.description,
       row_number() OVER (PARTITION BY c.id ORDER BY s.service_name)::integer * 10,
       0, 'active'::service_status
FROM starter s
JOIN categories c ON lower(c.name) = lower(s.category_name)
WHERE NOT EXISTS (
  SELECT 1 FROM services x
  WHERE x.category_id = c.id AND lower(x.name) = lower(s.service_name)
);

COMMIT;
