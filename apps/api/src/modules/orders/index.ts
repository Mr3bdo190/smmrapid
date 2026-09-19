import { quote } from '../pricing/service.js';
import { applyWalletMovement } from '../wallet/service.js';
import type { OrderDeps } from './types.js';

export { createOrdersModule } from './routes.js';
export { createOrder, getOrder, listOrders, normalizeTarget, parseListQuery, repeatOrder } from './service.js';
export { orderDbDeps };
export {
  ORDER_ERROR_CODES,
  orderDuplicateTarget,
  orderIdempotencyConflict,
  orderNotFound,
  orderNotRepeatable,
  orderTargetInvalid,
} from './errors.js';
export type {
  CreateOrderInput,
  CreateOrderResult,
  OrderDetail,
  OrderDeps,
  OrderListPage,
  OrderModuleDeps,
  OrderStatus,
  OrderTimelineEntry,
  PublicOrder,
  RepeatOrderResult,
} from './types.js';

/**
 * The production wiring of the two module boundaries an order needs: the pricing engine for what
 * the customer pays, and the wallet for the only way money moves.
 */
const orderDbDeps: OrderDeps = {
  quote,
  chargeWallet: applyWalletMovement,
};
