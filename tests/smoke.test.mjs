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
    assert.ok(server.includes(normalized), `frontend endpoint not found: ${p}`);
  }
});

test('production build does not silently use Kashier test mode', () => {
  assert.ok(server.includes("isProd && mode !== 'live'"));
});

test('Heleket gateway and verification file are wired', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  const client = fs.readFileSync('src/pages/client/ClientAddFunds.tsx', 'utf8');
  assert.match(server, /\/api\/heleket\/create/);
  assert.match(server, /\/api\/heleket\/webhook/);
  assert.match(server, /HELEKET_PAYMENT_API_KEY/);
  assert.match(server, /createHash\('md5'\)/);
  assert.match(server, /payment_status|status/);
  assert.match(client, /Crypto \(Heleket\)/);
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
  assert.match(landing, /setIsRegister\(true\)/);
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
  for (const value of ['Choose a category','Search services in this category','Selected service','favoriteServices','recentServices','Estimated charge']) {
    assert.ok(page.includes(value), `missing client feature ${value}`);
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
