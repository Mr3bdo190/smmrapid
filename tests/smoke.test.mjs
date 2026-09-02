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

test('provider and API key hardening is present', () => {
  assert.ok(server.includes('assertSafeProviderUrl'));
  assert.ok(server.includes('hashApiKey'));
  assert.ok(fs.readFileSync(path.join(src,'db/schema.ts'),'utf8').includes('apiKeyHash'));
});
