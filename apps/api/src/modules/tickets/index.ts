export { createTicketsModule } from './routes.js';
export {
  addCustomerMessage,
  assignTicket,
  closeOwnTicket,
  createNotifier,
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
export { notificationNotFound, ticketNotFound } from './types.js';
export { TICKET_PRIORITIES, TICKET_STATUSES } from './types.js';
export type { CreateTicketInput } from './service.js';
export type {
  NotificationType,
  Notifier,
  NotifyInput,
  PublicNotification,
  PublicTicket,
  PublicTicketMessage,
  TicketDetail,
  TicketStatus,
  TicketsDeps,
} from './types.js';
