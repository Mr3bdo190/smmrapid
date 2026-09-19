import { query, queryOne, withTransaction } from '../../lib/db.js';
import { logger as defaultLogger } from '../../lib/logger.js';
import { adapterForProvider } from '../providers/adapters/registry.js';
import { getProvider } from '../providers/repository.js';
import { redactText } from '../providers/redact.js';
import type { AdapterRegistry, FetchLike, LoggerLike, ProviderOrderStatus } from '../providers/types.js';
import { createNotifier } from '../tickets/service.js';
import { applyWalletMovement } from '../wallet/service.js';
import { orderDispatchFailed } from './errors.js';
import type { DbOrder, OrderStatus } from './types.js';

/**
 * Sending orders to suppliers, and following them up.
 *
 * Two rules shape this file:
 *
 *  1. **One submission per order.** An order is claimed with a conditional UPDATE
 *     (`... where status = 'pending' and provider_order_id is null`), so two workers racing for the
 *     same order always produce exactly one HTTP call. Everything that can fail is recorded on the
 *     order rather than thrown away.
 *  2. **A failed order is refunded automatically.** If a supplier rejects an order, or reports it
 *     canceled or failed, the customer gets their money back in the same transaction that moves the
 *     order to `refunded` — a customer never pays for work that did not happen.
 *
 * Nothing here trusts the supplier's wording: provider errors are mapped to our codes, and the
 * message stored for support is redacted first.
 */

export type DispatchDeps = {
  registry?: AdapterRegistry;
  fetchImpl?: FetchLike;
  logger?: LoggerLike;
  /** Injected so tests can watch the refund movement (production passes the wallet service). */
  refund?: typeof applyWalletMovement;
  /** Scope this run to one supplier — an operator tool, and what keeps a test deterministic. */
  onlyProviderId?: string;
};

export type DispatchAction = 'submitted' | 'failed' | 'skipped' | 'synced';

export type DispatchResult = {
  publicId: string;
  action: DispatchAction;
  code?: string;
  status?: OrderStatus;
};

export type DispatchOutcome = {
  attempted: number;
  submitted: number;
  failed: number;
  skipped: number;
  synced: number;
  results: DispatchResult[];
};

/** The customer is told about anything that changes their money or their order's fate. */
const notify = createNotifier();

const TERMINAL: OrderStatus[] = ['completed', 'partial', 'canceled', 'failed', 'refunded'];
const IN_FLIGHT: OrderStatus[] = ['processing', 'in_progress', 'partial'];

type DispatchableOrder = DbOrder & {
  s_execution_mode: string;
  s_provider_service_id: string | null;
  s_supports_drip_feed: boolean;
  s_provider_slug: string | null;
};

/**
 * Cancels an order that will not run and returns the money.
 *
 * `charge_minor − refunded_minor` is what the customer actually paid, so a partially refunded order
 * is only topped up. The movement and the order row commit together.
 */
export async function refundOrder(order: DbOrder, reason: string, deps: DispatchDeps = {}): Promise<number> {
  const paid = Number(order.charge_minor) - Number(order.refunded_minor);
  if (paid <= 0) return 0;

  const move = deps.refund ?? applyWalletMovement;
  const status: OrderStatus = 'refunded';

  await withTransaction(async (client) => {
    await move(
      {
        userId: order.user_id,
        direction: 'credit',
        type: 'order_refund',
        amountMinor: paid,
        description: `Refund ${order.public_id}`,
        idempotencyKey: `refund:${order.id}`,
        orderId: order.id,
      },
      client,
    );

    await client.query(
      `update orders
          set refunded_minor = charge_minor,
              status = $2,
              provider_error = coalesce($3, provider_error)
        where id = $1`,
      [order.id, status, reason ? redactText(reason, { limit: 300 }) : null],
    );
  });

  return paid;
}

/** Marks an order failed with a customer-safe note, then refunds it. */
async function failOrder(order: DbOrder, code: string, message: string, deps: DispatchDeps = {}): Promise<DispatchResult> {
  const refunded = await refundOrder(order, message, deps);

  await notify(
    refunded > 0
      ? {
          userId: order.user_id,
          type: 'order.refunded',
          title: 'رجعنا مبلغ الطلب لمحفظتك',
          body: `الطلب ${order.public_id}`,
          link: `/orders/${order.public_id}`,
        }
      : {
          userId: order.user_id,
          type: 'order.failed',
          title: 'الطلب ما اتنفذش',
          body: `الطلب ${order.public_id}`,
          link: `/orders/${order.public_id}`,
        },
  );

  return {
    publicId: order.public_id,
    action: 'failed',
    code,
    status: refunded > 0 ? 'refunded' : 'failed',
  };
}

/**
 * Submits every pending order that has a supplier to submit to, newest work first out of the queue.
 * A `manual` service (work a human does) is skipped: nothing is sent anywhere for it.
 */
export async function dispatchPendingOrders(deps: DispatchDeps = {}, limit = 20): Promise<DispatchOutcome> {
  const logger = deps.logger ?? defaultLogger;
  const outcome: DispatchOutcome = { attempted: 0, submitted: 0, failed: 0, skipped: 0, synced: 0, results: [] };

  const candidates = await query<DispatchableOrder>(
    `select o.*, s.execution_mode as s_execution_mode, s.provider_service_id as s_provider_service_id,
            s.supports_drip_feed as s_supports_drip_feed, p.slug as s_provider_slug
       from orders o
       join services s on s.id = o.service_id
       left join providers p on p.id = o.provider_id
      where o.status = 'pending'
        and o.provider_id is not null
        and o.provider_order_id is null
        and s.execution_mode = 'provider'
        and s.provider_service_id is not null
        and ($2::uuid is null or o.provider_id = $2::uuid)
      order by o.created_at asc
      limit $1`,
    [limit, deps.onlyProviderId ?? null],
  );

  for (const candidate of candidates) {
    outcome.attempted += 1;

    // Claim it. Only one worker can win this UPDATE, so only one submission ever happens.
    const claimed = await queryOne<DbOrder>(
      `update orders set status = 'processing'
        where id = $1 and status = 'pending' and provider_order_id is null
        returning *`,
      [candidate.id],
    );
    if (!claimed) {
      outcome.skipped += 1;
      outcome.results.push({ publicId: candidate.public_id, action: 'skipped', code: 'ALREADY_CLAIMED' });
      continue;
    }

    try {
      const provider = await getProvider(candidate.provider_id!);
      if (!provider || !provider.is_active) {
        throw orderDispatchFailed('The supplier for this order is not available right now.');
      }

      const { adapter } = adapterForProvider(provider, {
        registry: deps.registry,
        fetchImpl: deps.fetchImpl,
        logger,
      });

      if (!adapter.supports('order.create')) {
        const failed = await failOrder(claimed, 'PROVIDER_CAPABILITY_UNSUPPORTED', 'This supplier cannot accept new orders.', deps);
        outcome.failed += 1;
        outcome.results.push(failed);
        continue;
      }

      const submitted = await adapter.createOrder({
        externalServiceId: candidate.s_provider_service_id!,
        link: candidate.target,
        quantity: Number(candidate.quantity),
        dripFeed: candidate.drip_feed,
        runs: null,
        interval: null,
      });

      await query(
        `update orders set provider_order_id = $2 where id = $1`,
        [claimed.id, submitted.externalOrderId],
      );

      outcome.submitted += 1;
      outcome.results.push({ publicId: claimed.public_id, action: 'submitted', status: 'processing' });
      logger.info('order submitted to the supplier', {
        publicId: claimed.public_id,
        provider: candidate.s_provider_slug,
        externalOrderId: submitted.externalOrderId,
      });
    } catch (error) {
      const code = String((error as { code?: string }).code ?? 'ORDER_DISPATCH_FAILED');
      const message = error instanceof Error ? error.message : 'The supplier refused the order.';
      outcome.failed += 1;
      outcome.results.push(await failOrder(claimed, code, message, deps));
      logger.warn('order rejected by the supplier — refunded', { publicId: claimed.public_id, code });
    }
  }

  return outcome;
}

/**
 * Follows up on orders already with a supplier: refreshes status, remaining quantity and start
 * count, and refunds anything the supplier cancels or fails.
 */
export async function syncOrderStatuses(deps: DispatchDeps = {}, limit = 50): Promise<DispatchOutcome> {
  const logger = deps.logger ?? defaultLogger;
  const outcome: DispatchOutcome = { attempted: 0, submitted: 0, failed: 0, skipped: 0, synced: 0, results: [] };

  const candidates = await query<DbOrder>(
    `select o.* from orders o
      where o.provider_order_id is not null
        and o.status = any($1::order_status[])
        and ($3::uuid is null or o.provider_id = $3::uuid)
      order by o.updated_at asc
      limit $2`,
    [IN_FLIGHT, limit, deps.onlyProviderId ?? null],
  );

  for (const order of candidates) {
    outcome.attempted += 1;
    try {
      const provider = await getProvider(order.provider_id!);
      if (!provider) {
        outcome.skipped += 1;
        outcome.results.push({ publicId: order.public_id, action: 'skipped', code: 'PROVIDER_NOT_FOUND' });
        continue;
      }

      const { adapter } = adapterForProvider(provider, {
        registry: deps.registry,
        fetchImpl: deps.fetchImpl,
        logger,
      });
      if (!adapter.supports('order.status')) {
        outcome.skipped += 1;
        outcome.results.push({ publicId: order.public_id, action: 'skipped', code: 'PROVIDER_CAPABILITY_UNSUPPORTED' });
        continue;
      }

      const remote = await adapter.orderStatus(order.provider_order_id!);
      const next = remote.status as OrderStatus;

      // A supplier that cancels or fails an order owes the customer the money back.
      if (next === 'canceled' || next === 'failed') {
        outcome.failed += 1;
        outcome.results.push(await failOrder(order, 'PROVIDER_REJECTED', 'The supplier cancelled this order.', deps));
        continue;
      }

      if (next !== order.status || remote.remains !== null || remote.startCount !== null) {
        await query(
          `update orders set status = $2, remains = coalesce($3, remains), start_count = coalesce($4, start_count)
            where id = $1`,
          [order.id, next, remote.remains, remote.startCount],
        );
      }

      outcome.synced += 1;
      outcome.results.push({ publicId: order.public_id, action: 'synced', status: next });

      if (next === 'completed' && order.status !== 'completed') {
        logger.info('order completed by the supplier', { publicId: order.public_id });
        await notify({
          userId: order.user_id,
          type: 'order.completed',
          title: 'طلبك خلص',
          body: `الطلب ${order.public_id}`,
          link: `/orders/${order.public_id}`,
        });
      }
    } catch (error) {
      // A follow-up failure is not fatal: the next tick tries again. Nothing is refunded here —
      // only the supplier's own answer can cancel an order.
      outcome.skipped += 1;
      outcome.results.push({
        publicId: order.public_id,
        action: 'skipped',
        code: String((error as { code?: string }).code ?? 'PROVIDER_UNREACHABLE'),
      });
      logger.warn('order status could not be refreshed', {
        publicId: order.public_id,
        error: redactText(error instanceof Error ? error.message : String(error), { limit: 200 }),
      });
    }
  }

  return outcome;
}

/** One tick: submit what is waiting, then refresh what is running. */
export async function runOrderTick(deps: DispatchDeps = {}): Promise<{ dispatch: DispatchOutcome; sync: DispatchOutcome }> {
  const dispatch = await dispatchPendingOrders(deps);
  const sync = await syncOrderStatuses(deps);
  return { dispatch, sync };
}

export { TERMINAL };
export type { ProviderOrderStatus };
