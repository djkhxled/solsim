import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteBuy, quoteSell, sellInitialsFraction, FALLBACK_IMPACT_PCT } from '../src/engine/fills.js';

const S = { platformFeePct: 1, priorityFeeSol: 0.001, slippagePct: 20 };
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('buy impact comes from pool size, not the slippage setting', () => {
  const q = quoteBuy({ balance: 10, amountSol: 1, priceSol: 1e-6, poolSol: 99, settings: S });
  assert.equal(q.ok, true);
  close(q.cost, 1.001); close(q.platformFee, 0.01); close(q.priorityFee, 0.001);
  close(q.impactPct, 1); // 0.99 SOL into a 99 SOL pool
  close(q.fillPriceSol, 1.01e-6, 1e-15);
  close(q.tokens, 0.99 / 1.01e-6, 1e-3);
});
test('a high slippage setting is a limit, not a charge', () => {
  const q = quoteBuy({ balance: 10, amountSol: 0.1, priceSol: 1e-6, poolSol: 1000, settings: { ...S, slippagePct: 25 } });
  assert.ok(q.impactPct < 0.01, `impact ${q.impactPct}`);
  assert.ok(q.fillPriceSol < 1e-6 * 1.0001);
});
test('unknown pool falls back to a small fixed impact', () => {
  const q = quoteBuy({ balance: 10, amountSol: 1, priceSol: 1e-6, poolSol: null, settings: S });
  close(q.impactPct, FALLBACK_IMPACT_PCT);
});
test('buy fails when impact is over the slippage limit', () => {
  const q = quoteBuy({ balance: 10, amountSol: 5, priceSol: 1e-6, poolSol: 10, settings: S });
  assert.equal(q.ok, false);
  assert.match(q.error, /slippage/);
});
test('buy rejects bad input', () => {
  assert.equal(quoteBuy({ balance: 1, amountSol: 1, priceSol: 1e-6, settings: S }).error, 'Not enough SOL');
  assert.equal(quoteBuy({ balance: 10, amountSol: 0, priceSol: 1e-6, settings: S }).ok, false);
  assert.equal(quoteBuy({ balance: 10, amountSol: 1, priceSol: 0, settings: S }).error, 'No price');
});
test('sell all into a pool', () => {
  const q = quoteSell({ tokensHeld: 1e6, fraction: 1, priceSol: 1e-6, poolSol: 100, settings: S });
  const gross = 1 / 1.01; // 1 SOL of tokens into a 100 SOL pool
  close(q.tokensOut, 1e6); close(q.impactPct, 1); close(q.proceeds, gross * 0.99 - 0.001);
});
test('sell fails when impact is over the slippage limit', () => {
  const q = quoteSell({ tokensHeld: 1e6, fraction: 1, priceSol: 1e-6, poolSol: 1, settings: S });
  assert.equal(q.ok, false);
  assert.match(q.error, /slippage/);
});
test('sell half and bad fractions', () => {
  assert.equal(quoteSell({ tokensHeld: 100, fraction: 0.5, priceSol: 1, poolSol: 1e9, settings: S }).tokensOut, 50);
  assert.equal(quoteSell({ tokensHeld: 100, fraction: 0, priceSol: 1, settings: S }).ok, false);
  assert.equal(quoteSell({ tokensHeld: 100, fraction: 1.5, priceSol: 1, settings: S }).ok, false);
  assert.equal(quoteSell({ tokensHeld: 0, fraction: 1, priceSol: 1, settings: S }).error, 'Nothing to sell');
});
test('proceeds floored at zero', () => {
  assert.equal(quoteSell({ tokensHeld: 1, fraction: 1, priceSol: 1e-9, settings: S }).proceeds, 0);
});
for (const poolSol of [100, null]) {
  test(`sell initials returns invested minus sold (pool ${poolSol})`, () => {
    const tokens = 0.99 / 1.01e-6;
    const f = sellInitialsFraction({ invested: 1.001, sold: 0, tokensHeld: tokens, priceSol: 2e-6, poolSol, settings: S });
    assert.ok(f > 0 && f < 1);
    const q = quoteSell({ tokensHeld: tokens, fraction: f, priceSol: 2e-6, poolSol, settings: S });
    close(q.proceeds, 1.001);
  });
}
test('sell initials edge cases', () => {
  assert.equal(sellInitialsFraction({ invested: 1, sold: 1, tokensHeld: 10, priceSol: 1, settings: S }), null);
  assert.equal(sellInitialsFraction({ invested: 1, sold: 0, tokensHeld: 10, priceSol: 1e-6, settings: S }), 1);
});
