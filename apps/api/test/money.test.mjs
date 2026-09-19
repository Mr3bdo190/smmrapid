import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMarkup, chargeFor, formatMinor, fromMinor, percentOf, toMinor } from '../dist/lib/money.js';

/**
 * Money arithmetic is the one place where a rounding mistake becomes a wrong balance, so the
 * helpers are tested directly — including the awkward decimal cases that break float maths.
 */

test('toMinor converts decimal amounts without float drift', () => {
  assert.equal(toMinor('1'), 100);
  assert.equal(toMinor('0.01'), 1);
  assert.equal(toMinor('12.34'), 1234);
  assert.equal(toMinor('-2.5'), -250);
  assert.equal(toMinor(12.3456), 1235);

  // the classic float trap: 0.1 + 0.2 must be exactly 30 minor units
  assert.equal(toMinor('0.1') + toMinor('0.2'), toMinor('0.3'));

  // half-up on the decimal string, not on a binary approximation
  assert.equal(toMinor('1.004'), 100);
  assert.equal(toMinor('1.005'), 101);
  assert.equal(toMinor('0.005'), 1);
});

test('toMinor refuses anything that is not a decimal amount', () => {
  assert.throws(() => toMinor('12,5'));
  assert.throws(() => toMinor('abc'));
  assert.throws(() => toMinor(Number.NaN));
  assert.throws(() => toMinor(Number.POSITIVE_INFINITY));
});

test('formatMinor and fromMinor are display helpers', () => {
  assert.equal(formatMinor(1235), '12.35');
  assert.equal(formatMinor(100), '1.00');
  assert.equal(formatMinor(0), '0.00');
  assert.equal(formatMinor(-5), '-0.05');
  assert.equal(fromMinor(1235), 12.35);
});

test('chargeFor prices per 1000 and per item, rounding once', () => {
  assert.equal(chargeFor(100, 400, 'per_1000'), 40);
  assert.equal(chargeFor(5000, 12000, 'per_1000'), 60000);
  assert.equal(chargeFor(1, 45000, 'per_item'), 45000);
  assert.equal(chargeFor(3, 1500, 'per_item'), 4500);

  // 777 * 3333 / 1000 = 2589.741 → 2590, and never a fractional cent
  const odd = chargeFor(3333, 777, 'per_1000');
  assert.equal(odd, 2590);
  assert.ok(Number.isInteger(odd));

  assert.throws(() => chargeFor(0, 100, 'per_1000'));
  assert.throws(() => chargeFor(-5, 100, 'per_1000'));
  assert.throws(() => chargeFor(10, 1.5, 'per_1000'));
});

test('markup helpers keep percentages and fixed amounts separate', () => {
  assert.equal(percentOf(1000, 30), 300);
  assert.equal(percentOf(999, 33), 330);
  assert.equal(applyMarkup(1000, 30), 1300);
  assert.equal(applyMarkup(1000, 0, 250), 1250);
  assert.equal(applyMarkup(1000, 30, 250), 1550);
  assert.ok(Number.isInteger(applyMarkup(1234, 17.5)));
});
