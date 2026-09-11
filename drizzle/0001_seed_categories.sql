-- Optional clean-start categories. No fake service inventory is inserted.
INSERT INTO categories(name,sort_order,status) VALUES
('Instagram',10,'active'),('TikTok',20,'active'),('YouTube',30,'active'),('Facebook',40,'active'),
('Telegram',50,'active'),('X / Twitter',60,'active'),('Spotify',70,'active'),('Threads',80,'active')
ON CONFLICT DO NOTHING;
