import { relations } from 'drizzle-orm';
import { boolean, decimal, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, numeric, index } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['admin', 'user']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'banned']);
export const providerStatusEnum = pgEnum('provider_status', ['active', 'inactive']);
export const categoryStatusEnum = pgEnum('category_status', ['active', 'inactive']);
export const serviceStatusEnum = pgEnum('service_status', ['active', 'inactive']);
export const orderStatusEnum = pgEnum('order_status', ['Pending', 'Processing', 'In Progress', 'Completed', 'Partial', 'Canceled', 'Refunded']);
export const paymentStatusEnum = pgEnum('payment_status', ['Pending', 'Approved', 'Rejected']);
export const ticketStatusEnum = pgEnum('ticket_status', ['Open', 'Answered', 'Closed']);
export const reportStatusEnum = pgEnum('report_status', ['Unresolved', 'Resolved']);
export const raffleStatusEnum = pgEnum('raffle_status', ['Open', 'Closed', 'Drawn']);
export const refillStatusEnum = pgEnum('refill_status', ['Pending', 'Completed', 'Rejected']);
export const contactMessageStatusEnum = pgEnum('contact_message_status', ['New', 'Read', 'Replied']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  uid: text('uid').notNull().unique(),
  referralCode: text('referral_code').unique(),
  referredBy: uuid('referred_by').references(() => users.id),
  role: roleEnum('role').default('user').notNull(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  emailVerificationToken: text('email_verification_token'),
  emailVerificationExpires: timestamp('email_verification_expires'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpires: timestamp('password_reset_expires'),
  balance: decimal('balance', { precision: 12, scale: 4 }).default('0.0000').notNull(),
  apiKey: text('api_key').unique(),
  apiKeyHash: text('api_key_hash').unique(),
  status: userStatusEnum('status').default('active').notNull(),
  gamePoints: integer('game_points').default(0).notNull(),
  gameLastClick: timestamp('game_last_click'),
  lastClaimDate: timestamp('last_claim_date'),
  currentStreak: integer('current_streak').default(0).notNull(),
  keys: integer('keys').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  emailIdx: index('users_email_idx').on(t.email),
  referralCodeIdx: index('users_referral_code_idx').on(t.referralCode),
  referredByIdx: index('users_referred_by_idx').on(t.referredBy),
  emailVerificationTokenIdx: index('users_email_verification_token_idx').on(t.emailVerificationToken),
  passwordResetTokenIdx: index('users_password_reset_token_idx').on(t.passwordResetToken),
}));

export const providers = pgTable('providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  apiUrl: text('api_url').notNull(),
  apiKey: text('api_key').notNull(),
  profitMargin: integer('profit_margin').default(50).notNull(),
  status: providerStatusEnum('status').default('active').notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  status: categoryStatusEnum('status').default('active').notNull(),
});

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').references(() => categories.id).notNull(),
  providerId: uuid('provider_id').references(() => providers.id),
  providerServiceId: text('provider_service_id'),
  name: text('name').notNull(),
  pricePer1k: decimal('price_per_1k', { precision: 12, scale: 4 }).notNull(),
  providerPrice: decimal('provider_price', { precision: 12, scale: 4 }).default('0.0000'),
  providerMeta: jsonb('provider_meta'),
  minQuantity: integer('min_quantity').notNull(),
  maxQuantity: integer('max_quantity').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0).notNull(),
  cashbackPercentage: integer('cashback_percentage').default(0).notNull(),
  refillable: boolean('refillable').default(false).notNull(),
  cancelable: boolean('cancelable').default(false).notNull(),
  status: serviceStatusEnum('status').default('active').notNull(),
}, (t) => ({
  categoryIdx: index('services_category_idx').on(t.categoryId),
  providerIdx: index('services_provider_idx').on(t.providerId),
  statusIdx: index('services_status_idx').on(t.status),
}));

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  serviceId: uuid('service_id').references(() => services.id).notNull(),
  link: text('link').notNull(),
  quantity: integer('quantity').notNull(),
  charge: decimal('charge', { precision: 12, scale: 4 }).notNull(),
  cost: decimal('cost', { precision: 12, scale: 4 }).default('0.0000').notNull(),
  status: orderStatusEnum('status').default('Pending').notNull(),
  providerOrderId: text('provider_order_id'),
  providerError: text('provider_error'),
  startCount: integer('start_count').default(0).notNull(),
  remains: integer('remains').default(0).notNull(),
  cancelRequested: boolean('cancel_requested').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  userIdx: index('orders_user_idx').on(t.userId),
  serviceIdx: index('orders_service_idx').on(t.serviceId),
  statusIdx: index('orders_status_idx').on(t.status),
  providerOrderIdx: index('orders_provider_order_idx').on(t.providerOrderId),
  createdAtIdx: index('orders_created_at_idx').on(t.createdAt),
}));

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  amount: decimal('amount', { precision: 12, scale: 4 }).notNull(),
  method: text('method').notNull(),
  status: paymentStatusEnum('status').default('Pending').notNull(),
  transactionId: text('transaction_id').unique(),
  transactionDetails: jsonb('transaction_details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
}, (t) => ({
  userIdx: index('payments_user_idx').on(t.userId),
  statusIdx: index('payments_status_idx').on(t.status),
  transactionIdIdx: index('payments_transaction_id_idx').on(t.transactionId),
  createdAtIdx: index('payments_created_at_idx').on(t.createdAt),
}));

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  subject: text('subject').notNull(),
  status: ticketStatusEnum('status').default('Open').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  userIdx: index('tickets_user_idx').on(t.userId),
  statusIdx: index('tickets_status_idx').on(t.status),
}));

export const ticketMessages = pgTable('ticket_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').references(() => tickets.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  message: text('message').notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  ticketIdx: index('ticket_messages_ticket_idx').on(t.ticketId),
  senderIdx: index('ticket_messages_sender_idx').on(t.senderId),
}));

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminId: uuid('admin_id').references(() => users.id).notNull(),
  actionType: text('action_type').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  adminIdx: index('audit_logs_admin_idx').on(t.adminId),
  entityIdx: index('audit_logs_entity_idx').on(t.entityType, t.entityId),
  createdAtIdx: index('audit_logs_created_at_idx').on(t.createdAt),
}));

export const systemReports = pgTable('system_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  errorReason: text('error_reason').notNull(),
  location: text('location').notNull(),
  details: text('details'),
  status: reportStatusEnum('status').default('Unresolved').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  userIdx: index('system_reports_user_idx').on(t.userId),
  statusIdx: index('system_reports_status_idx').on(t.status),
}));

export const shortlinks = pgTable('shortlinks', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  rewardAmount: numeric('reward_amount').notNull(),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const shortlinkClaims = pgTable('shortlink_claims', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  shortlinkId: uuid('shortlink_id').references(() => shortlinks.id).notNull(),
  claimedAt: timestamp('claimed_at').defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.userId, t.shortlinkId),
  userIdx: index('shortlink_claims_user_idx').on(t.userId),
  shortlinkIdx: index('shortlink_claims_shortlink_idx').on(t.shortlinkId),
}));

export const shortlinkTokens = pgTable('shortlink_tokens', {
  token: text('token').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  shortlinkId: uuid('shortlink_id').references(() => shortlinks.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
}, (t) => ({
  userIdx: index('shortlink_tokens_user_idx').on(t.userId),
  shortlinkIdx: index('shortlink_tokens_shortlink_idx').on(t.shortlinkId),
  expiresAtIdx: index('shortlink_tokens_expires_idx').on(t.expiresAt),
}));

export const raffles = pgTable('raffles', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull().default('Weekly Raffle'),
  prizeAmount: numeric('prize_amount', { precision: 12, scale: 4 }).notNull(),
  ticketPrice: numeric('ticket_price', { precision: 12, scale: 4 }).notNull(),
  maxTickets: integer('max_tickets'),
  maxTicketsPerUser: integer('max_tickets_per_user'),
  status: raffleStatusEnum('status').default('Open').notNull(),
  endDate: timestamp('end_date').notNull(),
  winnerId: uuid('winner_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  statusIdx: index('raffles_status_idx').on(t.status),
  endDateIdx: index('raffles_end_date_idx').on(t.endDate),
}));

export const raffleTickets = pgTable('raffle_tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  raffleId: uuid('raffle_id').references(() => raffles.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  raffleIdx: index('raffle_tickets_raffle_idx').on(t.raffleId),
  userIdx: index('raffle_tickets_user_idx').on(t.userId),
}));

export const mysteryBoxTiers = pgTable('mystery_box_tiers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  minAmount: numeric('min_amount', { precision: 12, scale: 4 }).notNull(),
  maxAmount: numeric('max_amount', { precision: 12, scale: 4 }).notNull(),
  probability: integer('probability').notNull(),
  status: text('status').default('active').notNull(),
});

export const walletLedger = pgTable('wallet_ledger', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  amount: numeric('amount', { precision: 12, scale: 4 }).notNull(),
  type: text('type').notNull(),
  description: text('description').notNull(),
  referenceId: text('reference_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  userIdx: index('wallet_ledger_user_idx').on(t.userId),
  referenceIdx: index('wallet_ledger_reference_idx').on(t.referenceId),
  createdAtIdx: index('wallet_ledger_created_at_idx').on(t.createdAt),
}));

export const referralClicks = pgTable('referral_clicks', {
  id: uuid('id').primaryKey().defaultRandom(),
  referralCode: text('referral_code').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  codeIdx: index('referral_clicks_code_idx').on(t.referralCode),
  createdAtIdx: index('referral_clicks_created_at_idx').on(t.createdAt),
}));

export const affiliateCommissions = pgTable('affiliate_commissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  affiliateId: uuid('affiliate_id').references(() => users.id).notNull(),
  referredUserId: uuid('referred_user_id').references(() => users.id).notNull(),
  paymentId: uuid('payment_id').references(() => payments.id).notNull().unique(),
  amount: decimal('amount', { precision: 12, scale: 4 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  affiliateIdx: index('affiliate_commissions_affiliate_idx').on(t.affiliateId),
  referredIdx: index('affiliate_commissions_referred_idx').on(t.referredUserId),
  paymentIdx: index('affiliate_commissions_payment_idx').on(t.paymentId),
}));

export const contactMessages = pgTable('contact_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: contactMessageStatusEnum('status').default('New').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  emailIdx: index('contact_messages_email_idx').on(t.email),
  statusIdx: index('contact_messages_status_idx').on(t.status),
  createdAtIdx: index('contact_messages_created_at_idx').on(t.createdAt),
}));

export const refillRequests = pgTable('refill_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  providerRefillId: text('provider_refill_id'),
  status: refillStatusEnum('status').default('Pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  orderIdx: index('refill_requests_order_idx').on(t.orderId),
  userIdx: index('refill_requests_user_idx').on(t.userId),
  statusIdx: index('refill_requests_status_idx').on(t.status),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  category: one(categories, {
    fields: [services.categoryId],
    references: [categories.id],
  }),
  provider: one(providers, {
    fields: [services.providerId],
    references: [providers.id],
  })
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  service: one(services, {
    fields: [orders.serviceId],
    references: [services.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  })
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  })
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  services: many(services),
}));

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}));

export const rafflesRelations = relations(raffles, ({ one, many }) => ({
  winner: one(users, {
    fields: [raffles.winnerId],
    references: [users.id],
  }),
  tickets: many(raffleTickets),
}));
export const raffleTicketsRelations = relations(raffleTickets, ({ one }) => ({
  raffle: one(raffles, {
    fields: [raffleTickets.raffleId],
    references: [raffles.id],
  }),
  user: one(users, {
    fields: [raffleTickets.userId],
    references: [users.id],
  }),
}));
export const shortlinkClaimsRelations = relations(shortlinkClaims, ({ one }) => ({
  shortlink: one(shortlinks, {
    fields: [shortlinkClaims.shortlinkId],
    references: [shortlinks.id],
  }),
  user: one(users, {
    fields: [shortlinkClaims.userId],
    references: [users.id],
  }),
}));

export const refillRequestsRelations = relations(refillRequests, ({ one }) => ({
  order: one(orders, { fields: [refillRequests.orderId], references: [orders.id] }),
  user: one(users, { fields: [refillRequests.userId], references: [users.id] }),
}));
