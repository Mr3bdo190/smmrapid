import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const server = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');
const src = path.join(root, 'src');

test('no known insecure test auth fallback remains', () => {
  assert.equal(server.includes('testuid'), false);
  assert.equal(server.includes('test@test.com'), false);
});

test('critical security middleware exists', () => {
  for (const value of ['verifyIdToken', 'requireAdmin', 'apiLimiter', 'authLimiter']) {
    assert.ok(server.includes(value), `missing ${value}`);
  }
});

test('financial protections exist', () => {
  for (const value of ["for('update')", 'walletLedger', 'affiliateCommissions']) {
    assert.ok(server.includes(value), `missing ${value}`);
  }
});

test('required client/admin endpoints exist', () => {
  const required = [
    '/api/auth/sync','/api/client/me','/api/client/orders','/api/client/orders/mass',
    '/api/client/payments','/api/client/transactions','/api/client/shortlinks',
    '/api/client/raffles','/api/client/mystery-boxes/open','/api/client/affiliates/stats',
    '/api/v1','/api/admin/users/:id/status','/api/admin/users/:id/balance',
    '/api/admin/providers/:id/sync','/api/admin/providers/:id/balance',
    '/api/admin/payments/:id/approve','/api/admin/payments/:id/reject',
    '/api/admin/raffles/:id/close','/api/admin/raffles/:id/draw',
    '/api/admin/tickets/:id/messages','/api/admin/tickets/:id/status'
  ];
  for (const route of required) assert.ok(server.includes(route), `missing ${route}`);
});

test('frontend routes are represented by backend handlers', () => {
  const files = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir,name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (name.endsWith('.tsx')) files.push(p);
    }
  }
  walk(src);
  const text = files.map(f => fs.readFileSync(f,'utf8')).join('\n');
  const paths = new Set([...text.matchAll(/['"`](\/api\/[^'"`?]+)['"`]/g)].map(m => m[1]));
  for (const p of paths) {
    if (p.includes('${action}')) {
      assert.ok(server.includes('/api/admin/raffles/:id/close') && server.includes('/api/admin/raffles/:id/draw'));
      continue;
    }
    const normalized = p.replace(/\$\{[^}]+\}/g, ':id');
    const routeCandidates = [normalized, normalized.replace(/\/\:id\/sync\/\:id$/, '/:id/sync/:jobId')];
    assert.ok(routeCandidates.some(route => server.includes(route)), `frontend endpoint not found: ${p}`);
  }
});

test('removed legacy payment gateway is not wired into the client', () => {
  const client = fs.readFileSync('src/pages/client/ClientAddFunds.tsx', 'utf8');
  assert.equal(client.includes('Kashier'), false);
});

test('Heleket gateway and verification file are wired', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  const client = fs.readFileSync('src/pages/client/ClientAddFunds.tsx', 'utf8');
  assert.match(server, /\/api\/heleket\/create/);
  assert.match(server, /\/api\/heleket\/webhook/);
  assert.match(server, /HELEKET_PAYMENT_API_KEY/);
  assert.match(server, /createHash\('md5'\)/);
  assert.match(server, /payment_status|status/);
  assert.match(client, /addFunds\.crypto/);
  assert.ok(fs.existsSync('public/heleket_0c30774c.html'));
});

test('provider and API key hardening is present', () => {
  assert.ok(server.includes('assertSafeProviderUrl'));
  assert.ok(server.includes('hashApiKey'));
  assert.ok(fs.readFileSync(path.join(src,'db/schema.ts'),'utf8').includes('apiKeyHash'));
});

test('wallet ledger inserts are resilient and payment UI has working actions', () => {
  const server = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');
  const payments = fs.readFileSync(path.join(root, 'src/pages/admin/AdminPayments.tsx'), 'utf8');
  assert.match(server, /id:\s*crypto\.randomUUID\(\).*createdAt:\s*new Date\(\)/s);
  assert.match(payments, /payments\/\$\{id\}\/\$\{action\}/);
  assert.match(payments, /action: 'approve'/);
  assert.match(payments, /action: 'reject'/);
});

test('referral links are generated for legacy accounts and referral URLs open registration', () => {
  const server = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');
  const landing = fs.readFileSync(path.join(root, 'src/pages/LandingPage.tsx'), 'utf8');
  assert.match(server, /if\s*\(!u\.referralCode\)/);
  assert.match(landing, /setAuth\('register'\)/);
});

test('provider sync returns useful provider errors and supports common response shapes', () => {
  const server = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');
  assert.match(server, /Provider error:/);
  assert.match(server, /Array\.isArray\(data\.services\)/);
  assert.match(server, /Array\.isArray\(data\.data\)/);
  assert.match(server, /Array\.isArray\(data\.result\)/);
});

test('provider control center endpoints and ledger compatibility migration exist', () => {
  const server = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');
  assert.match(server, /\/api\/admin\/providers\/\:id\/test/);
  assert.match(server, /\/api\/admin\/providers\/\:id\/services/);
  assert.match(server, /\/api\/admin\/providers\/\:id\/services\/bulk/);
  assert.match(fs.readFileSync(path.join(root, 'src/pages/admin/AdminProviders.tsx'), 'utf8'), /Edit Provider/);
  assert.match(fs.readFileSync(path.join(root, 'src/pages/admin/AdminProviders.tsx'), 'utf8'), /Service Control/);
  assert.match(fs.readFileSync(path.join(root, 'drizzle/0004_wallet_ledger_compatibility.sql'), 'utf8'), /ALTER TABLE wallet_ledger ALTER COLUMN type TYPE text/);
});

test('new client category-driven order UX is wired', () => {
  const page = fs.readFileSync(path.join(root,'src/pages/client/ClientNewOrder.tsx'),'utf8');
  const i18n = fs.readFileSync(path.join(root,'src/lib/i18n.tsx'),'utf8');
  for (const value of ['favoriteServices','recentServices']) {
    assert.ok(page.includes(value), `missing client feature ${value}`);
  }
  for (const key of ["t('newOrder.chooseCategory')","t('newOrder.searchInCategory')","t('newOrder.selectedService')","t('newOrder.estimatedCharge')"]) {
    assert.ok(page.includes(key), `missing translated feature ${key}`);
  }
  for (const dictKey of ["'newOrder.chooseCategory'","'newOrder.searchInCategory'","'newOrder.selectedService'","'newOrder.estimatedCharge'"]) {
    assert.ok(i18n.includes(dictKey), `missing i18n key ${dictKey}`);
  }
});

test('admin control center additions are wired', () => {
  const services = fs.readFileSync(path.join(root,'src/pages/admin/AdminServices.tsx'),'utf8');
  const categories = fs.readFileSync(path.join(root,'src/pages/admin/AdminCategories.tsx'),'utf8');
  const orders = fs.readFileSync(path.join(root,'src/pages/admin/AdminOrders.tsx'),'utf8');
  const reports = fs.readFileSync(path.join(root,'src/pages/admin/AdminSystemReports.tsx'),'utf8');
  assert.match(server, /\/api\/admin\/services\/bulk/);
  assert.match(server, /\/api\/admin\/orders\/:id\/refresh/);
  assert.match(server, /\/api\/admin\/reports\/:id\/status/);
  assert.match(services, /Edit Service/); assert.match(services, /Select \{rows.length\}/);
  assert.match(categories, /Edit Category/); assert.match(categories, /Delete/);
  assert.match(orders, /Sync status/); assert.match(orders, /Search order/);
  assert.match(reports, /Resolve/);
});

test('complete affiliate system is wired', () => {
  const server = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');
  const client = fs.readFileSync(path.join(root, 'src/pages/client/ClientAffiliates.tsx'), 'utf8');
  const admin = fs.readFileSync(path.join(root, 'src/pages/admin/AdminAffiliates.tsx'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
  const i18n = fs.readFileSync(path.join(root, 'src/lib/i18n.tsx'), 'utf8');
  assert.match(server, /\/api\/client\/affiliates\/stats/);
  assert.match(server, /\/api\/admin\/affiliates/);
  assert.match(server, /if\s*\(!u\.referralCode\)/);
  assert.match(server, /\/api\/admin\/affiliates/);
  assert.match(client, /useTranslation/);
  assert.match(client, /t\('affiliates\.commissionHistory'\)/);
  assert.match(client, /t\('affiliates\.referredUsers'\)/);
  assert.match(i18n, /'affiliates\.commissionHistory':\s*\{\s*en:\s*'Commission History'/);
  assert.match(i18n, /'affiliates\.referredUsers':\s*\{\s*en:\s*'Referred Users'/);
  assert.match(admin, /Affiliate Control Center/);
  assert.match(app, /ref_click:/);
  assert.ok(fs.existsSync(path.join(root, 'drizzle/0005_affiliate_system.sql')));
});


test('phase 2 notifications and secure API key lifecycle are wired', () => {
  const server = fs.readFileSync('server.ts','utf8');
  const schema = fs.readFileSync('src/db/schema.ts','utf8');
  assert.match(schema, /export const notifications = pgTable\('notifications'/);
  assert.match(server, /\/api\/client\/notifications/);
  assert.match(server, /apiKey: null, apiKeyHash: hashApiKey\(key\)/);
  assert.match(server, /const publicUser =/);
  assert.doesNotMatch(server, /set\(\{ apiKey: key \}\)/);
});

test('phase 2 database migration and clean schema include notifications', () => {
  const migration = fs.readFileSync('drizzle/0007_phase2_notifications.sql','utf8');
  const schema = fs.readFileSync('supabase_schema.sql','utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS notifications/);
  assert.match(migration, /notifications_user_unread_idx/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS notifications/);
});

test('phase 2 auth recovery and email verification UX are wired', () => {
  const auth = fs.readFileSync('src/contexts/AuthContext.tsx','utf8');
  const landing = fs.readFileSync('src/pages/LandingPage.tsx','utf8');
  assert.match(auth, /sendEmailVerification/);
  assert.match(auth, /sendPasswordResetEmail/);
  assert.match(landing, /Forgot password|نسيت كلمة المرور/);
});

test('phase 2 currency presentation is USD-consistent on public services', () => {
  const html = fs.readFileSync('public/services/index.html','utf8');
  assert.doesNotMatch(html, /EGP \/ 1K/);
  assert.match(html, /USD \/ 1K/);
});

test('phase 1 raffle migration remains present and phase 2 docs are present', () => {
  const migration = fs.readFileSync('drizzle/0006_phase1_critical_fixes.sql','utf8');
  assert.match(migration, /DROP CONSTRAINT IF EXISTS raffle_tickets_raffle_id_user_id_key/);
  assert.ok(fs.existsSync('PHASE1_CRITICAL_FIXES.md'));
  assert.ok(fs.existsSync('PHASE2_CRITICAL_FIXES.md'));
});


test('phase 3 schema import and monetization features are wired', () => {
  const schema = fs.readFileSync('src/db/schema.ts','utf8');
  const server = fs.readFileSync('server.ts','utf8');
  const order = fs.readFileSync('src/pages/client/ClientNewOrder.tsx','utf8');
  const affiliates = fs.readFileSync('src/pages/client/ClientAffiliates.tsx','utf8');
  const migration = fs.readFileSync('drizzle/0008_phase3_monetization.sql','utf8');
  assert.match(schema, /unique\s*\}/);
  assert.match(schema, /unique\(\)\.on\(t\.userId, t\.shortlinkId\)/);
  assert.match(server, /\/api\/client\/coupons\/validate/);
  assert.match(server, /\/api\/client\/affiliates\/withdrawals/);
  assert.match(server, /\/api\/admin\/affiliate-withdrawals/);
  assert.match(order, /couponCode/);
  assert.match(affiliates, /affiliates\/withdrawals/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS affiliate_withdrawals/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS coupons/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS coupon_uses/);
});


test('phase 5 final UX hardening is wired', () => {
  const notify = fs.readFileSync(path.join(root, 'src/lib/notify.ts'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src/main.tsx'), 'utf8');
  const providers = fs.readFileSync(path.join(root, 'src/pages/admin/AdminProviders.tsx'), 'utf8');
  assert.match(notify, /Never expose stack traces/);
  assert.match(notify, /تعذر إتمام العملية/);
  assert.doesNotMatch(main, /<pre[^>]*>\{this\.state\.error\.message\}<\/pre>/);
  assert.match(providers, /enabled:!!user&&showBalance/);
});
