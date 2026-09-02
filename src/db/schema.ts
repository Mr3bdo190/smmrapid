import { relations } from 'drizzle-orm';
import { boolean, decimal, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, numeric, unique } from 'drizzle-orm/pg-core';

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

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  uid: text('uid').notNull().unique(),
  referralCode: text('referral_code').unique(),
  referredBy: uuid('referred_by').references(() => users.id),
  role: roleEnum('role').default('user').notNull(),
  name: text('name'),
  email: text('email').notNull().unique(),
  balance: decimal('balance', { precision: 12, scale: 4 }).default('0.0000').notNull(),
  apiKey: text('api_key').unique(),
  status: userStatusEnum('status').default('active').notNull(),
  gamePoints: integer('game_points').default(0).notNull(),
  gameLastClick: timestamp('game_last_click'),
  lastClaimDate: timestamp('last_claim_date'),
  currentStreak: integer('current_streak').default(0).notNull(),
  keys: integer('keys').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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
  minQuantity: integer('min_quantity').notNull(),
  maxQuantity: integer('max_quantity').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0).notNull(),
  cashbackPercentage: integer('cashback_percentage').default(0).notNull(),
  status: serviceStatusEnum('status').default('active').notNull(),
});

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
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

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
});

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  subject: text('subject').notNull(),
  status: ticketStatusEnum('status').default('Open').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const ticketMessages = pgTable('ticket_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').references(() => tickets.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  message: text('message').notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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
});

export const systemReports = pgTable('system_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  errorReason: text('error_reason').notNull(),
  location: text('location').notNull(),
  details: text('details'),
  status: reportStatusEnum('status').default('Unresolved').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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
  unq: unique().on(t.userId, t.shortlinkId)
}));

export const shortlinkTokens = pgTable('shortlink_tokens', {
  token: text('token').primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  shortlinkId: uuid('shortlink_id').references(() => shortlinks.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
});

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
});

export const raffleTickets = pgTable('raffle_tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  raffleId: uuid('raffle_id').references(() => raffles.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const mysteryBoxTiers = pgTable('mystery_box_tiers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  minAmount: numeric('min_amount', { precision: 12, scale: 4 }).notNull(),
  maxAmount: numeric('max_amount', { precision: 12, scale: 4 }).notNull(),
  probability: integer('probability').notNull(),
  status: text('status').default('active').notNull(),
});

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


export const walletLedger = pgTable('wallet_ledger', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  amount: numeric('amount', { precision: 12, scale: 4 }).notNull(),
  type: text('type').notNull(), // 'credit' or 'debit'
  description: text('description').notNull(),
  referenceId: text('reference_id'), // payment_id or order_id
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const referralClicks = pgTable('referral_clicks', {
  id: uuid('id').primaryKey().defaultRandom(),
  referralCode: text('referral_code').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const affiliateCommissions = pgTable('affiliate_commissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  affiliateId: uuid('affiliate_id').references(() => users.id).notNull(),
  referredUserId: uuid('referred_user_id').references(() => users.id).notNull(),
  paymentId: uuid('payment_id').references(() => payments.id).notNull().unique(),
  amount: decimal('amount', { precision: 12, scale: 4 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
