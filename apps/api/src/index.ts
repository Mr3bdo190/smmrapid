import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { pingDatabase } from './lib/db.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info('api listening', { port: env.PORT, env: env.NODE_ENV });
});

// Non-fatal startup probe: the deploy log should state whether the database answers, and the
// API stays up so probes and static assets keep working while configuration is fixed.
void pingDatabase().then((result) => {
  if (result.ok) logger.info('database reachable');
  else logger.warn('database not reachable at startup', { error: result.error });
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    logger.info(`${signal} received — closing the server`);
    server.close(() => process.exit(0));
  });
}
