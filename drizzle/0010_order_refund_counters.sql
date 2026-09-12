-- Track refunds already returned to prevent full-refund mistakes on partial provider cancellations.
ALTER TABLE IF EXISTS orders
  ADD COLUMN IF NOT EXISTS refunded_amount numeric(12,4) NOT NULL DEFAULT 0.0000;

UPDATE orders
SET refunded_amount = charge
WHERE status = 'Refunded' AND (refunded_amount IS NULL OR refunded_amount = 0);
