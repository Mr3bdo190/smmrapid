import { AppError } from '../../middleware/error-handler.js';
import type { AuthDeps } from '../auth/types.js';

/**
 * Support tickets and in-app notifications.
 *
 * A ticket is a conversation with a paper trail: every message is stored with who wrote it and when,
 * internal staff notes never reach the customer, and a reply always leaves the ticket in a state that
 * says whose turn it is.
 */

export const TICKET_STATUSES = ['open', 'pending', 'answered', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export type TicketAuthorType = 'user' | 'admin' | 'system';

export const NOTIFICATION_TYPES = [
  'order.created',
  'order.submitted',
  'order.completed',
  'order.failed',
  'order.refunded',
  'payment.approved',
  'payment.rejected',
  'ticket.replied',
  'ticket.closed',
  'wallet.credited',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number] | string;

export type TicketRow = {
  id: string;
  public_id: string;
  user_id: string | null;
  subject: string;
  category: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_admin_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

export type TicketMessageRow = {
  id: string;
  ticket_id: string;
  author_type: TicketAuthorType;
  author_user_id: string | null;
  body: string;
  attachments: unknown;
  is_internal: boolean;
  created_at: string;
};

export type PublicTicketMessage = {
  id: string;
  authorType: TicketAuthorType;
  authorName: string | null;
  body: string;
  attachments: unknown[];
  createdAt: string;
};

export type PublicTicket = {
  publicId: string;
  subject: string;
  category: string | null;
  status: TicketStatus;
  /** Only staff-facing tickets carry a priority the customer set. */
  priority: TicketPriority;
  assigned: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  closedAt: string | null;
  messageCount?: number;
};

export type TicketDetail = PublicTicket & { messages: PublicTicketMessage[] };

export type PublicNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
};

/**
 * The notification sink. Other modules call this; it never throws into a money path, because a
 * notification that cannot be written must never fail an order or a deposit.
 */
export type Notifier = (input: NotifyInput) => Promise<void>;

export type TicketsDeps = {
  auth: AuthDeps;
  /** Defaults to writing the notifications table; tests inject a recorder. */
  notify?: Notifier;
  /** True when staff may attach internal notes visible only to admins. */
  staff?: boolean;
};

export type TicketErrorCode = string;

export const ticketNotFound = () =>
  new AppError('TICKET_NOT_FOUND', 'We could not find this ticket on your account.', 404);

export const notificationNotFound = () =>
  new AppError('NOTIFICATION_NOT_FOUND', 'We could not find that notification.', 404);
