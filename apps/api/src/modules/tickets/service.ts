import { query, queryOne, withTransaction } from '../../lib/db.js';
import { logger as defaultLogger } from '../../lib/logger.js';
import {
  notificationNotFound,
  ticketNotFound,
  type Notifier,
  type NotificationType,
  type NotifyInput,
  type PublicNotification,
  type PublicTicket,
  type PublicTicketMessage,
  type TicketDetail,
  type TicketMessageRow,
  type TicketRow,
  type TicketStatus,
} from './types.js';

/**
 * Notifications.
 *
 * `notify()` is the single entry point every module uses, and it is deliberately forgiving: a
 * notification that cannot be written is logged and swallowed. Losing a message is bad; losing an
 * order because its notification failed would be worse.
 */
export function createNotifier(logger = defaultLogger): Notifier {
  return async (input: NotifyInput): Promise<void> => {
    try {
      await query(
        `insert into notifications (user_id, type, title, body, link) values ($1, $2, $3, $4, $5)`,
        [input.userId, input.type, input.title, input.body ?? null, input.link ?? null],
      );
    } catch (error) {
      logger.warn('notification could not be written', {
        type: input.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

const iso = (value: string | Date | null | undefined): string | null =>
  value === null || value === undefined ? null : value instanceof Date ? value.toISOString() : new Date(value).toISOString();

export async function listNotifications(userId: string, limit = 20): Promise<PublicNotification[]> {
  const rows = await query<{
    id: string | number;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    read_at: string | null;
    created_at: string;
  }>(
    `select id, type, title, body, link, read_at, created_at
       from notifications where user_id = $1 order by created_at desc, id desc limit $2`,
    [userId, Math.min(Math.max(limit, 1), 100)],
  );

  return rows.map((row) => ({
    id: String(row.id),
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: iso(row.read_at),
    createdAt: iso(row.created_at) ?? '',
  }));
}

export async function unreadCount(userId: string): Promise<number> {
  const row = await queryOne<{ n: number }>(
    'select count(*)::int as n from notifications where user_id = $1 and read_at is null',
    [userId],
  );
  return row?.n ?? 0;
}

export async function markRead(userId: string, id: string): Promise<PublicNotification[]> {
  const updated = await query(
    'update notifications set read_at = coalesce(read_at, now()) where user_id = $1 and id = $2 returning id',
    [userId, id],
  );
  if (updated.length === 0) throw notificationNotFound();
  return listNotifications(userId, 100);
}

export async function markAllRead(userId: string): Promise<number> {
  const updated = await query(
    'update notifications set read_at = now() where user_id = $1 and read_at is null returning id',
    [userId],
  );
  return updated.length;
}

/* ── tickets ──────────────────────────────────────────────────────────────────────────────────── */

const publicTicket = (row: TicketRow, messageCount?: number): PublicTicket => ({
  publicId: row.public_id,
  subject: row.subject,
  category: row.category,
  status: row.status,
  priority: row.priority,
  assigned: Boolean(row.assigned_admin_id),
  createdAt: iso(row.created_at) ?? '',
  updatedAt: iso(row.updated_at) ?? '',
  lastMessageAt: iso(row.last_message_at),
  closedAt: iso(row.closed_at),
  ...(messageCount === undefined ? {} : { messageCount }),
});

const publicMessage = (row: TicketMessageRow, authorName: string | null): PublicTicketMessage => ({
  id: String(row.id),
  authorType: row.author_type,
  authorName,
  body: row.body,
  attachments: Array.isArray(row.attachments) ? (row.attachments as unknown[]) : [],
  createdAt: iso(row.created_at) ?? '',
});

export type CreateTicketInput = {
  userId: string;
  subject: string;
  body: string;
  category?: string | null;
  priority?: TicketRow['priority'];
};

/**
 * Opens a ticket with its first message, in one transaction: a ticket with no message would be a
 * dead row, and a message with no ticket a lost one.
 */
export async function createTicket(input: CreateTicketInput): Promise<PublicTicket> {
  const created = await withTransaction(async (client) => {
    const ticket = (
      await client.query<TicketRow>(
        `insert into tickets (user_id, subject, category, priority, status, last_message_at)
         values ($1, $2, $3, $4, 'open', now())
         returning *`,
        [input.userId, input.subject.trim(), input.category ?? null, input.priority ?? 'normal'],
      )
    ).rows[0];
    if (!ticket) throw new Error('tickets: the insert returned no row');

    await client.query(
      `insert into ticket_messages (ticket_id, author_type, author_user_id, body, attachments, is_internal)
       values ($1, 'user', $2, $3, '[]'::jsonb, false)`,
      [ticket.id, input.userId, input.body.trim()],
    );

    return ticket;
  });

  // No notification here on purpose: opening a ticket is the customer's own action, and notifying
  // somebody about what they just did is noise. Staff see it in their queue; the customer hears
  // from us when we actually answer.
  return publicTicket(created, 1);
}

export async function listTickets(userId: string, limit = 20): Promise<PublicTicket[]> {
  const rows = await query<TicketRow & { message_count: number }>(
    `select t.*, (select count(*)::int from ticket_messages m where m.ticket_id = t.id and not m.is_internal) as message_count
       from tickets t where t.user_id = $1
      order by coalesce(t.last_message_at, t.created_at) desc, t.created_at desc
      limit $2`,
    [userId, Math.min(Math.max(limit, 1), 100)],
  );
  return rows.map((row) => publicTicket(row, row.message_count));
}

/** One ticket with its conversation. Internal staff notes are filtered out for everyone but staff. */
export async function getTicket(userId: string, publicId: string, options: { includeInternal?: boolean } = {}): Promise<TicketDetail> {
  const ticket = await queryOne<TicketRow>('select * from tickets where public_id = $1 and user_id = $2', [publicId, userId]);
  if (!ticket) throw ticketNotFound();

  const messages = await query<TicketMessageRow & { author_name: string | null }>(
    `select m.*, u.display_name as author_name
       from ticket_messages m
       left join users u on u.id = m.author_user_id
      where m.ticket_id = $1 and ($2::boolean or not m.is_internal)
      order by m.created_at asc, m.id asc`,
    [ticket.id, options.includeInternal === true],
  );

  return {
    ...publicTicket(ticket, messages.length),
    messages: messages.map((row) => publicMessage(row, row.author_name)),
  };
}

/**
 * A customer reply. It reopens a closed ticket on purpose: making somebody open a second ticket to
 * continue the same conversation helps nobody. The status says whose turn it is afterwards.
 */
export async function addCustomerMessage(userId: string, publicId: string, body: string): Promise<TicketDetail> {
  const ticket = await queryOne<TicketRow>('select * from tickets where public_id = $1 and user_id = $2', [publicId, userId]);
  if (!ticket) throw ticketNotFound();

  await withTransaction(async (client) => {
    await client.query(
      `insert into ticket_messages (ticket_id, author_type, author_user_id, body, attachments, is_internal)
       values ($1, 'user', $2, $3, '[]'::jsonb, false)`,
      [ticket.id, userId, body.trim()],
    );
    await client.query(
      `update tickets set status = 'open', closed_at = null, last_message_at = now() where id = $1`,
      [ticket.id],
    );
  });

  return getTicket(userId, publicId);
}

/** The customer can close their own ticket; reopening happens by replying. */
export async function closeOwnTicket(userId: string, publicId: string): Promise<PublicTicket> {
  const ticket = await queryOne<TicketRow>('select * from tickets where public_id = $1 and user_id = $2', [publicId, userId]);
  if (!ticket) throw ticketNotFound();

  const updated = await queryOne<TicketRow>(
    `update tickets set status = 'closed', closed_at = now() where id = $1 returning *`,
    [ticket.id],
  );
  return publicTicket(updated ?? ticket);
}

/* ── staff side (used by the admin module and the tests) ──────────────────────────────────────── */

export async function staffReply(
  publicId: string,
  adminUserId: string,
  body: string,
  options: { internal?: boolean; notify?: Notifier } = {},
): Promise<PublicTicket> {
  const ticket = await queryOne<TicketRow>('select * from tickets where public_id = $1', [publicId]);
  if (!ticket) throw ticketNotFound();

  await withTransaction(async (client) => {
    await client.query(
      `insert into ticket_messages (ticket_id, author_type, author_user_id, body, attachments, is_internal)
       values ($1, 'admin', $2, $3, '[]'::jsonb, $4)`,
      [ticket.id, adminUserId, body.trim(), options.internal === true],
    );

    // An internal note is not an answer: the customer is still waiting.
    await client.query(
      `update tickets
          set status = case when $2 then status else 'answered' end,
              assigned_admin_id = coalesce(assigned_admin_id, $3),
              last_message_at = now()
        where id = $1`,
      [ticket.id, options.internal === true, adminUserId],
    );
  });

  if (!options.internal && ticket.user_id) {
    // The customer hears about it in the app; a notification never fails the reply.
    await (options.notify ?? createNotifier())({
      userId: ticket.user_id,
      type: 'ticket.replied',
      title: 'ردينا على تذكرتك',
      body: ticket.subject,
      link: `/tickets/${ticket.public_id}`,
    });
  }

  const fresh = await queryOne<TicketRow>('select * from tickets where id = $1', [ticket.id]);
  return publicTicket(fresh ?? ticket);
}

export async function setTicketStatus(publicId: string, status: TicketStatus, options: { notify?: Notifier } = {}): Promise<PublicTicket> {
  const ticket = await queryOne<TicketRow>('select * from tickets where public_id = $1', [publicId]);
  if (!ticket) throw ticketNotFound();

  const updated = await queryOne<TicketRow>(
    `update tickets
        set status = $2,
            closed_at = case when $2 = 'closed' then now() else null end,
            last_message_at = coalesce(last_message_at, now())
      where id = $1
      returning *`,
    [ticket.id, status],
  );

  if (status === 'closed' && ticket.user_id) {
    await (options.notify ?? createNotifier())({
      userId: ticket.user_id,
      type: 'ticket.closed',
      title: 'قفلنا التذكرة',
      body: ticket.subject,
      link: `/tickets/${ticket.public_id}`,
    });
  }

  return publicTicket(updated ?? ticket);
}

export async function assignTicket(publicId: string, adminUserId: string | null): Promise<PublicTicket> {
  const updated = await queryOne<TicketRow>(
    `update tickets set assigned_admin_id = $2 where public_id = $1 returning *`,
    [publicId, adminUserId],
  );
  if (!updated) throw ticketNotFound();
  return publicTicket(updated);
}

/**
 * The staff queue: work waiting on us first (oldest first, so nothing is forgotten), then what we
 * already handled newest-first. One ordering cannot serve both — ascending alone buries a ticket we
 * just answered behind the whole archive, descending alone lets an old ticket rot at the bottom.
 */
export async function listTicketQueue(
  options: { status?: TicketStatus | null; limit?: number } = {},
): Promise<(PublicTicket & { userId: string | null })[]> {
  const rows = await query<TicketRow & { message_count: number }>(
    `select t.*, (select count(*)::int from ticket_messages m where m.ticket_id = t.id and not m.is_internal) as message_count
       from tickets t
      where ($1::text is null or t.status = $1::ticket_status)
      order by case when t.status in ('open','pending') then 0 else 1 end,
               case when t.status in ('open','pending')
                    then coalesce(t.last_message_at, t.created_at) end asc nulls last,
               coalesce(t.last_message_at, t.created_at) desc
      limit $2`,
    [options.status ?? null, Math.min(Math.max(options.limit ?? 25, 1), 100)],
  );
  return rows.map((row) => ({ ...publicTicket(row, row.message_count), userId: row.user_id }));
}
