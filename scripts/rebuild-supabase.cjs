const { Client } = require('pg');

const connectionString = 'postgresql://postgres.vtyqxjhqwscjhgxecubu:upiuwLKvDn0KxRl6@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function rebuild() {
  console.log('🚀 Connecting to Supabase database...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('✅ Connected successfully!');

  try {
    console.log('🧹 1. Dropping existing schema and old tables...');
    await client.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
      GRANT ALL ON SCHEMA public TO anon;
      GRANT ALL ON SCHEMA public TO authenticated;
      GRANT ALL ON SCHEMA public TO service_role;
    `);
    console.log('✅ Public schema cleanly reset.');

    console.log('🏗️ 2. Creating new tables (with security constraints, clean relationships, and RLS DISABLED)...');

    // 1. Users Table
    await client.query(`
      CREATE TABLE public.users (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(100) DEFAULT '',
        country VARCHAR(100) DEFAULT 'Egypt',
        balance NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (balance >= 0),
        total_spent NUMERIC(14, 4) NOT NULL DEFAULT 0.0000 CHECK (total_spent >= 0),
        total_orders INTEGER NOT NULL DEFAULT 0 CHECK (total_orders >= 0),
        status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
        role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'vip', 'reseller', 'admin')),
        custom_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (custom_discount_percent >= 0 AND custom_discount_percent <= 100),
        password_hash VARCHAR(255),
        api_key VARCHAR(255) UNIQUE,
        bio TEXT DEFAULT '',
        avatar_config JSONB DEFAULT '{"presetId": "avatar-1", "backgroundColor": "#06b6d4", "accessory": "none", "accentColor": "#3b82f6"}'::jsonb,
        security_settings JSONB DEFAULT '{"twoFactorAuth": false, "twoFactorSecret": "", "loginAlertsEmail": true, "requirePinForOrders": false, "allowApiOrders": true, "whitelistedIps": "", "sessionTimeout": 60}'::jsonb,
        registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_ip VARCHAR(100) DEFAULT '127.0.0.1'
      );
      ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
    `);

    // 2. Services Table
    await client.query(`
      CREATE TABLE public.services (
        id VARCHAR(100) PRIMARY KEY,
        platform VARCHAR(50) NOT NULL,
        category_ar VARCHAR(255) NOT NULL,
        category_en VARCHAR(255) NOT NULL,
        name_ar VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        rate_per_1000 NUMERIC(12, 4) NOT NULL CHECK (rate_per_1000 >= 0),
        min_quantity INTEGER NOT NULL DEFAULT 10 CHECK (min_quantity >= 1),
        max_quantity INTEGER NOT NULL DEFAULT 1000000 CHECK (max_quantity >= min_quantity),
        avg_time_ar VARCHAR(100) DEFAULT 'فوري (5-15 دقيقة)',
        avg_time_en VARCHAR(100) DEFAULT 'Instant (5-15 mins)',
        avg_speed_ar VARCHAR(100),
        avg_speed_en VARCHAR(100),
        refill_days INTEGER NOT NULL DEFAULT 0 CHECK (refill_days >= 0),
        speed VARCHAR(50) NOT NULL DEFAULT 'instant',
        badge VARCHAR(50),
        description_ar TEXT NOT NULL DEFAULT '',
        description_en TEXT NOT NULL DEFAULT '',
        provider_id VARCHAR(100),
        provider_service_id VARCHAR(100),
        provider_cost NUMERIC(12, 4) DEFAULT 0.0000,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
    `);

    // 3. Orders Table
    await client.query(`
      CREATE TABLE public.orders (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        service_id VARCHAR(100) REFERENCES public.services(id) ON DELETE SET NULL,
        service_name_ar VARCHAR(255) NOT NULL,
        service_name_en VARCHAR(255) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        link TEXT NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        charge NUMERIC(12, 4) NOT NULL CHECK (charge >= 0),
        start_count INTEGER NOT NULL DEFAULT 0 CHECK (start_count >= 0),
        current_count INTEGER NOT NULL DEFAULT 0 CHECK (current_count >= 0),
        target_count INTEGER NOT NULL DEFAULT 0,
        remains INTEGER NOT NULL DEFAULT 0,
        provider_cost NUMERIC(12, 4) NOT NULL DEFAULT 0.0000 CHECK (provider_cost >= 0),
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'in_progress', 'completed', 'canceled')),
        progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
        speed_mode VARCHAR(50) NOT NULL DEFAULT 'instant' CHECK (speed_mode IN ('instant', 'gradual', 'drip')),
        drip_runs INTEGER DEFAULT 1,
        drip_interval_hours INTEGER DEFAULT 1,
        rated BOOLEAN NOT NULL DEFAULT FALSE,
        rating_score INTEGER CHECK (rating_score IS NULL OR (rating_score >= 1 AND rating_score <= 5)),
        rating_review TEXT,
        logs JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
    `);

    // 4. Deposit Requests Table
    await client.query(`
      CREATE TABLE public.deposit_requests (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        user_name VARCHAR(255),
        user_email VARCHAR(255),
        method VARCHAR(100) NOT NULL,
        wallet_provider VARCHAR(50),
        sender_number VARCHAR(100),
        transfer_reference VARCHAR(255),
        amount_usd NUMERIC(12, 4) NOT NULL CHECK (amount_usd > 0),
        amount_egp NUMERIC(12, 4) NOT NULL CHECK (amount_egp > 0),
        bonus_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        account_number VARCHAR(100),
        transaction_hash TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE public.deposit_requests DISABLE ROW LEVEL SECURITY;
    `);

    // 5. Transactions Table
    await client.query(`
      CREATE TABLE public.transactions (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'order_charge', 'refund', 'bonus')),
        amount NUMERIC(12, 4) NOT NULL,
        method VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
        note_ar TEXT DEFAULT '',
        note_en TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
    `);

    // 6. Reviews Table
    await client.query(`
      CREATE TABLE public.reviews (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) REFERENCES public.users(id) ON DELETE SET NULL,
        customer_name VARCHAR(255) NOT NULL,
        avatar TEXT DEFAULT '',
        country VARCHAR(100) DEFAULT 'Egypt',
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        service_name_ar VARCHAR(255) NOT NULL,
        service_name_en VARCHAR(255) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        tags_ar TEXT[] DEFAULT '{}',
        tags_en TEXT[] DEFAULT '{}',
        comment_ar TEXT NOT NULL,
        comment_en TEXT NOT NULL,
        date VARCHAR(100) DEFAULT '',
        verified BOOLEAN NOT NULL DEFAULT TRUE,
        is_approved BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;
    `);

    // 7. Support Tickets Table
    await client.query(`
      CREATE TABLE public.support_tickets (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        user_name VARCHAR(255),
        user_email VARCHAR(255),
        subject VARCHAR(255) NOT NULL,
        order_id VARCHAR(100),
        priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_update TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE public.support_tickets DISABLE ROW LEVEL SECURITY;
    `);

    // 8. Ticket Messages Table
    await client.query(`
      CREATE TABLE public.ticket_messages (
        id VARCHAR(100) PRIMARY KEY,
        ticket_id VARCHAR(100) NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
        sender VARCHAR(50) NOT NULL CHECK (sender IN ('user', 'agent')),
        sender_name VARCHAR(255) NOT NULL,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE public.ticket_messages DISABLE ROW LEVEL SECURITY;
    `);

    // 9. Notifications Table
    await client.query(`
      CREATE TABLE public.notifications (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        title_ar VARCHAR(255) NOT NULL,
        title_en VARCHAR(255) NOT NULL,
        message_ar TEXT NOT NULL,
        message_en TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'system' CHECK (type IN ('order', 'balance', 'system', 'offer')),
        read BOOLEAN NOT NULL DEFAULT FALSE,
        related_order_id VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
    `);

    // 10. Service Providers Table
    await client.query(`
      CREATE TABLE public.service_providers (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        api_url TEXT NOT NULL,
        api_key TEXT NOT NULL,
        balance NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
        services_count INTEGER NOT NULL DEFAULT 0,
        auto_sync_rates BOOLEAN NOT NULL DEFAULT TRUE,
        auto_sync_status BOOLEAN NOT NULL DEFAULT TRUE,
        default_markup_percent NUMERIC(6, 2) NOT NULL DEFAULT 30.00,
        description TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_sync TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE public.service_providers DISABLE ROW LEVEL SECURITY;
    `);

    // 11. Payment Gateways Table
    await client.query(`
      CREATE TABLE public.payment_gateways (
        id VARCHAR(100) PRIMARY KEY,
        name_ar VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('card', 'crypto', 'ewallet', 'wallet', 'bank', 'other')),
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        min_deposit NUMERIC(12, 4) NOT NULL DEFAULT 5.00,
        max_deposit NUMERIC(12, 4) NOT NULL DEFAULT 10000.00,
        fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        fixed_fee NUMERIC(12, 4) NOT NULL DEFAULT 0.00,
        bonus_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        exchange_rate NUMERIC(10, 4) NOT NULL DEFAULT 50.00,
        account_number VARCHAR(255) DEFAULT '',
        account_name VARCHAR(255) DEFAULT '',
        credentials JSONB DEFAULT '{}'::jsonb,
        instructions_ar TEXT DEFAULT '',
        instructions_en TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE public.payment_gateways DISABLE ROW LEVEL SECURITY;
    `);

    // 12. Discount Coupons Table
    await client.query(`
      CREATE TABLE public.discount_coupons (
        id VARCHAR(100) PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        discount_percent NUMERIC(5, 2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
        discount_fixed_usd NUMERIC(12, 4) DEFAULT 0.00,
        min_order_amount NUMERIC(12, 4) DEFAULT 0.00,
        max_discount_usd NUMERIC(12, 4) DEFAULT 100.00,
        usage_limit INTEGER DEFAULT 1000,
        used_count INTEGER DEFAULT 0,
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        description_ar TEXT DEFAULT '',
        description_en TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE public.discount_coupons DISABLE ROW LEVEL SECURITY;
    `);

    // 13. Affiliates Table
    await client.query(`
      CREATE TABLE public.affiliates (
        id VARCHAR(100) PRIMARY KEY,
        referrer_user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        referred_user_id VARCHAR(100) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        referred_user_name VARCHAR(255),
        commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
        total_earned_usd NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE public.affiliates DISABLE ROW LEVEL SECURITY;
    `);

    // 14. Platform Settings Table
    await client.query(`
      CREATE TABLE public.platform_settings (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
        maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
        allow_registrations BOOLEAN NOT NULL DEFAULT TRUE,
        auto_refill_system BOOLEAN NOT NULL DEFAULT TRUE,
        live_support_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        drip_feed_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        require_review_approval BOOLEAN NOT NULL DEFAULT FALSE,
        e_wallets_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        crypto_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        egp_exchange_rate NUMERIC(10, 4) NOT NULL DEFAULT 50.00,
        vodafone_cash_number VARCHAR(100) DEFAULT '01012345678',
        orange_cash_number VARCHAR(100) DEFAULT '01212345678',
        etisalat_cash_number VARCHAR(100) DEFAULT '01112345678',
        instapay_username VARCHAR(100) DEFAULT 'smmrapid@instapay',
        usdt_trc20_address VARCHAR(255) DEFAULT 'TQ8z7b9h4xLkm93kdP92zQw81mskd02jdx',
        broadcast_announcement_ar TEXT DEFAULT '🎉 عرض حصري: بونص 10% مجاناً على جميع إيداعات فودافون كاش وإنستاباي اليوم!',
        broadcast_announcement_en TEXT DEFAULT '🎉 Special Bonus: 10% Extra Free on all Vodafone Cash & InstaPay deposits today!',
        broadcast_announcement_active BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE public.platform_settings DISABLE ROW LEVEL SECURITY;
    `);

    // 15. Activity Logs Table
    await client.query(`
      CREATE TABLE public.activity_logs (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) REFERENCES public.users(id) ON DELETE SET NULL,
        user_name VARCHAR(255),
        type VARCHAR(50) NOT NULL,
        message_ar TEXT NOT NULL,
        message_en TEXT NOT NULL,
        amount NUMERIC(12, 4),
        badge VARCHAR(50),
        ip VARCHAR(100) DEFAULT '127.0.0.1',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
    `);

    console.log('⚡ 3. Creating high-performance database indexes...');
    await client.query(`
      CREATE INDEX idx_users_email ON public.users(email);
      CREATE INDEX idx_users_role ON public.users(role);
      CREATE INDEX idx_services_platform ON public.services(platform);
      CREATE INDEX idx_services_is_active ON public.services(is_active);
      CREATE INDEX idx_orders_user_id ON public.orders(user_id);
      CREATE INDEX idx_orders_service_id ON public.orders(service_id);
      CREATE INDEX idx_orders_status ON public.orders(status);
      CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
      CREATE INDEX idx_deposit_requests_user ON public.deposit_requests(user_id);
      CREATE INDEX idx_deposit_requests_status ON public.deposit_requests(status);
      CREATE INDEX idx_transactions_user ON public.transactions(user_id);
      CREATE INDEX idx_reviews_rating ON public.reviews(rating);
      CREATE INDEX idx_reviews_platform ON public.reviews(platform);
      CREATE INDEX idx_tickets_user ON public.support_tickets(user_id);
      CREATE INDEX idx_tickets_status ON public.support_tickets(status);
      CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);
      CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read);
    `);

    console.log('🌱 4. Seeding initial records & platform data...');

    // Seed Platform Settings
    await client.query(`
      INSERT INTO public.platform_settings (id) VALUES ('current')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Seed Admin & Default Users
    await client.query(`
      INSERT INTO public.users (
        id, name, email, phone, country, balance, total_spent, total_orders, status, role, custom_discount_percent, api_key
      ) VALUES 
      ('usr-admin-1', 'Admin SMM Rapid', 'admin@smmrapid.com', '+201012345678', 'Egypt', 500.0000, 12500.0000, 480, 'active', 'admin', 0.00, 'smm_live_adm983471029348123'),
      ('usr-demo-1', 'أحمد محمود', 'ahmed@example.com', '+201098765432', 'Egypt', 145.5000, 680.0000, 24, 'active', 'vip', 5.00, 'smm_live_usr882910394812736'),
      ('usr-demo-2', 'سارة خالد', 'sara@example.com', '+966501234567', 'Saudi Arabia', 42.0000, 290.0000, 8, 'active', 'user', 0.00, 'smm_live_usr771928374615243')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Seed Services
    const initialServices = [
      {
        id: 'ig-101',
        platform: 'instagram',
        categoryAr: 'متابعين انستغرام - Instagram Followers',
        categoryEn: 'Instagram Followers',
        nameAr: 'متابعين انستغرام حقيقيين عرب [ضمان 30 يوم - سرعة فائقة - لا ينقص]',
        nameEn: 'Instagram Real Arab Followers [30 Days Refill - Ultra Fast - Non-Drop]',
        ratePer1000: 2.80,
        min: 100,
        max: 50000,
        avgTimeAr: '15 دقيقة للبدء',
        avgTimeEn: '15 mins start',
        refillDays: 30,
        speed: 'super_fast',
        badge: 'popular',
        descriptionAr: 'حسابات حقيقية ونشطة مع صور شخصية ومنشورات، سرعة الإرسال 5,000 إلى 15,000 في اليوم.',
        descriptionEn: 'Real active accounts with avatars and posts. Delivery speed 5K - 15K per day.'
      },
      {
        id: 'ig-102',
        platform: 'instagram',
        categoryAr: 'متابعين انستغرام - Instagram Followers',
        categoryEn: 'Instagram Followers',
        nameAr: 'متابعين انستغرام عالميين بجودة عالية [بدء فوري - ضمان 365 يوم]',
        nameEn: 'Instagram High-Quality Global Followers [Instant Start - 365D Refill]',
        ratePer1000: 1.45,
        min: 50,
        max: 200000,
        avgTimeAr: 'فوري (خلال 2 دقيقة)',
        avgTimeEn: 'Instant (within 2 mins)',
        refillDays: 365,
        speed: 'instant',
        badge: 'best_value',
        descriptionAr: 'أفضل خيار لزيادة الأرقام بسرعة فائقة مع ضمان إعادة تعبئة تلقائي لمدة سنة كاملة.',
        descriptionEn: 'Top choice to boost follower count rapidly with auto-refill guarantee for a full year.'
      },
      {
        id: 'ig-103',
        platform: 'instagram',
        categoryAr: 'إعجابات انستغرام - Instagram Likes',
        categoryEn: 'Instagram Likes',
        nameAr: 'لايكات انستغرام فوريّة [جودة ممتازة + وصول للمستكشف Explore]',
        nameEn: 'Instagram Instant Likes [HQ + Explore Reach Booster]',
        ratePer1000: 0.60,
        min: 20,
        max: 100000,
        avgTimeAr: 'فوري 0-5 دقائق',
        avgTimeEn: 'Instant 0-5 mins',
        refillDays: 30,
        speed: 'instant',
        badge: 'trending',
        descriptionAr: 'تصل اللايكات فوراً وتساعد منشورك أو ريلز على الصعود في صفحة Explore وزيادة الوصول الطبيعي.',
        descriptionEn: 'Instant delivery helping your post or Reels appear in the Explore page and boost impressions.'
      },
      {
        id: 'ig-104',
        platform: 'instagram',
        categoryAr: 'مشاهدات ريلز - Instagram Reels',
        categoryEn: 'Instagram Reels Views',
        nameAr: 'مشاهدات انستغرام ريلز سريعة [سرعة مليون باليوم - فائقة الاستقرار]',
        nameEn: 'Instagram Reels Views [Speed 1M/Day - Ultra Stable]',
        ratePer1000: 0.15,
        min: 100,
        max: 5000000,
        avgTimeAr: 'دقيقة واحدة',
        avgTimeEn: '1 minute',
        refillDays: 0,
        speed: 'super_fast',
        badge: 'best_value',
        descriptionAr: 'أرخص وأسرع خدمة مشاهدات ريلز في الشرق الأوسط، تدعم الروابط المباشرة وتصل للتريند.',
        descriptionEn: 'Fastest & cheapest Reels views, supports direct links to get your clip on trending algorithms.'
      },
      {
        id: 'tk-201',
        platform: 'tiktok',
        categoryAr: 'متابعين تيك توك - TikTok Followers',
        categoryEn: 'TikTok Followers',
        nameAr: 'متابعين تيك توك حقيقيين [حسابات نشطة - سرعة 10k/يوم - ضمان 60 يوم]',
        nameEn: 'TikTok Real Followers [Active Profiles - 10k/day - 60D Refill]',
        ratePer1000: 4.20,
        min: 100,
        max: 100000,
        avgTimeAr: '10 دقائق',
        avgTimeEn: '10 mins',
        refillDays: 60,
        speed: 'super_fast',
        badge: 'popular',
        descriptionAr: 'متابعون نشطون يفتحون لك ميزة البث المباشر (TikTok Live) وتفعيل متجر التيك توك.',
        descriptionEn: 'Active followers to help unlock TikTok Live stream access and TikTok Shop features.'
      },
      {
        id: 'tk-202',
        platform: 'tiktok',
        categoryAr: 'مشاهدات تيك توك - TikTok Views',
        categoryEn: 'TikTok Views',
        nameAr: 'مشاهدات تيك توك فورية [وصول إكسبلور For You - سرعة خيالية]',
        nameEn: 'TikTok Instant Video Views [FYP Algorithm Booster - Ultra Speed]',
        ratePer1000: 0.08,
        min: 500,
        max: 10000000,
        avgTimeAr: 'فوري أقل من دقيقة',
        avgTimeEn: 'Instant < 1 min',
        refillDays: 0,
        speed: 'instant',
        badge: 'trending',
        descriptionAr: 'مشاهدات سريعة للغاية تساعد الفيديو على الانتشار في خوارزمية For You فور نشره.',
        descriptionEn: 'Lightning speed views to push your video directly into the FYP algorithmic recommendations.'
      },
      {
        id: 'tk-203',
        platform: 'tiktok',
        categoryAr: 'لايكات تيك توك - TikTok Likes',
        categoryEn: 'TikTok Likes',
        nameAr: 'إعجابات تيك توك حقيقية [جودة عالية - بدون نقصان - ضمان 30 يوم]',
        nameEn: 'TikTok Real Likes [HQ Non-Drop - 30 Days Refill]',
        ratePer1000: 1.10,
        min: 50,
        max: 50000,
        avgTimeAr: '5 دقائق',
        avgTimeEn: '5 mins',
        refillDays: 30,
        speed: 'instant',
        badge: 'popular',
        descriptionAr: 'لايكات ممتازة من حسابات حقيقية ذات تفاعل مرتفع، آمنة بنسبة 100% على الحساب.',
        descriptionEn: 'Premium likes from real engagement profiles, 100% safe for account standing.'
      },
      {
        id: 'yt-301',
        platform: 'youtube',
        categoryAr: 'مشتركين يوتيوب - YouTube Subscribers',
        categoryEn: 'YouTube Subscribers',
        nameAr: 'مشتركين يوتيوب لتحقيق شروط الربح [ضمان دائم مدى الحياة - غير قابل للنقص]',
        nameEn: 'YouTube Monetization Subscribers [Lifetime Refill - 100% Non-Drop]',
        ratePer1000: 19.50,
        min: 50,
        max: 10000,
        avgTimeAr: 'خلال 2-4 ساعات يبدأ',
        avgTimeEn: 'Starts in 2-4 hours',
        refillDays: 365,
        speed: 'safe',
        badge: 'popular',
        descriptionAr: 'مشتركون متوافقون تماماً مع سياسات يوتيوب لتحقيق شرط الـ 1000 مشترك للربح من Adsense.',
        descriptionEn: 'Compliant with YouTube monetization partner program, assists passing the 1K threshold.'
      },
      {
        id: 'yt-302',
        platform: 'youtube',
        categoryAr: 'ساعات مشاهدة يوتيوب - Watch Time Hours',
        categoryEn: 'YouTube Watch Time',
        nameAr: 'ساعات مشاهدة يوتيوب حقيقية [4000 ساعة لتحقيق الدخل - ضمان 60 يوم]',
        nameEn: 'YouTube Watch Hours [4000H Monetization Pack - 60D Refill]',
        ratePer1000: 14.00,
        min: 100,
        max: 4000,
        avgTimeAr: 'يبدأ خلال 6 ساعات',
        avgTimeEn: 'Starts within 6 hrs',
        refillDays: 60,
        speed: 'gradual',
        badge: 'best_value',
        descriptionAr: 'مشاهدات ذات مدة بقاء طويلة لفيديوهات مدتها 15-60 دقيقة لحساب ساعات الدخل بدقة.',
        descriptionEn: 'High retention watch sessions on 15-60 min videos to fulfill 4000 hours requirement.'
      },
      {
        id: 'tw-401',
        platform: 'twitter',
        categoryAr: 'متابعين إكس تويتر - X Twitter Followers',
        categoryEn: 'X Twitter Followers',
        nameAr: 'متابعين إكس تويتر حقيقيين عرب وخليجيين [ضمان 30 يوم - جودة ممتازة]',
        nameEn: 'X Twitter Arab & Gulf Real Followers [30 Days Refill - Premium Quality]',
        ratePer1000: 6.50,
        min: 100,
        max: 20000,
        avgTimeAr: '30 دقيقة',
        avgTimeEn: '30 mins',
        refillDays: 30,
        speed: 'gradual',
        badge: 'popular',
        descriptionAr: 'متابعون مهتمون بالمحتوى العربي مع أسماء وتغريدات عربية حقيقية.',
        descriptionEn: 'Targeted Arabic audience with active tweets and Arabic profile metadata.'
      },
      {
        id: 'tg-501',
        platform: 'telegram',
        categoryAr: 'أعضاء قنوات تيليجرام - Telegram Members',
        categoryEn: 'Telegram Channel Members',
        nameAr: 'أعضاء قنوات ومجموعات تيليجرام بدون نقص [ضمان 30 يوم - سرعة فائقة]',
        nameEn: 'Telegram Channel & Group Members [Non-Drop - 30D Refill - Fast]',
        ratePer1000: 1.20,
        min: 100,
        max: 100000,
        avgTimeAr: 'فوري (خلال 3 دقائق)',
        avgTimeEn: 'Instant (within 3 mins)',
        refillDays: 30,
        speed: 'instant',
        badge: 'best_value',
        descriptionAr: 'زيادة أعضاء فورية تدعم القنوات العامة والخاصة لرفع مصداقية القناة وتصدر نتائج البحث.',
        descriptionEn: 'Instant members addition for public/private channels to boost rank in Telegram search.'
      },
      {
        id: 'fb-601',
        platform: 'facebook',
        categoryAr: 'متابعين صفحات فيسبوك - Facebook Page Followers',
        categoryEn: 'Facebook Followers & Likes',
        nameAr: 'متابعين ومعجبين صفحات فيسبوك [ضمان 60 يوم - حسابات ممتازة]',
        nameEn: 'Facebook Page Likes & Followers [60D Refill - HQ Real Profiles]',
        ratePer1000: 3.10,
        min: 100,
        max: 50000,
        avgTimeAr: '15 دقيقة',
        avgTimeEn: '15 mins',
        refillDays: 60,
        speed: 'super_fast',
        badge: 'popular',
        descriptionAr: 'لايكات ومتابعات لصفحات الأعمال (Fan Pages) والصفحات الشخصية بنظام Profile Mode.',
        descriptionEn: 'Followers and likes for public business Fan Pages and modern Profile-mode pages.'
      }
    ];

    for (const s of initialServices) {
      await client.query(`
        INSERT INTO public.services (
          id, platform, category_ar, category_en, name_ar, name_en, rate_per_1000, min_quantity, max_quantity, avg_time_ar, avg_time_en, refill_days, speed, badge, description_ar, description_en, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, true)
        ON CONFLICT (id) DO UPDATE SET
          rate_per_1000 = EXCLUDED.rate_per_1000,
          name_ar = EXCLUDED.name_ar,
          name_en = EXCLUDED.name_en;
      `, [
        s.id, s.platform, s.categoryAr, s.categoryEn, s.nameAr, s.nameEn, s.ratePer1000,
        s.min, s.max, s.avgTimeAr, s.avgTimeEn, s.refillDays, s.speed, s.badge, s.descriptionAr, s.descriptionEn
      ]);
    }
    console.log(`✅ Seeded ${initialServices.length} default high-demand services.`);

    // Seed Sample Orders
    await client.query(`
      INSERT INTO public.orders (
        id, user_id, service_id, service_name_ar, service_name_en, platform, link, quantity, charge, start_count, current_count, target_count, status, progress_percentage, speed_mode, rated, rating_score, rating_review, logs
      ) VALUES
      ('ORD-89421', 'usr-demo-1', 'ig-101', 'متابعين انستغرام حقيقيين عرب', 'Instagram Real Arab Followers', 'instagram', 'https://instagram.com/tech_innovator', 2500, 7.00, 14200, 16700, 16700, 'completed', 100, 'instant', true, 5, 'خدمة رائعة جداً وسرعة خرافية شكراً لكم!', '[{"timestamp": "2026-09-20 14:30", "messageAr": "تم استلام الطلب وتوجيهه للسيرفر", "messageEn": "Order received and routed"}, {"timestamp": "2026-09-20 15:45", "messageAr": "اكتمل الطلب بنجاح بنسبة 100%", "messageEn": "Order 100% completed"}]'::jsonb),
      ('ORD-89422', 'usr-demo-1', 'tk-202', 'مشاهدات تيك توك فورية', 'TikTok Instant Video Views', 'tiktok', 'https://tiktok.com/@creator/video/992819', 50000, 4.00, 1200, 38500, 51200, 'in_progress', 75, 'instant', false, null, null, '[{"timestamp": "2026-09-23 09:00", "messageAr": "بدء إرسال المشاهدات في خوارزمية FYP", "messageEn": "Views delivery started"}]'::jsonb)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Seed Payment Gateways
    await client.query(`
      INSERT INTO public.payment_gateways (
        id, name_ar, name_en, type, enabled, min_deposit, max_deposit, fee_percent, fixed_fee, bonus_percent, exchange_rate, account_number, account_name, instructions_ar, instructions_en
      ) VALUES
      ('gw-vodafone', 'فودافون كاش مصر (Vodafone Cash)', 'Vodafone Cash Egypt', 'ewallet', true, 5.00, 1000.00, 0.00, 0.00, 10.00, 50.00, '01012345678', 'SMM Rapid Cash', 'حول المبلغ المطلوب بالجنيه المصري للرقم الموضح ثم أدخل رقم محفظتك وكود العملية.', 'Transfer amount in EGP to the specified wallet number and enter reference code.'),
      ('gw-instapay', 'إنستاباي مصر (InstaPay Egypt)', 'InstaPay Egypt', 'bank', true, 5.00, 2000.00, 0.00, 0.00, 10.00, 50.00, 'smmrapid@instapay', 'SMM Rapid Official', 'التحويل لحظي وفوري من أي بنك مصري أو تطبيق إنستاباي بدون أي رسوم إضافية.', 'Instant transfer from any Egyptian bank via InstaPay IPA username.'),
      ('gw-crypto', 'العملات الرقمية USDT (TRC-20)', 'Crypto USDT (TRC20)', 'crypto', true, 10.00, 10000.00, 0.00, 0.00, 5.00, 1.00, 'TQ8z7b9h4xLkm93kdP92zQw81mskd02jdx', 'USDT-TRC20 Official', 'أرسل عملات USDT حصراً عبر شبكة TRC20 وانتظر تأكيد البلوكتشين.', 'Send USDT strictly via TRC-20 network.')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Seed Discount Coupons
    await client.query(`
      INSERT INTO public.discount_coupons (
        id, code, discount_percent, min_order_amount, max_discount_usd, usage_limit, used_count, is_active, description_ar, description_en
      ) VALUES
      ('cp-welcome', 'WELCOME10', 10.00, 5.00, 20.00, 10000, 48, true, 'خصم ترحيبي 10% لجميع العملاء الجدد', '10% Welcome discount for new customers'),
      ('cp-vip', 'RAPIDVIP', 15.00, 20.00, 50.00, 500, 12, true, 'خصم خاص للطلبات الكبيرة بقيمة 15%', '15% Special discount for bulk orders')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Seed Customer Reviews
    await client.query(`
      INSERT INTO public.reviews (
        id, customer_name, country, rating, service_name_ar, service_name_en, platform, tags_ar, tags_en, comment_ar, comment_en, date, verified, is_approved
      ) VALUES
      ('rev-1', 'عمر الشريف', 'Egypt', 5, 'متابعين انستغرام حقيقيين عرب', 'Instagram Real Arab Followers', 'instagram', ARRAY['سرعة فائقة', 'ضمان حقيقي', 'دعم محترم'], ARRAY['Fast Speed', 'Real Refill', 'Great Support'], 'أفضل موقع تعاملت معه في مصر، المشاهدات والمتابعين وصلوا في أقل من 10 دقائق والحسابات حقيقية بدون أي نقص!', 'Best platform I dealt with, followers arrived in less than 10 mins and accounts are authentic!', 'منذ يومين', true, true),
      ('rev-2', 'سارة المطيري', 'Saudi Arabia', 5, 'مشاهدات تيك توك فورية', 'TikTok Instant Views', 'tiktok', ARRAY['إكسبلور مضمون', 'أسعار منافسة'], ARRAY['FYP Booster', 'Competitive Rates'], 'طلبت 50 ألف مشاهدة لفيديو تيك توك وطلع إكسبلور وجاب لي تفاعل أورجانيك ضخم! شكراً لفريق الدعم السريع.', 'Ordered 50k views and the video hit the FYP trending page directly. Very pleased!', 'منذ 3 أيام', true, true)
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('🔒 5. Explicitly verifying that ROW LEVEL SECURITY is DISABLED on ALL tables...');
    
    // Verify in pg_tables
    const tablesCheck = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename ASC;
    `);

    console.log('\n📊 DATABASE SUMMARY & RLS STATUS:');
    console.table(tablesCheck.rows);

    const anyRLSEnabled = tablesCheck.rows.some(r => r.rowsecurity === true);
    if (anyRLSEnabled) {
      console.warn('⚠️ Warning: Some tables still had RLS enabled, disabling them now...');
      for (const row of tablesCheck.rows) {
        if (row.rowsecurity) {
          await client.query(`ALTER TABLE public."${row.tablename}" DISABLE ROW LEVEL SECURITY;`);
        }
      }
    } else {
      console.log('🎉 ALL TABLES HAVE RLS DISABLED AS STRICTLY REQUESTED! (rowsecurity = false)');
    }

    console.log('\n✅ Database migration completed with 100% success!');
  } catch (error) {
    console.error('❌ Error during rebuild:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

rebuild();
