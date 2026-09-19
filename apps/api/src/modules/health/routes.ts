import { Router } from 'express';

export const healthRouter = Router();

const payload = () => ({
  ok: true,
  service: 'smmrapid-api',
  uptimeSeconds: Math.round(process.uptime()),
});

/**
 * Liveness probe for Render (healthCheckPath: /health) and uptime monitors.
 * Deliberately outside the /api envelope: probes read it directly and it must stay cheap,
 * unauthenticated and free of any configuration detail.
 */
healthRouter.get('/health', (_req, res) => {
  res.json(payload());
});

/**
 * The same probe under the legacy path. The existing Render service was configured against
 * `/api/health`; keeping both means a health check never fails because of the path alone.
 */
healthRouter.get('/api/health', (_req, res) => {
  res.json(payload());
});
