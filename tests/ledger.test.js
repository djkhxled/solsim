import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, initialLedger, executeTrade, addLimit, cancelLimit, fireLimit, resetRun, migrateSettings } from '../src/engine/ledger.js';

const S = DEFAULT_SETTINGS;
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
function mkCtx() {
  let n = 0;
  return (over = {}) => ({ priceUsd: 0.0001, solUsd: 100, source: 'live', now: 1000, settings: S, newId: () => 'id' + ++n, ...over });
}
const buy = (amountSol, coin = { symbol: 'AMD', totalSupply: 1e9 }) => ({ side: 'buy', mint: 'm', amountSol, coin });

test('initial ledger', () => {
  const l = initialLedger(S, 7);
  assert.equal(l.balance, 10); assert.deepEqual(l.positions, []); assert.equal(l.runStartedAt, 7);
});
test('buy opens a position and records a trade', () => {
  const ctx = mkCtx();
  const r = executeTrade(initialLedger(S, 0), buy(1), ctx());
  assert.equal(r.ok, true);
  close(r.ledger.balance, 10 - 1.001);
  assert.equal(r.ledger.positions.length, 1);
  const t = r.trade;
  assert.equal(t.side, 'buy'); assert.equal(t.symbol, 'AMD'); close(t.amountSol, 1.001);
  close(t.mcUsd, 100000, 1e-6); assert.equal(t.source, 'live'); assert.equal(t.posId, r.ledger.positions[0].id);
});
test('second buy reuses the open position and fills in a missing symbol', () => {
  const ctx = mkCtx();
  let r = executeTrade(initialLedger(S, 0), buy(1, {}), ctx());
  assert.equal(r.ledger.positions[0].symbol, '???');
  r = executeTrade(r.ledger, buy(1), ctx());
  assert.equal(r.ledger.positions.length, 1);
  assert.equal(r.ledger.positions[0].symbol, 'AMD');
  close(r.ledger.positions[0].invested, 2.002);
});
test('sell 50% then 100% closes and drops its limits', () => {
  const ctx = mkCtx();
  let r = executeTrade(initialLedger(S, 0), buy(1), ctx());
  const pos = r.ledger.positions[0];
  r = addLimit(r.ledger, { id: 'L', posId: pos.id, mint: 'm', triggerMcUsd: 500000, fraction: 1, currentMcUsd: 100000 });
  r = executeTrade(r.ledger, { side: 'sell', mint: 'm', fraction: 0.5 }, ctx({ priceUsd: 0.0002 }));
  assert.equal(r.ledger.positions[0].status, 'open');
  assert.equal(r.ledger.limits.length, 1);
  r = executeTrade(r.ledger, { side: 'sell', mint: 'm', fraction: 1 }, ctx({ priceUsd: 0.0002 }));
  assert.equal(r.ledger.positions[0].status, 'closed');
  assert.equal(r.ledger.limits.length, 0);
  assert.ok(r.ledger.balance > 10);
});
test('sellInit takes out the initial', () => {
  const ctx = mkCtx();
  let r = executeTrade(initialLedger(S, 0), buy(1), ctx());
  r = executeTrade(r.ledger, { side: 'sellInit', mint: 'm' }, ctx({ priceUsd: 0.0003 }));
  assert.equal(r.ok, true);
  close(r.ledger.positions[0].sold, 1.001);
  assert.equal(executeTrade(r.ledger, { side: 'sellInit', mint: 'm' }, ctx({ priceUsd: 0.0003 })).ok, false);
});
test('errors', () => {
  const ctx = mkCtx();
  const l = initialLedger(S, 0);
  assert.equal(executeTrade(l, { side: 'sell', mint: 'm', fraction: 1 }, ctx()).error, 'No open position');
  assert.equal(executeTrade(l, buy(1), ctx({ priceUsd: 0 })).error, 'No price');
  assert.equal(executeTrade(l, buy(1), ctx({ solUsd: null })).error, 'No price');
  assert.equal(executeTrade(l, buy(50), ctx()).error, 'Not enough SOL');
});
test('limits add, cancel, fire', () => {
  const ctx = mkCtx();
  let r = executeTrade(initialLedger(S, 0), buy(1), ctx());
  const posId = r.ledger.positions[0].id;
  assert.equal(addLimit(r.ledger, { id: 'x', posId: 'nope', mint: 'm', triggerMcUsd: 1, fraction: 1, currentMcUsd: 2 }).ok, false);
  r = addLimit(r.ledger, { id: 'L1', posId, mint: 'm', triggerMcUsd: 200000, fraction: 0.5, currentMcUsd: 100000 });
  assert.equal(r.limit.direction, 'above');
  assert.equal(cancelLimit(r.ledger, 'L1').ledger.limits.length, 0);
  const f = fireLimit(r.ledger, 'L1', ctx({ priceUsd: 0.0002 }));
  assert.equal(f.ok, true); assert.equal(f.trade.reason, 'limit'); assert.equal(f.ledger.limits.length, 0);
  assert.equal(fireLimit(f.ledger, 'L1', ctx()).ok, false);
});
test('resetRun archives and refills', () => {
  const ctx = mkCtx();
  const r = executeTrade(initialLedger(S, 0), buy(1), ctx());
  const l = resetRun(r.ledger, S, 5000);
  assert.equal(l.balance, 10); assert.deepEqual(l.positions, []); assert.deepEqual(l.trades, []);
  assert.equal(l.pastRuns.length, 1); assert.equal(l.pastRuns[0].trades.length, 1);
  assert.equal(l.pastRuns[0].endedAt, 5000); assert.equal(l.runStartedAt, 5000);
});

test('coin liquidity sets the pool size and is kept on the position', () => {
  const ctx = mkCtx();
  // $20,000 liquidity at $100/SOL -> 100 SOL on the SOL side
  let r = executeTrade(initialLedger(S, 0), buy(1, { symbol: 'AMD', liquidityUsd: 20000 }), ctx());
  close(r.trade.impactPct, 0.99);
  assert.equal(r.ledger.positions[0].liquidityUsd, 20000);
  r = executeTrade(r.ledger, { side: 'sell', mint: 'm', fraction: 1 }, ctx());
  assert.ok(r.trade.impactPct > 0 && r.trade.impactPct < 1.1);
});
test('defaults: slippage is a 20% limit, priority fee 0.001', () => {
  assert.equal(S.slippagePct, 20); assert.equal(S.priorityFeeSol, 0.001);
});
test('migrateSettings moves the old 0.005 default down once', () => {
  assert.deepEqual(migrateSettings({ priorityFeeSol: 0.005, slippagePct: 25 }), { priorityFeeSol: 0.001, slippagePct: 25, settingsVersion: 2 });
  assert.deepEqual(migrateSettings({ priorityFeeSol: 0.003 }), { priorityFeeSol: 0.003, settingsVersion: 2 });
  assert.deepEqual(migrateSettings({ priorityFeeSol: 0.005, settingsVersion: 2 }), { priorityFeeSol: 0.005, settingsVersion: 2 });
  assert.equal(migrateSettings(undefined), undefined);
});
