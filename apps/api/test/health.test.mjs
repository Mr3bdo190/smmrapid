import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../dist/app.js';

/** Boots the real app on an ephemeral port and returns a base URL + a closer. */
async function startTestServer() {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object', 'server should expose an address');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

const webIndex = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../web/dist/index.html',
);
const webBuilt = existsSync(webIndex);

test('GET /health reports ok with only the documented fields', async () => {
  const { baseUrl, close } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /application\/json/);

    const body = await res.json();
    assert.deepEqual(Object.keys(body).sort(), ['ok', 'service', 'uptimeSeconds']);
    assert.equal(body.ok, true);
    assert.equal(body.service, 'smmrapid-api');
    assert.equal(typeof body.uptimeSeconds, 'number');
  } finally {
    await close();
  }
});

test('GET /api/health answers the same probe (legacy Render health-check path)', async () => {
  const { baseUrl, close } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, 'smmrapid-api');
  } finally {
    await close();
  }
});

test('an unknown API route answers 404 with the standard error envelope', async () => {
  const { baseUrl, close } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/definitely-not-a-route`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'NOT_FOUND');
    assert.equal(typeof body.error.message, 'string');
  } finally {
    await close();
  }
});

test('the server does not advertise its framework', async () => {
  const { baseUrl, close } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.headers.get('x-powered-by'), null);
  } finally {
    await close();
  }
});

test('the built web client is served at / and deep links fall back to the shell', { skip: !webBuilt }, async () => {
  const { baseUrl, close } = await startTestServer();
  try {
    const root = await fetch(`${baseUrl}/`, { headers: { accept: 'text/html' } });
    assert.equal(root.status, 200);
    assert.match(root.headers.get('content-type') ?? '', /text\/html/);
    assert.match(await root.text(), /<div id="root">/);

    const deepLink = await fetch(`${baseUrl}/dashboard/orders`, { headers: { accept: 'text/html' } });
    assert.equal(deepLink.status, 200);
    assert.match(await deepLink.text(), /<div id="root">/);

    // a request that does not want HTML must not receive the shell
    const json = await fetch(`${baseUrl}/nope`, { headers: { accept: 'application/json' } });
    assert.equal(json.status, 404);
    assert.match(json.headers.get('content-type') ?? '', /application\/json/);
  } finally {
    await close();
  }
});
