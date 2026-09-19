import test from 'node:test';
import assert from 'node:assert/strict';
import { logger } from '../dist/lib/logger.js';

/** Captures everything the logger writes during `run`. */
async function captureStdout(run) {
  const original = process.stdout.write.bind(process.stdout);
  const chunks = [];
  process.stdout.write = (chunk) => {
    chunks.push(String(chunk));
    return true;
  };
  try {
    run();
  } finally {
    process.stdout.write = original;
  }
  return chunks.join('');
}

test('logger redacts credential-shaped keys and values', async () => {
  const output = await captureStdout(() =>
    logger.info('provider call', {
      provider: 'example',
      apiKey: 'super-secret-key',
      nested: { authorization: 'Bearer abcdefghijklmnopqrstuvwxyz', ok: true },
      databaseUrl: 'postgresql://user:pw@host:5432/db',
      safeCount: 3,
    }),
  );

  // sanity: the line itself is valid JSON with the expected shape
  const line = JSON.parse(output.trim());
  assert.equal(line.level, 'info');
  assert.equal(line.message, 'provider call');
  assert.equal(line.meta.provider, 'example');
  assert.equal(line.meta.safeCount, 3);
  assert.equal(line.meta.nested.ok, true);

  // no secret survives, under any shape
  assert.equal(line.meta.apiKey, '[redacted]');
  assert.equal(line.meta.nested.authorization, '[redacted]');
  for (const secret of ['super-secret-key', 'abcdefghijklmnopqrstuvwxyz', 'user:pw@host']) {
    assert.ok(!output.includes(secret), `log output must not contain ${secret}`);
  }
});

test('logger writes warnings and errors to stderr', async () => {
  const original = process.stderr.write.bind(process.stderr);
  let captured = '';
  process.stderr.write = (chunk) => {
    captured += String(chunk);
    return true;
  };
  try {
    logger.error('boom', { error: 'failed to reach the provider' });
  } finally {
    process.stderr.write = original;
  }
  const line = JSON.parse(captured.trim());
  assert.equal(line.level, 'error');
  assert.equal(line.meta.error, 'failed to reach the provider');
});
