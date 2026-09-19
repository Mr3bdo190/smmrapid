/**
 * The shapes the API actually returns, as the browser uses them.
 *
 * Only what a screen reads is listed — an endpoint that grows a field does not force a change here,
 * and a field that is missing from this file is one no screen is allowed to depend on.
 */

export type PriceUnit = 'per_1000' | 'per_item';
export type InputType = 'link' | 'text' | 'list' | 'email' | 'username' | 'number' | 'custom';

export type ServiceVariant = {
  id: string;
  name: string;
  nameAr: string | null;
  priceMinor: number;
  minQuantity: number;
  maxQuantity: number;
};

export type PublicService = {
  id: string;
  slug: string;
  name: string;
  nameAr: string | null;
  category: { slug: string; name: string; nameAr: string | null };
  priceUnit: PriceUnit;
  priceMinor: number;
  minQuantity: number;
  maxQuantity: number;
  currency: string;
  orderMinMinor: number;
  inputType: InputType;
  supportsRefill: boolean;
  supportsCancel: boolean;
  supportsDripFeed: boolean;
  estimatedTime: string | null;
  variants: ServiceVariant[];
};

export type PublicCategory = {
  slug: string;
  name: string;
  nameAr: string | null;
  iconKey: string | null;
  serviceCount: number;
};

export type ServiceListResponse = {
  services: PublicService[];
  total: number;
  page: number;
  pageSize: number;
  currency: string | null;
};

export type OrderStatus =
  | 'pending'
  | 'in_progress'
  | 'processing'
  | 'completed'
  | 'partial'
  | 'canceled'
  | 'refunded'
  | 'failed';

export type PublicOrder = {
  publicId: string;
  status: OrderStatus;
  service: { slug: string; name: string; nameAr: string | null };
  variant: { id: string; name: string } | null;
  target: string;
  quantity: number;
  chargeMinor: number;
  discountMinor: number;
  totalMinor: number;
  refundedMinor: number;
  currency: string;
  dripFeed: boolean;
  startCount: number | null;
  remains: number | null;
  createdAt: string;
  updatedAt?: string;
  providerOrderId?: string | null;
};

export type OrderQuote = {
  service: { id: string; slug: string; name: string; nameAr: string | null; inputType: InputType };
  variant: { id: string; name: string; nameAr: string | null } | null;
  quantity: number;
  priceUnit: PriceUnit;
  unitPriceMinor: number;
  chargeMinor: number;
  discountMinor: number;
  totalMinor: number;
  currency: string;
  limits: { minQuantity: number; maxQuantity: number; orderMinMinor: number };
  coupon: { code: string; type: string } | null;
  quotedAt: string;
};

export type WalletSummary = {
  /** Spendable balance, straight from the wallet row. */
  balanceMinor: number;
  currency: string;
  /** Requested or paid but not credited yet — pending top-ups. */
  pendingMinor: number;
  updatedAt: string | null;
};

export type LedgerMovementType = 'deposit' | 'order' | 'refund' | 'adjustment' | 'hold' | 'release' | 'bonus' | 'referral' | 'payout';

export type LedgerEntry = {
  id: string;
  direction: 'credit' | 'debit';
  type: LedgerMovementType;
  /** Signed: a credit is positive, a debit is negative. Always an integer. */
  amountMinor: number;
  balanceAfterMinor: number;
  currency: string;
  description: string | null;
  createdAt: string;
  orderId: string | null;
  paymentId: string | null;
  commissionId: string | null;
  idempotencyKey: string | null;
};

export type NotificationType =
  | 'order.completed'
  | 'order.partial'
  | 'order.failed'
  | 'order.refunded'
  | 'payment.approved'
  | 'ticket.answered'
  | 'ticket.closed'
  | 'system';

export type PublicNotification = {
  id: string;
  type: NotificationType | string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export type TicketStatus = 'open' | 'pending' | 'answered' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type PublicTicket = {
  publicId: string;
  subject: string;
  category: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  messageCount?: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt?: string;
  closedAt?: string | null;
};

export type TicketMessage = {
  id: string;
  authorType: 'user' | 'admin' | 'system';
  authorName: string | null;
  body: string;
  createdAt: string;
};

export type TicketDetail = PublicTicket & { messages: TicketMessage[] };

export type PaymentGatewayKey = 'shahnawy' | 'heleket';
export type ShahnawyMethod = 'vf_cash' | 'or_cash' | 'et_cash';
export type DepositStatus = 'pending' | 'completed' | 'rejected' | 'expired';

export type GatewayInfo = {
  key: PaymentGatewayKey;
  currency: string;
  methods: string[];
  minMinor: number;
  maxMinor: number;
  configured: boolean;
};

export type PublicPayment = {
  publicId: string;
  gateway: PaymentGatewayKey;
  method: string | null;
  status: DepositStatus;
  currency: string;
  amountMinor: number;
  gatewayCurrency: string | null;
  gatewayAmountMinor: number | null;
  fxRate: number | null;
  payUrl: string | null;
  instructions: string | null;
  walletNumber: string | null;
  createdAt: string;
  resolvedAt: string | null;
};
