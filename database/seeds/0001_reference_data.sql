-- ═══════════════════════════════════════════════════════════════════════════════════════════
-- SMM Rapid — seeds/0001: reference data
--
-- SAFE DATA ONLY: roles, permissions, settings, feature flags, catalog scaffolding.
-- No real users, no legacy data, no credentials. Money values are minor units (cents).
--
-- Idempotent: every statement is ON CONFLICT DO NOTHING, so re-running never overwrites a
-- value an admin has since edited.
--
-- Sample services are seeded INACTIVE on purpose: a service can only be sold once it is
-- linked to a real supplier (Phase 7 provider sync) or switched to manual fulfilment.
-- Payment/provider-specific settings are added by their own phase's seed file.
-- ═══════════════════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- roles
-- ───────────────────────────────────────────────────────────────────────────────────────────
insert into roles (key, name, description, is_system) values
  ('admin',   'Administrator',  'Full access to every area of the platform.',              true),
  ('support', 'Support agent',  'Customer tickets, read-only order and user lookups.',     true),
  ('finance', 'Finance',        'Deposits, withdrawals, ledgers and financial reports.',   true)
on conflict (key) do nothing;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- permissions
-- ───────────────────────────────────────────────────────────────────────────────────────────
insert into permissions (key, group_key, description) values
  ('users.view',        'users',    'View customer accounts'),
  ('users.edit',        'users',    'Edit customer accounts'),
  ('users.suspend',     'users',    'Suspend or ban an account'),
  ('users.roles',       'users',    'Grant and revoke staff roles'),

  ('orders.view',       'orders',   'View all orders'),
  ('orders.edit',       'orders',   'Edit order fields'),
  ('orders.cancel',     'orders',   'Cancel an order'),
  ('orders.refund',     'orders',   'Refund an order to the customer wallet'),

  ('services.view',     'catalog',  'View services'),
  ('services.edit',     'catalog',  'Create and edit services, prices and markup'),
  ('services.delete',   'catalog',  'Delete or deactivate services'),
  ('categories.edit',   'catalog',  'Manage categories'),

  ('providers.view',    'providers','View suppliers and their services'),
  ('providers.manage',  'providers','Add, edit, sync and deactivate suppliers'),

  ('payments.view',     'finance',  'View deposits and payment attempts'),
  ('payments.manage',   'finance',  'Approve or reject a deposit'),
  ('wallets.view',      'finance',  'View wallets and ledger entries'),
  ('wallets.adjust',    'finance',  'Manual wallet adjustment (always ledgered)'),
  ('withdrawals.manage','finance',  'Approve or reject affiliate payouts'),
  ('reports.view',      'finance',  'View revenue, cost and profit reports'),

  ('tickets.view',      'support',  'View support tickets'),
  ('tickets.reply',     'support',  'Reply to a ticket'),
  ('tickets.assign',    'support',  'Assign a ticket to a staff member'),
  ('tickets.close',     'support',  'Close a ticket'),

  ('content.view',      'content',  'View pages, posts and banners'),
  ('content.manage',    'content',  'Create and publish pages, posts and banners'),
  ('seo.manage',        'content',  'Manage SEO metadata, sitemap and robots'),

  ('settings.view',     'system',   'View site settings'),
  ('settings.manage',   'system',   'Change site settings and feature flags'),
  ('roles.manage',      'system',   'Manage roles and permissions'),
  ('audit.view',        'system',   'Read the audit log')
on conflict (key) do nothing;

-- admin: everything
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r cross join permissions p
where r.key = 'admin'
on conflict do nothing;

-- support: tickets + read-only context
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.key in (
  'tickets.view', 'tickets.reply', 'tickets.assign', 'tickets.close',
  'orders.view', 'users.view', 'services.view'
)
where r.key = 'support'
on conflict do nothing;

-- finance: money flows + reports
insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
join permissions p on p.key in (
  'payments.view', 'payments.manage', 'wallets.view', 'wallets.adjust',
  'withdrawals.manage', 'reports.view', 'orders.view', 'users.view'
)
where r.key = 'finance'
on conflict do nothing;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- site settings  (money values are minor units — 100 = $1.00)
-- ───────────────────────────────────────────────────────────────────────────────────────────
insert into settings (key, value, group_key, description) values
  ('site.name',                '"SMM Rapid"'::jsonb,        'general', 'Public site name'),
  ('site.description',         '"منصة خدمات السوشيال ميديا — متابعات، لايكات، مشاهدات وتعليقات بأسعار واضحة وتتبع لحظي."'::jsonb, 'general', 'Meta description used on public pages'),
  ('site.support_email',       '"support@smmrapid.store"'::jsonb, 'general', 'Support address shown to customers'),
  ('site.default_locale',      '"ar"'::jsonb,               'general', 'Default UI locale (ar | en)'),
  ('site.currency',            '"USD"'::jsonb,              'general', 'Wallet currency code'),
  ('site.registration_enabled', 'true'::jsonb,              'general', 'Allow new signups'),
  ('site.maintenance_mode',    'false'::jsonb,              'general', 'Serve the maintenance notice instead of the app'),

  ('finance.usd_exchange_rate',      '50'::jsonb,           'finance', 'EGP per 1 USD, used to convert wallet deposits'),
  ('finance.min_deposit_minor',      '100'::jsonb,          'finance', 'Minimum deposit in minor units (100 = $1.00)'),
  ('finance.max_deposit_minor',      '1000000'::jsonb,      'finance', 'Maximum single deposit in minor units ($10,000.00)'),
  ('finance.min_withdrawal_minor',   '500'::jsonb,          'finance', 'Minimum affiliate payout in minor units ($5.00)'),
  ('finance.default_markup_percent', '30'::jsonb,           'finance', 'Fallback markup over supplier cost when a category/service sets none'),
  ('finance.order_min_minor',        '10'::jsonb,           'finance', 'Smallest order charge accepted, minor units ($0.10)'),

  ('orders.max_active_per_user',     '50'::jsonb,           'orders',  'Concurrent unfinished orders allowed per customer'),
  ('orders.refill_window_days',      '30'::jsonb,           'orders',  'How long after completion a refill may be requested'),

  ('referrals.enabled',              'true'::jsonb,         'referrals', 'Referral program on/off'),
  ('referrals.commission_percent',   '10'::jsonb,           'referrals', 'Commission on referred customers (percent)'),
  ('referrals.cookie_days',          '30'::jsonb,           'referrals', 'Attribution window for a referral click'),

  ('providers.sync_interval_minutes','60'::jsonb,           'providers','How often the catalog sync runs'),
  ('providers.sync_disable_missing','true'::jsonb,          'providers','Deactivate our services that disappear upstream'),

  ('seo.default_title_suffix',       '" — SMM Rapid"'::jsonb,'seo',     'Appended to page titles when no override exists'),
  ('seo.robots_txt',                 '"User-agent: *\\nAllow: /\\nDisallow: /dashboard\\nDisallow: /admin"'::jsonb, 'seo', 'robots.txt body served by the API')
on conflict (key) do nothing;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- feature flags — every flag starts false: the phase that owns the feature flips it when it
-- actually ships. A flag is never used to hide something that is not built yet.
-- ───────────────────────────────────────────────────────────────────────────────────────────
insert into feature_flags (key, enabled, rollout_percent, description) values
  ('payments.shahnawy',        false, 100, 'Electronic wallet deposits (Sh7nawy)'),
  ('payments.heleket',         false, 100, 'Crypto deposits (Heleket)'),
  ('providers.sync',           false, 100, 'Scheduled import of supplier services'),
  ('catalog.public_pages',     false, 100, 'Public SEO pages per category/service'),
  ('notifications.live',       false, 100, 'Live (SSE) notification delivery'),
  ('blog.public',              false, 100, 'Public blog'),
  ('orders.mass',              false, 100, 'Mass order submission'),
  ('referrals.program',        false, 100, 'Referral / affiliate program')
on conflict (key) do nothing;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- categories
-- ───────────────────────────────────────────────────────────────────────────────────────────
insert into categories (name, name_ar, slug, description, description_ar, icon_key, sort_order, markup_percent) values
  ('Instagram', 'إنستجرام', 'instagram', 'Followers, likes, views, story views and comments.', 'متابعون، لايكات، مشاهدات، مشاهدات الستوري والتعليقات.', 'instagram', 10, 30),
  ('TikTok',    'تيك توك',  'tiktok',    'Followers, likes, views and shares.',                  'متابعون، لايكات، مشاهدات ومشاركات.',                    'music',     20, 30),
  ('YouTube',   'يوتيوب',   'youtube',   'Subscribers, views, watch time and likes.',            'مشتركون، مشاهدات، ساعات مشاهدة ولايكات.',               'youtube',   30, 30),
  ('Telegram',  'تليجرام',  'telegram',  'Channel members and post views.',                      'أعضاء القناة ومشاهدات المنشورات.',                       'send',      40, 30),
  ('X (Twitter)','إكس',     'x-twitter', 'Followers, likes, reposts and views.',                 'متابعون، لايكات، إعادة نشر ومشاهدات.',                   'twitter',   50, 30)
on conflict (slug) do nothing;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- sample services — INACTIVE by design (see the header). Prices are minor units per unit.
-- ───────────────────────────────────────────────────────────────────────────────────────────
insert into services (
  category_id, name, name_ar, slug, description, description_ar, type, execution_mode,
  price_unit, price_minor, provider_cost_minor, min_quantity, max_quantity,
  supports_refill, supports_cancel, input_type, input_hint, input_hint_ar,
  estimated_time, sort_order, is_active
)
select c.id, v.name, v.name_ar, v.slug, v.description, v.description_ar, v.type, 'provider',
       v.price_unit::price_unit, v.price_minor, v.provider_cost_minor, v.min_quantity, v.max_quantity,
       v.supports_refill, v.supports_cancel, v.input_type::input_type, v.input_hint, v.input_hint_ar,
       v.estimated_time, v.sort_order, false
from (values
  ('instagram', 'Instagram Followers — Active profiles', 'متابعون إنستجرام — حسابات حقيقية', 'instagram-followers-active',
   'Followers delivered gradually to keep the account safe.', 'متابعون يُضافون تدريجيًا للحفاظ على أمان الحساب.',
   'default', 'per_1000', 12000::bigint, 9000::bigint, 100::bigint, 100000::bigint, true, false, 'username',
   'Your Instagram username, e.g. @yourname', 'اسم المستخدم في إنستجرام، مثال: @yourname', 'يبدأ خلال 30 دقيقة', 10),
  ('instagram', 'Instagram Likes — Instant', 'لايكات إنستجرام — فورية', 'instagram-likes-instant',
   'Likes start within minutes of the order.', 'اللايكات تبدأ خلال دقائق من الطلب.',
   'default', 'per_1000', 4000::bigint, 2500::bigint, 50::bigint, 50000::bigint, false, true, 'link',
   'A single post or reel link', 'رابط منشور أو ريل واحد', 'يبدأ خلال 5 دقائق', 20),
  ('instagram', 'Instagram Comments — Custom text', 'تعليقات إنستجرام — نص مخصص', 'instagram-comments-custom',
   'Send the comments you want, one per line.', 'اكتب التعليقات التي تريدها، كل تعليق في سطر.',
   'custom_comments', 'per_item', 1500::bigint, 1000::bigint, 5::bigint, 5000::bigint, false, false, 'list',
   'One comment per line', 'كل تعليق في سطر', 'يبدأ خلال 15 دقيقة', 30),
  ('tiktok', 'TikTok Views — Fast', 'مشاهدات تيك توك — سريعة', 'tiktok-views-fast',
   'Fast views, spread over the first hour.', 'مشاهدات سريعة موزعة على الساعة الأولى.',
   'default', 'per_1000', 300::bigint, 150::bigint, 1000::bigint, 1000000::bigint, false, true, 'link',
   'A single video link', 'رابط فيديو واحد', 'يبدأ خلال دقائق', 10),
  ('tiktok', 'TikTok Followers — Real', 'متابعون تيك توك — حقيقيون', 'tiktok-followers-real',
   'Profile followers with a gradual drip.', 'متابعون للحساب بإضافة تدريجية.',
   'default', 'per_1000', 15000::bigint, 11000::bigint, 100::bigint, 100000::bigint, true, false, 'username',
   'Your TikTok username', 'اسم المستخدم في تيك توك', 'يبدأ خلال ساعة', 20),
  ('youtube', 'YouTube Subscribers', 'مشتركون يوتيوب', 'youtube-subscribers',
   'Channel subscribers, delivered gradually.', 'مشتركون للقناة بإضافة تدريجية.',
   'default', 'per_1000', 35000::bigint, 26000::bigint, 50::bigint, 20000::bigint, true, false, 'link',
   'Your channel link', 'رابط القناة', 'يبدأ خلال ساعتين', 10),
  ('youtube', 'YouTube Watch Time — 4000 hours', 'ساعات مشاهدة يوتيوب', 'youtube-watch-time-4000h',
   'Watch time for monetisation requirements.', 'ساعات مشاهدة لمتطلبات تحقيق الدخل.',
   'package', 'per_item', 45000::bigint, 34000::bigint, 1::bigint, 1::bigint, false, false, 'link',
   'A single video link', 'رابط فيديو واحد', 'يبدأ خلال 24 ساعة', 20),
  ('telegram', 'Telegram Channel Members', 'أعضاء قناة تليجرام', 'telegram-channel-members',
   'Members added to your public channel.', 'أعضاء يُضافون لقناتك العامة.',
   'default', 'per_1000', 5000::bigint, 3500::bigint, 100::bigint, 100000::bigint, true, false, 'link',
   'Your channel link or @username', 'رابط القناة أو @username', 'يبدأ خلال ساعة', 10),
  ('x-twitter', 'X Followers — Quality', 'متابعون إكس', 'x-followers-quality',
   'Followers for your X profile.', 'متابعون لحسابك على إكس.',
   'default', 'per_1000', 25000::bigint, 18000::bigint, 100::bigint, 50000::bigint, false, false, 'username',
   'Your X username without @', 'اسم المستخدم على إكس بدون @', 'يبدأ خلال ساعتين', 10)
) as v(category_slug, name, name_ar, slug, description, description_ar, type, price_unit, price_minor,
       provider_cost_minor, min_quantity, max_quantity, supports_refill, supports_cancel,
       input_type, input_hint, input_hint_ar, estimated_time, sort_order)
join categories c on c.slug = v.category_slug
on conflict (slug) do nothing;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- content: an FAQ page (real, usable copy) + one example draft post
-- ───────────────────────────────────────────────────────────────────────────────────────────
insert into pages (slug, title, title_ar, body_md, body_md_ar, status, published_at) values
  ('faq', 'Frequently asked questions', 'الأسئلة الشائعة',
$md$## How do I place an order?
Create an account, add funds to your wallet, pick a service, paste the link or username the
service asks for, choose the quantity and confirm. The price is shown before you confirm.

## When does my order start?
Most services start within minutes; the estimated start time is printed on the service itself.

## What if an order is not delivered in full?
You are charged for what was delivered. The unfinished quantity is refunded to your wallet
automatically, and you can request a refill where the service supports it.

## How do I add funds?
Use an electronic wallet or crypto from the Add Funds page. Your balance is credited only
after the payment is verified — never before.

## I paid but my balance did not change.
Open the Add Funds page: the payment is listed with its live status. If it still shows as
waiting after a few minutes, contact support with the reference number shown there.$md$,
$md$## إزاي أعمل طلب؟
أنشئ حساب، اشحن رصيدك، اختر الخدمة، الصق الرابط أو اسم المستخدم اللي الخدمة بتطلبه، حدّد الكمية
وأكّد الطلب. السعر بيظهر قبل التأكيد.

## الطلب يبدأ إمتى؟
معظم الخدمات تبدأ خلال دقائق، والوقت المتوقع للبدء مكتوب جوه الخدمة نفسها.

## لو الطلب ما اكتملش؟
يُحسب عليك المنفَّذ فقط، والكمية غير المنفَّذة بترجع لرصيدك تلقائيًا، وتقدر تطلب إعادة تعبئة
لو الخدمة بتدعمها.

## إزاي أشحن الرصيد؟
من صفحة إضافة الرصيد: محفظة إلكترونية أو عملات رقمية. الرصيد يتضاف بعد تأكيد الدفع فقط.

## دفعت والرصيد ما اتغيرش
افتح صفحة إضافة الرصيد، هتلاقي العملية بحالتها اللحظية. لو لسه في انتظار بعد كام دقيقة،
راسل الدعم مع رقم المرجع الظاهر هناك.$md$,
   'published', now())
on conflict (slug) do nothing;

insert into post_categories (slug, name, name_ar, description, sort_order) values
  ('guides', 'Guides', 'أدلة', 'Practical guides for growing accounts safely.', 10)
on conflict (slug) do nothing;

insert into posts (category_id, slug, title, title_ar, excerpt, body_md, body_md_ar, status, reading_minutes)
select pc.id, 'how-to-choose-the-right-service', 'How to choose the right service for your goal',
       'إزاي تختار الخدمة المناسبة لهدفك',
       'Reach or engagement — matching the service to the outcome you actually want.',
       $md$Draft example content. Replace before publishing.

- Decide the outcome first (reach, engagement, or credibility).
- Check the quantity limits on the service so the delivery pace matches the account age.
- Prefer services that state an estimated start time and support refills.$md$,
       $md$محتوى تجريبي (مسودة). يُستبدل قبل النشر.

- حدّد النتيجة المطلوبة أولًا (وصول، تفاعل، أو مصداقية).
- راجع حدود الكمية في الخدمة عشان سرعة التسليم تناسب عمر الحساب.
- فضّل الخدمات اللي بتوضح وقت البدء المتوقع وبتدعم إعادة التعبئة.$md$,
       'draft', 3
from post_categories pc
where pc.slug = 'guides'
on conflict (slug) do nothing;

-- ───────────────────────────────────────────────────────────────────────────────────────────
-- ADMIN SETUP (manual, after the first sign-in — no user rows are seeded):
--
--   insert into user_roles (user_id, role_id)
--   select u.id, r.id from users u, roles r
--   where lower(u.email) = lower('you@example.com') and r.key = 'admin'
--   on conflict do nothing;
--
-- Replace the email with your own Firebase account's address.
-- ───────────────────────────────────────────────────────────────────────────────────────────

insert into schema_migrations (filename, note)
values ('seeds/0001_reference_data.sql', 'roles, permissions, settings, feature flags, categories, sample (inactive) services, FAQ page, example draft post')
on conflict (filename) do nothing;
