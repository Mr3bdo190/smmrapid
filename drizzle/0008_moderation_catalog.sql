-- Starter commercial catalog for moderation. These are ordinary catalog rows; connect a real provider before accepting live orders.
DO $$
DECLARE c_ig uuid; c_tt uuid; c_yt uuid; c_tg uuid;
BEGIN
  INSERT INTO categories(name,sort_order,status) VALUES
    ('Instagram',10,'active'),('TikTok',20,'active'),('YouTube',30,'active'),('Telegram',40,'active')
    ON CONFLICT DO NOTHING;
  SELECT id INTO c_ig FROM categories WHERE name='Instagram' ORDER BY sort_order LIMIT 1;
  SELECT id INTO c_tt FROM categories WHERE name='TikTok' ORDER BY sort_order LIMIT 1;
  SELECT id INTO c_yt FROM categories WHERE name='YouTube' ORDER BY sort_order LIMIT 1;
  SELECT id INTO c_tg FROM categories WHERE name='Telegram' ORDER BY sort_order LIMIT 1;
  INSERT INTO services(category_id,name,price_per_1k,provider_price,min_quantity,max_quantity,description,sort_order,cashback_percentage,refillable,cancelable,status)
  SELECT c_ig,'Instagram Followers - Standard','25.0000','0.0000',100,100000,'Standard Instagram follower delivery. Connect a live provider before accepting orders.',10,0,false,true,'active' WHERE NOT EXISTS (SELECT 1 FROM services WHERE name='Instagram Followers - Standard');
  INSERT INTO services(category_id,name,price_per_1k,provider_price,min_quantity,max_quantity,description,sort_order,cashback_percentage,refillable,cancelable,status)
  SELECT c_ig,'Instagram Likes - Standard','8.0000','0.0000',50,100000,'Standard Instagram likes delivery. Connect a live provider before accepting orders.',20,0,false,true,'active' WHERE NOT EXISTS (SELECT 1 FROM services WHERE name='Instagram Likes - Standard');
  INSERT INTO services(category_id,name,price_per_1k,provider_price,min_quantity,max_quantity,description,sort_order,cashback_percentage,refillable,cancelable,status)
  SELECT c_ig,'Instagram Views - Standard','5.0000','0.0000',100,500000,'Standard Instagram views delivery. Connect a live provider before accepting orders.',30,0,false,true,'active' WHERE NOT EXISTS (SELECT 1 FROM services WHERE name='Instagram Views - Standard');
  INSERT INTO services(category_id,name,price_per_1k,provider_price,min_quantity,max_quantity,description,sort_order,cashback_percentage,refillable,cancelable,status)
  SELECT c_tt,'TikTok Followers - Standard','30.0000','0.0000',100,100000,'Standard TikTok follower delivery. Connect a live provider before accepting orders.',10,0,false,true,'active' WHERE NOT EXISTS (SELECT 1 FROM services WHERE name='TikTok Followers - Standard');
  INSERT INTO services(category_id,name,price_per_1k,provider_price,min_quantity,max_quantity,description,sort_order,cashback_percentage,refillable,cancelable,status)
  SELECT c_tt,'TikTok Likes - Standard','7.0000','0.0000',50,100000,'Standard TikTok likes delivery. Connect a live provider before accepting orders.',20,0,false,true,'active' WHERE NOT EXISTS (SELECT 1 FROM services WHERE name='TikTok Likes - Standard');
  INSERT INTO services(category_id,name,price_per_1k,provider_price,min_quantity,max_quantity,description,sort_order,cashback_percentage,refillable,cancelable,status)
  SELECT c_tt,'TikTok Views - Standard','4.0000','0.0000',100,500000,'Standard TikTok views delivery. Connect a live provider before accepting orders.',30,0,false,true,'active' WHERE NOT EXISTS (SELECT 1 FROM services WHERE name='TikTok Views - Standard');
  INSERT INTO services(category_id,name,price_per_1k,provider_price,min_quantity,max_quantity,description,sort_order,cashback_percentage,refillable,cancelable,status)
  SELECT c_yt,'YouTube Views - Standard','12.0000','0.0000',100,500000,'Standard YouTube views delivery. Connect a live provider before accepting orders.',10,0,false,true,'active' WHERE NOT EXISTS (SELECT 1 FROM services WHERE name='YouTube Views - Standard');
  INSERT INTO services(category_id,name,price_per_1k,provider_price,min_quantity,max_quantity,description,sort_order,cashback_percentage,refillable,cancelable,status)
  SELECT c_yt,'YouTube Likes - Standard','20.0000','0.0000',50,100000,'Standard YouTube likes delivery. Connect a live provider before accepting orders.',20,0,false,true,'active' WHERE NOT EXISTS (SELECT 1 FROM services WHERE name='YouTube Likes - Standard');
  INSERT INTO services(category_id,name,price_per_1k,provider_price,min_quantity,max_quantity,description,sort_order,cashback_percentage,refillable,cancelable,status)
  SELECT c_tg,'Telegram Members - Standard','35.0000','0.0000',100,100000,'Standard Telegram member delivery. Connect a live provider before accepting orders.',10,0,false,true,'active' WHERE NOT EXISTS (SELECT 1 FROM services WHERE name='Telegram Members - Standard');
  INSERT INTO services(category_id,name,price_per_1k,provider_price,min_quantity,max_quantity,description,sort_order,cashback_percentage,refillable,cancelable,status)
  SELECT c_tg,'Telegram Post Views - Standard','6.0000','0.0000',100,500000,'Standard Telegram post views delivery. Connect a live provider before accepting orders.',20,0,false,true,'active' WHERE NOT EXISTS (SELECT 1 FROM services WHERE name='Telegram Post Views - Standard');
END $$;
