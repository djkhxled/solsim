import test from 'node:test';
import assert from 'node:assert/strict';
import { newPosition, applyBuy, applySell, positionStats, openPositionFor, latestPositionFor } from '../src/engine/positions.js';

const S = { platformFeePct: 1, priorityFeeSol: 0.005, slippagePct: 1 };
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const base = () => newPosition({ id: 'p1', mint: 'm', coin: { symbol: 'AMD', logo: 'L', totalSupply: 1e9 }, now: 5 });

test('newPosition defaults', () => {
  const p = base();
  assert.equal(p.status, 'open'); assert.equal(p.invested, 0); assert.equal(p.name, 'AMD'); assert.equal(p.openedAt, 5);
  assert.equal(newPosition({ id: 'x', mint: 'm', coin: {}, now: 0 }).symbol, '???');
});
test('buy then partial and full sell', () => {
  let p = applyBuy(base(), { cost: 1.005, tokens: 1000 });
  p = applyBuy(p, { cost: 0.5, tokens: 500 });
  assert.equal(p.tokens, 1500); close(p.invested, 1.505); assert.equal(p.peakTokens, 1500);
  p = applySell(p, { tokensOut: 750, proceeds: 1 }, 9);
  assert.equal(p.status, 'open'); assert.equal(p.tokens, 750); assert.equal(p.sold, 1);
  p = applySell(p, { tokensOut: 750, proceeds: 1 }, 10);
  assert.equal(p.status, 'closed'); assert.equal(p.tokens, 0); assert.equal(p.closedAt, 10);
});
test('dust closes the position', () => {
  let p = applyBuy(base(), { cost: 1, tokens: 1e6 });
  p = applySell(p, { tokensOut: 1e6 - 1e-6, proceeds: 1 }, 3);
  assert.equal(p.status, 'closed');
});
test('positionStats', () => {
  const tokens = 0.99 / 1.01e-6;
  const p = applyBuy(base(), { cost: 1.005, tokens });
  const s = positionStats(p, 2e-6);
  close(s.remaining, tokens * 2e-6); close(s.pnlSol, s.remaining - 1.005); close(s.pnlPct, (s.pnlSol / 1.005) * 100);
  assert.equal(positionStats(p, 0).remaining, 0);
});
test('finders', () => {
  const a = { ...base(), id: 'a', status: 'closed', openedAt: 1 };
  const b = { ...base(), id: 'b', status: 'open', openedAt: 2 };
  assert.equal(openPositionFor([a, b], 'm').id, 'b');
  assert.equal(openPositionFor([a], 'm'), null);
  assert.equal(latestPositionFor([a, b], 'm').id, 'b');
  assert.equal(latestPositionFor([], 'm'), null);
});
