import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Express } from 'express';
import { registerRoutes } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { logger } from './lib/logger.js';
import { verifyIdToken } from './modules/auth/firebase.js';
import { findOrProvisionUser, loadAccess, loadWallet } from './modules/auth/users.js';
import type { AuthDeps } from './modules/auth/types.js';
import type { PaymentsDeps } from './modules/payments/types.js';

/**
 * Built web client, produced by `npm run build` (apps/web/dist).
 * Resolved relative to this file so it works from both the bundle (dist/app.js) and src.
 */
const WEB_DIST = process.env.WEB_DIST_PATH
  ? path.resolve(process.env.WEB_DIST_PATH)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');

/** Real implementations; tests inject fakes for the identity/database layers. */
const defaultAuthDeps: AuthDeps = { verifyIdToken, findOrProvisionUser, loadAccess, loadWallet };

export type AppOptions = {
  auth?: Partial<AuthDeps>;
  /** Tests inject fake gateways here; production reads the credentials from the environment. */
  payments?: Partial<PaymentsDeps>;
};

/**
 * Builds the Express application.
 *
 * Exported separately from the listener (src/index.ts) so tests can exercise the real app
 * over a real socket without booting the production process.
 */
export function createApp(options: AppOptions = {}): Express {
  const app = express();

  app.disable('x-powered-by');
  // Render terminates TLS in front of the app; the proxy header is needed for correct
  // protocol/host detection and for the rate limiter to see the real client address.
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '1mb' }));

  // API surface first: /health, /api/*
  registerRoutes(app, {
    auth: { ...defaultAuthDeps, ...options.auth },
    payments: options.payments,
  });

  // The built client, when it exists. Until the product phases land this is the scaffold
  // screen — but the deployment must serve something at / to be verifiable at all.
  const indexHtml = path.join(WEB_DIST, 'index.html');
  if (existsSync(indexHtml)) {
    app.use(
      express.static(WEB_DIST, {
        index: false,
        maxAge: '1h',
        setHeaders: (res, filePath) => {
          // hashed assets are immutable; the shell must always be revalidated
          if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );

    // SPA fallback: any non-API GET that wants HTML gets the app shell (deep links work).
    app.get(/^\/(?!api\/|health$).*/, (req, res, next) => {
      if (!req.accepts('html')) return next();
      res.sendFile(indexHtml);
    });

    logger.info('serving the built web client', { path: WEB_DIST });
  } else {
    logger.warn('web client build not found — serving the API only', { expected: indexHtml });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
