import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { createAuthGuards } from '../auth/middleware.js';
import { createNotifier } from './service.js';
import {
  addCustomerMessage,
  assignTicket,
  closeOwnTicket,
  createTicket,
  getTicket,
  listNotifications,
  listTicketQueue,
  listTickets,
  markAllRead,
  markRead,
  setTicketStatus,
  staffReply,
  unreadCount,
} from './service.js';
import { TICKET_STATUSES, type TicketsDeps } from './types.js';

/**
 * Support and notifications.
 *
 * Everything a customer can read is scoped to them: a ticket is only visible to its owner, and staff
 * notes (`is_internal`) are filtered out for everybody else. Answers always say whose turn it is —
 * `open` means the customer is waiting, `answered` means we replied, `pending` means we are waiting
 * on them.
 */

const writeLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many messages in a short time. Wait a moment and try again.' } },
});

const TICKET_ID = /^TKT[0-9A-F]{10}$/;
const ticketIdParam = z.object({ publicId: z.string().trim().regex(TICKET_ID, 'must look like TKT0123456789') });
const notificationIdParam = z.object({ id: z.string().trim().regex(/^[0-9]{1,19}$/, 'must be a notification id') });

const createSchema = z
  .object({
    subject: z.string().trim().min(3).max(200),
    body: z.string().trim().min(1).max(10_000),
    category: z.string().trim().max(40).optional(),
  })
  .strict();

const messageSchema = z.object({ body: z.string().trim().min(1).max(10_000) }).strict();
const staffReplySchema = z.object({ body: z.string().trim().min(1).max(10_000), internal: z.boolean().optional() }).strict();
const statusSchema = z.object({ status: z.enum(TICKET_STATUSES) }).strict();
const assignSchema = z.object({ adminUserId: z.string().uuid().nullable() }).strict();

export function createTicketsModule(deps: TicketsDeps): { router: Router; adminRouter: Router } {
  const guards = createAuthGuards(deps.auth);
  const notify = deps.notify ?? createNotifier();
  const router = Router();
  const adminRouter = Router();

  /* ── notifications ──────────────────────────────────────────────────────────────────────────── */

  router.get('/notifications', guards.requireAuth, async (req, res, next) => {
    try {
      const [notifications, unread] = await Promise.all([
        listNotifications(req.auth!.user.id),
        unreadCount(req.auth!.user.id),
      ]);
      res.json({ success: true, data: { notifications, unread } });
    } catch (error) {
      next(error);
    }
  });

  router.post('/notifications/read-all', guards.requireAuth, async (req, res, next) => {
    try {
      const marked = await markAllRead(req.auth!.user.id);
      res.json({ success: true, data: { marked, unread: 0 } });
    } catch (error) {
      next(error);
    }
  });

  router.post('/notifications/:id/read', guards.requireAuth, validateParams(notificationIdParam), async (req, res, next) => {
    try {
      const notifications = await markRead(req.auth!.user.id, String(req.params.id));
      res.json({ success: true, data: { notifications, unread: await unreadCount(req.auth!.user.id) } });
    } catch (error) {
      next(error);
    }
  });

  /* ── the customer's tickets ─────────────────────────────────────────────────────────────────── */

  router.post('/tickets', writeLimiter, guards.requireAuth, validateBody(createSchema), async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createSchema>;
      const ticket = await createTicket({
        userId: req.auth!.user.id,
        subject: body.subject,
        body: body.body,
        category: body.category ?? null,
      });
      res.status(201).json({ success: true, data: { ticket } });
    } catch (error) {
      next(error);
    }
  });

  router.get('/tickets', guards.requireAuth, async (req, res, next) => {
    try {
      res.json({ success: true, data: { tickets: await listTickets(req.auth!.user.id) } });
    } catch (error) {
      next(error);
    }
  });

  router.get('/tickets/:publicId', guards.requireAuth, validateParams(ticketIdParam), async (req, res, next) => {
    try {
      res.json({ success: true, data: { ticket: await getTicket(req.auth!.user.id, String(req.params.publicId)) } });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/tickets/:publicId/messages',
    writeLimiter,
    guards.requireAuth,
    validateParams(ticketIdParam),
    validateBody(messageSchema),
    async (req, res, next) => {
      try {
        const { body } = req.body as z.infer<typeof messageSchema>;
        const ticket = await addCustomerMessage(req.auth!.user.id, String(req.params.publicId), body);
        res.status(201).json({ success: true, data: { ticket } });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post('/tickets/:publicId/close', guards.requireAuth, validateParams(ticketIdParam), async (req, res, next) => {
    try {
      const ticket = await closeOwnTicket(req.auth!.user.id, String(req.params.publicId));
      res.json({ success: true, data: { ticket } });
    } catch (error) {
      next(error);
    }
  });

  /* ── staff ──────────────────────────────────────────────────────────────────────────────────── */

  adminRouter.get('/tickets', guards.requireAuth, guards.requirePermission('tickets.view'), async (req, res, next) => {
    try {
      const status = typeof req.query.status === 'string' && TICKET_STATUSES.includes(req.query.status as never)
        ? (req.query.status as (typeof TICKET_STATUSES)[number])
        : null;
      res.json({ success: true, data: { tickets: await listTicketQueue({ status }) } });
    } catch (error) {
      next(error);
    }
  });

  adminRouter.post(
    '/tickets/:publicId/reply',
    writeLimiter,
    guards.requireAuth,
    guards.requirePermission('tickets.reply'),
    validateParams(ticketIdParam),
    validateBody(staffReplySchema),
    async (req, res, next) => {
      try {
        const { body, internal } = req.body as z.infer<typeof staffReplySchema>;
        const ticket = await staffReply(String(req.params.publicId), req.auth!.user.id, body, { internal, notify });
        res.status(201).json({ success: true, data: { ticket } });
      } catch (error) {
        next(error);
      }
    },
  );

  adminRouter.post(
    '/tickets/:publicId/status',
    guards.requireAuth,
    validateParams(ticketIdParam),
    validateBody(statusSchema),
    async (req, res, next) => {
      // Closing needs `tickets.close`; any other transition is a reply-level action.
      const { status } = req.body as z.infer<typeof statusSchema>;
      const needed = status === 'closed' ? 'tickets.close' : 'tickets.reply';
      return guards.requirePermission(needed)(req, res, async (error?: unknown) => {
        if (error) return next(error);
        try {
          const ticket = await setTicketStatus(String(req.params.publicId), status, { notify });
          res.json({ success: true, data: { ticket } });
        } catch (caught) {
          next(caught);
        }
      });
    },
  );

  adminRouter.post(
    '/tickets/:publicId/assign',
    guards.requireAuth,
    guards.requirePermission('tickets.assign'),
    validateParams(ticketIdParam),
    validateBody(assignSchema),
    async (req, res, next) => {
      try {
        const { adminUserId } = req.body as z.infer<typeof assignSchema>;
        const ticket = await assignTicket(String(req.params.publicId), adminUserId);
        res.json({ success: true, data: { ticket } });
      } catch (error) {
        next(error);
      }
    },
  );

  return { router, adminRouter };
}
