import express from 'express';
import type { Express } from 'express';
import { registerRoutes } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

/**
 * Builds the Express application.
 *
 * Exported separately from the listener (src/index.ts) so tests can exercise the real app
 * over a real socket without booting the production process.
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  // Render terminates TLS in front of the app; the proxy header is needed for correct
  // protocol/host detection in payment callbacks later (Phase 9).
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '1mb' }));

  registerRoutes(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
