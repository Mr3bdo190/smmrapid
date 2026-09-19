import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
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

test('unknown route answers 404 with the standard error envelope', async () => {
  const { baseUrl, close } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/definitely-not-a-route`);
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
