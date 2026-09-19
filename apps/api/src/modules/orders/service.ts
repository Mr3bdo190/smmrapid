import { randomUUID } from 'node:crypto';
import { query, queryOne, withTransaction } from '../../lib/db.js';
import { quantityCharge } from '../pricing/engine.js';
import { normalizeCouponCode } from '../pricing/service.js';
import {
  ACTIVE_ORDER_STATUSES,
  ORDER_STATUSES,
  type CreateOrderInput,
  type CreateOrderResult,
  type DbOrder,
  type OrderDetail,
  type OrderDeps,
  type OrderListPage,
  type OrderListParams,
  type OrderServiceRow,
  type OrderStatus,
  type OrderTimelineEntry,
  type PublicOrder,
  type RepeatOrderResult,
} from './types.js';
import { orderDuplicateTarget, orderIdempotencyConflict, orderNotRepeatable, orderNotFound, orderTargetInvalid } from './errors.js';

/**
 * The orders data layer.
 *
 * Customer money (the charge) always comes from the pricing engine. Our cost is multiplied by the
 * engine's own `quantityCharge()`, so the unit conversion exists once and cannot drift.
 */

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_TARGET_LENGTH = 5000;
const MAX_IDEMPOTENCY_KEY = 200;

const toInt = (value: string | number | null | undefined): number =>
  value === null || value === undefined ? 0 : Number(value);

const iso = (value: string | Date | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

/**
 * A target is what the provider will act on: a URL, a username or a link depending on the service.
 * We trim it, collapse inner whitespace and refuse the shapes that always mean a mistake — the
 * database also enforces a 1..5000 character length.
 */
export function normalizeTarget(raw: unknown): string {
  if (typeof raw !== 'string') throw orderTargetInvalid('a link or username is required');
  const target = raw.replace(/\s+/g, ' ').trim();
  if (!target) throw orderTargetInvalid('it is empty');
  if (target.length > MAX_TARGET_LENGTH) throw orderTargetInvalid('it is longer than 5000 characters');
  // Control characters are always a paste accident and break providers' parsers.
  const hasControl = [...target].some((char) => {
    const code = char.codePointAt(0) ?? 0;
    return code < 32 || code === 127;
  });
  if (hasControl) throw orderTargetInvalid('it contains control characters');
  return target;
}

export function normalizeIdempotencyKey(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw !== 'string') throw orderTargetInvalid('the idempotency key must be text');
  const key = raw.trim();
  if (key.length > MAX_IDEMPOTENCY_KEY) throw orderTargetInvalid('the idempotency key is too long');
  return key || null;
}

export function parseListQuery(input: { cursor?: unknown; limit?: unknown; status?: unknown }): OrderListParams {
  const limit = input.limit === undefined || input.limit === '' ? DEFAULT_PAGE_SIZE : Number(input.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw orderTargetInvalid(`limit must be a whole number between 1 and ${MAX_PAGE_SIZE}`);
  }
  const status = input.status === undefined || input.status === '' ? null : String(input.status);
  if (status && !ORDER_STATUSES.includes(status as OrderStatus)) {
    throw orderTargetInvalid(`status must be one of ${ORDER_STATUSES.join(', ')}`);
  }
  return {
    userId: '',
    cursor: input.cursor === undefined || input.cursor === '' ? null : String(input.cursor),
    limit,
    status: status as OrderStatus | null,
  };
}

/** Keyset cursor over (created_at, id) — stable even when two orders share a timestamp. */
function encodeCursor(order: DbOrder): string {
  return Buffer.from(`${iso(order.created_at)}|${order.id}`, 'utf8').toString('base64url');
}

function decodeCursor(cursor: string | null | undefined): { createdAt: string; id: string } | null {
  if (!cursor) return null;
  try {
    const [createdAt, id] = Buffer.from(String(cursor), 'base64url').toString('utf8').split('|');
    if (!createdAt || !id || Number.isNaN(Date.parse(createdAt))) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

const publicOrder = (order: DbOrder, service: { slug: string; name: string; name_ar: string | null }, currency: string, variantName: string | null): PublicOrder => {
  const chargeMinor = toInt(order.charge_minor);
  const discountMinor = toInt(order.discount_minor);
  return {
    publicId: order.public_id,
    status: order.status,
    service: { slug: service.slug, name: service.name, nameAr: service.name_ar },
    variant: order.variant_id ? { id: order.variant_id, name: variantName ?? '' } : null,
    target: order.target,
    quantity: toInt(order.quantity),
    chargeMinor,
    discountMinor,
    totalMinor: chargeMinor - discountMinor,
    refundedMinor: toInt(order.refunded_minor),
    currency,
    dripFeed: order.drip_feed,
    startCount: order.start_count === null ? null : toInt(order.start_count),
    remains: order.remains === null ? null : toInt(order.remains),
    createdAt: iso(order.created_at) ?? '',
    updatedAt: iso(order.updated_at) ?? '',
    completedAt: iso(order.completed_at),
  };
};

const SERVICE_PROJECTION = `
  s.id, s.slug, s.name, s.name_ar, s.provider_id, s.price_unit, s.provider_cost_minor, s.category_id
`;

async function loadOrderRow(orderId: string): Promise<{ order: DbOrder; service: OrderServiceRow; variantName: string | null } | null> {
  const row = await queryOne<DbOrder>(
    `select o.*, s.slug as s_slug, s.name as s_name, s.name_ar as s_name_ar, s.price_unit as s_price_unit,
            s.provider_cost_minor as s_cost, s.provider_id as s_provider, s.category_id as s_category,
            v.name as v_name
       from orders o
       join services s on s.id = o.service_id
       left join service_variants v on v.id = o.variant_id
      where o.id = $1`,
    [orderId],
  );
  if (!row) return null;
  const anyRow = row as unknown as Record<string, unknown>;
  return {
    order: row,
    service: {
      id: String(anyRow.service_id),
      slug: String(anyRow.s_slug),
      name: String(anyRow.s_name),
      name_ar: (anyRow.s_name_ar as string | null) ?? null,
      provider_id: (anyRow.s_provider as string | null) ?? null,
      price_unit: anyRow.s_price_unit as 'per_1000' | 'per_item',
      provider_cost_minor: anyRow.s_cost as string | number,
      category_id: (anyRow.s_category as string | null) ?? null,
    },
    variantName: (anyRow.v_name as string | null) ?? null,
  };
}

/**
 * Creates an order and charges the wallet in ONE transaction.
 *
 * The order row, the wallet movement and the first history row commit together. If the wallet
 * refuses (not enough balance, ledger guard), the order disappears with it — a customer is never
 * charged for an order that does not exist, and never has an order that was not paid for.
 */
export async function createOrder(input: CreateOrderInput, deps: OrderDeps): Promise<CreateOrderResult> {
  const target = normalizeTarget(input.target);
  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);

  // Replay of the same attempt: return the original order instead of charging again.
  if (idempotencyKey) {
    const existing = await queryOne<DbOrder>('select * from orders where idempotency_key = $1', [idempotencyKey]);
    if (existing) {
      if (existing.user_id !== input.userId) throw orderIdempotencyConflict();
      const loaded = await loadOrderRow(existing.id);
      if (loaded) {
        return { order: publicOrder(loaded.order, loaded.service, 'USD', loaded.variantName), replayed: true };
      }
    }
  }

  // The price is the engine's answer, never the client's.
  const priced = await deps.quote({
    serviceSlug: input.serviceSlug,
    serviceId: input.serviceId,
    variantId: input.variantId ?? undefined,
    quantity: input.quantity,
    couponCode: input.couponCode ?? undefined,
    userId: input.userId,
  });

  const service = await queryOne<OrderServiceRow>(
    `select ${SERVICE_PROJECTION} from services s where s.id = $1`,
    [priced.service.id],
  );
  if (!service) throw orderNotFound();

  // Duplicate protection: one open order per (service, target) per customer.
  const duplicate = await queryOne<{ public_id: string }>(
    `select public_id from orders
      where user_id = $1 and service_id = $2 and target = $3 and status = any($4::order_status[])
      limit 1`,
    [input.userId, priced.service.id, target, ACTIVE_ORDER_STATUSES],
  );
  if (duplicate) throw orderDuplicateTarget();

  const couponCode = priced.coupon?.code ?? null;
  const couponId = couponCode
    ? (await queryOne<{ id: string }>('select id from coupons where code = $1', [normalizeCouponCode(couponCode)]))?.id ?? null
    : null;

  const providerCostMinor = quantityCharge(input.quantity, toInt(service.provider_cost_minor), service.price_unit);
  const totalMinor = priced.totalMinor;
  const orderId = randomUUID();

  const created = await withTransaction(async (client) => {
    const inserted = await client.query<DbOrder>(
      `insert into orders (
         id, user_id, service_id, variant_id, provider_id, coupon_id, target, quantity,
         charge_minor, discount_minor, provider_cost_minor,
         drip_feed, runs_at, idempotency_key
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       returning *`,
      [
        orderId,
        input.userId,
        priced.service.id,
        priced.variant?.id ?? null,
        service.provider_id,
        couponId,
        target,
        input.quantity,
        priced.chargeMinor,
        priced.discountMinor,
        providerCostMinor,
        input.dripFeed === true,
        input.runsAt ?? null,
        idempotencyKey,
      ],
    );
    const order = inserted.rows[0];
    if (!order) throw new Error('orders: the insert returned no row');

    if (totalMinor > 0) {
      await deps.chargeWallet(
        {
          userId: input.userId,
          direction: 'debit',
          type: 'order_charge',
          amountMinor: totalMinor,
          description: `Order ${order.public_id}`,
          idempotencyKey: idempotencyKey ? `${idempotencyKey}:charge` : null,
          orderId,
        },
        client,
      );
    }

    await client.query(
      `insert into order_items (order_id, variant_id, label, quantity, unit_price_minor, subtotal_minor)
       values ($1, $2, $3, $4, $5, $6)`,
      [orderId, priced.variant?.id ?? null, priced.variant?.name ?? null, input.quantity, priced.unitPriceMinor, priced.chargeMinor],
    );

    // The status trigger only fires on UPDATE, so the first history row is written here.
    await client.query(
      `insert into order_status_history (order_id, from_status, to_status, source, actor_user_id, note)
       values ($1, null, 'pending', 'user', $2, 'order created')`,
      [orderId, input.userId],
    );

    return order;
  });

  return {
    order: publicOrder(created, { slug: service.slug, name: service.name, name_ar: service.name_ar }, priced.currency, priced.variant?.name ?? null),
    replayed: false,
  };
}

/** The customer's own history, newest first. */
export async function listOrders(params: OrderListParams): Promise<OrderListPage> {
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const cursor = decodeCursor(params.cursor);

  const rows = await query<DbOrder & { s_slug: string; s_name: string; s_name_ar: string | null; v_name: string | null }>(
    `select o.*, s.slug as s_slug, s.name as s_name, s.name_ar as s_name_ar, v.name as v_name
       from orders o
       join services s on s.id = o.service_id
       left join service_variants v on v.id = o.variant_id
      where o.user_id = $1
        and ($2::text is null or o.status = $2::order_status)
        and ($3::timestamptz is null or (o.created_at, o.id) < ($3::timestamptz, $4::uuid))
      order by o.created_at desc, o.id desc
      limit $5`,
    [params.userId, params.status ?? null, cursor?.createdAt ?? null, cursor?.id ?? null, limit + 1],
  );

  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    orders: page.map((row) =>
      publicOrder(row as unknown as DbOrder, { slug: row.s_slug, name: row.s_name, name_ar: row.s_name_ar }, 'USD', row.v_name),
    ),
    nextCursor: rows.length > limit && last ? encodeCursor(last as unknown as DbOrder) : null,
  };
}

/** One order with its status timeline — only the owner's. */
export async function getOrder(userId: string, publicId: string): Promise<OrderDetail> {
  const loaded = await queryOne<DbOrder & { s_slug: string; s_name: string; s_name_ar: string | null; s_id: string; v_name: string | null }>(
    `select o.*, s.slug as s_slug, s.name as s_name, s.name_ar as s_name_ar, s.id as s_id, v.name as v_name
       from orders o
       join services s on s.id = o.service_id
       left join service_variants v on v.id = o.variant_id
      where o.public_id = $1 and o.user_id = $2`,
    [publicId, userId],
  );
  if (!loaded) throw orderNotFound();

  const history = await query<{ from_status: OrderStatus | null; to_status: OrderStatus; source: OrderTimelineEntry['source']; note: string | null; created_at: string }>(
    `select from_status, to_status, source, note, created_at
       from order_status_history where order_id = $1 order by created_at asc, id asc`,
    [loaded.id],
  );

  const order = publicOrder(
    loaded as unknown as DbOrder,
    { slug: loaded.s_slug, name: loaded.s_name, name_ar: loaded.s_name_ar },
    'USD',
    loaded.v_name,
  );

  return {
    ...order,
    timeline: history.map((row) => ({
      from: row.from_status,
      to: row.to_status,
      source: row.source,
      note: row.note,
      at: iso(row.created_at) ?? '',
    })),
  };
}

/**
 * Re-ordering: prices the same thing again and returns a prefill. It deliberately creates nothing
 * and charges nothing — the customer confirms, and only then does `createOrder` run.
 */
export async function repeatOrder(userId: string, publicId: string, deps: OrderDeps): Promise<RepeatOrderResult> {
  const loaded = await queryOne<{ id: string; service_id: string; target: string; quantity: string | number; variant_id: string | null; slug: string; is_active: boolean; deleted_at: string | null }>(
    `select o.id, o.service_id, o.target, o.quantity, o.variant_id, s.slug, s.is_active, s.deleted_at
       from orders o join services s on s.id = o.service_id
      where o.public_id = $1 and o.user_id = $2`,
    [publicId, userId],
  );
  if (!loaded) throw orderNotFound();
  const quantity = toInt(loaded.quantity);

  if (!loaded.is_active || loaded.deleted_at) {
    return { repeatable: false, prefill: null, quote: null };
  }

  try {
    const priced = await deps.quote({
      serviceSlug: loaded.slug,
      variantId: loaded.variant_id ?? undefined,
      quantity,
      userId,
    });
    return {
      repeatable: true,
      prefill: { serviceSlug: loaded.slug, variantId: loaded.variant_id, target: loaded.target, quantity },
      quote: priced,
    };
  } catch {
    // The quote itself refuses it (price gone, range changed): say so instead of guessing.
    return { repeatable: false, prefill: null, quote: null };
  }
}

/** Shared by routes: anything this module throws that is not already an AppError becomes one. */
export { orderNotRepeatable };
