import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteBuy, quoteSell, sellInitialsFraction } from '../src/engine/fills.js';

const S = { platformFeePct: 1, priorityFeeSol: 0.005, slippagePct: 1 };
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('buy applies fee, priority fee and slippage', () => {
  const q = quoteBuy({ balance: 10, amountSol: 1, priceSol: 1e-6, settings: S });
  assert.equal(q.ok, true);
  close(q.cost, 1.005); close(q.platformFee, 0.01); close(q.priorityFee, 0.005);
  close(q.fillPriceSol, 1.01e-6, 1e-15);
  close(q.tokens, 0.99 / 1.01e-6, 1e-3);
});
test('buy rejects bad input', () => {
  assert.equal(quoteBuy({ balance: 1, amountSol: 1, priceSol: 1e-6, settings: S }).error, 'Not enough SOL');
  assert.equal(quoteBuy({ balance: 10, amountSol: 0, priceSol: 1e-6, settings: S }).ok, false);
  assert.equal(quoteBuy({ balance: 10, amountSol: 1, priceSol: 0, settings: S }).error, 'No price');
});
test('sell all at same price', () => {
  const tokens = 0.99 / 1.01e-6;
  const q = quoteSell({ tokensHeld: tokens, fraction: 1, priceSol: 1e-6, settings: S });
  const gross = tokens * 0.99e-6;
  close(q.tokensOut, tokens); close(q.proceeds, gross - gross * 0.01 - 0.005);
});
test('sell half and bad fractions', () => {
  assert.equal(quoteSell({ tokensHeld: 100, fraction: 0.5, priceSol: 1, settings: S }).tokensOut, 50);
  assert.equal(quoteSell({ tokensHeld: 100, fraction: 0, priceSol: 1, settings: S }).ok, false);
  assert.equal(quoteSell({ tokensHeld: 100, fraction: 1.5, priceSol: 1, settings: S }).ok, false);
  assert.equal(quoteSell({ tokensHeld: 0, fraction: 1, priceSol: 1, settings: S }).error, 'Nothing to sell');
});
test('proceeds floored at zero', () => {
  assert.equal(quoteSell({ tokensHeld: 1, fraction: 1, priceSol: 1e-9, settings: S }).proceeds, 0);
});
test('sell initials returns invested minus sold', () => {
  const tokens = 0.99 / 1.01e-6;
  const f = sellInitialsFraction({ invested: 1.005, sold: 0, tokensHeld: tokens, priceSol: 2e-6, settings: S });
  assert.ok(f > 0 && f < 1);
  const q = quoteSell({ tokensHeld: tokens, fraction: f, priceSol: 2e-6, settings: S });
  close(q.proceeds, 1.005);
});
test('sell initials edge cases', () => {
  assert.equal(sellInitialsFraction({ invested: 1, sold: 1, tokensHeld: 10, priceSol: 1, settings: S }), null);
  assert.equal(sellInitialsFraction({ invested: 1, sold: 0, tokensHeld: 10, priceSol: 1e-6, settings: S }), 1);
});
