import { Router } from 'express';

export const healthRouter = Router();

/**
 * Liveness probe for Render (healthCheckPath: /health) and uptime monitors.
 * Deliberately outside the /api envelope: probes read it directly and it must stay cheap,
 * unauthenticated and free of any configuration detail.
 */
healthRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'smmrapid-api',
    uptimeSeconds: Math.round(process.uptime()),
  });
});
