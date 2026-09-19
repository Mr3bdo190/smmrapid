import { logger } from '../../lib/logger.js';
import { runOrderTick, type DispatchDeps } from './dispatch.js';

/**
 * The order ticker.
 *
 * This API instance is the only worker the platform has, so the loop lives here: every tick submits
 * the orders that are waiting and refreshes the ones already with a supplier. Two properties matter:
 *
 *  - ticks never overlap (a slow supplier cannot stack up calls), and
 *  - the timer is unref'd, so it can never keep the process alive or delay a shutdown.
 *
 * `ORDER_DISPATCH_INTERVAL_MS` controls it: a positive number of milliseconds, or `0` to switch the
 * loop off entirely (useful for a local run or for a deployment that drives it by hand through
 * POST /api/admin/orders/dispatch). The default is 60s.
 */
export function startOrderWorker(deps: DispatchDeps = {}, intervalMs?: number): () => void {
  const configured = intervalMs ?? Number(process.env.ORDER_DISPATCH_INTERVAL_MS ?? 60_000);

  if (!Number.isFinite(configured) || configured <= 0) {
    logger.info('order worker switched off', {
      ORDER_DISPATCH_INTERVAL_MS: process.env.ORDER_DISPATCH_INTERVAL_MS ?? 'unset',
    });
    return () => {};
  }

  let inFlight = false;

  const tick = async (): Promise<void> => {
    if (inFlight) return;
    inFlight = true;
    try {
      const { dispatch, sync } = await runOrderTick(deps);
      if (dispatch.attempted > 0 || sync.attempted > 0) {
        logger.info('order tick', {
          submitted: dispatch.submitted,
          failed: dispatch.failed,
          skipped: dispatch.skipped,
          synced: sync.synced,
        });
      }
    } catch (error) {
      // A tick failure is never fatal: the next one tries again.
      logger.error('order tick failed', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      inFlight = false;
    }
  };

  const handle = setInterval(() => void tick(), configured);
  (handle as unknown as { unref?: () => void }).unref?.();

  logger.info('order worker started', { intervalMs: configured });
  return () => clearInterval(handle);
}
