import test from 'node:test';
import assert from 'node:assert/strict';
import { cardModel, chartGeometry, shareText } from '../src/card/model.js';

const settings = { slippagePct: 1 };
const buyT = { posId: 'p1', side: 'buy', ts: 1000, amountSol: 1.005, priceUsd: 0.0001, solUsd: 100 };
const sellT = { posId: 'p1', side: 'sell', ts: 2000, amountSol: 1.5, priceUsd: 0.0002, solUsd: 100 };
const closedPos = { id: 'p1', symbol: 'AMD', logo: null, tokens: 0, status: 'closed' };

test('closed position in USD', () => {
  const m = cardModel({ position: closedPos, trades: [sellT, buyT, { ...buyT, posId: 'other' }], series: [], lastPriceUsd: 0.0002, solUsdNow: 100, currency: 'USD', displayName: 'baylor', settings });
  assert.equal(m.pnlText, '+$49.50');
  assert.equal(m.pctText, '+49.25%');
  assert.equal(m.positive, true);
  assert.deepEqual(m.stats.map((s) => s.label), ['PNL', 'Sold', 'Hold', 'Bought']);
  assert.deepEqual(m.stats.map((s) => s.value), ['$49.50 (+49.25%)', '$150.00', '$0', '$100.50']);
  assert.deepEqual(m.markers, [{ t: 1000, p: 0.0001, side: 'B' }, { t: 2000, p: 0.0002, side: 'S' }]);
  assert.deepEqual(m.series, []);
  assert.equal(m.isOpen, false);
});
test('closed position in SOL', () => {
  const m = cardModel({ position: closedPos, trades: [buyT, sellT], series: [], lastPriceUsd: 0.0002, solUsdNow: 100, currency: 'SOL', settings });
  assert.equal(m.pnlText, '+0.495 SOL');
  assert.equal(m.stats[3].value, '1.005 SOL');
});
test('open position values hold at last price', () => {
  const pos = { id: 'p1', symbol: 'AMD', tokens: 1e6, status: 'open' };
  const m = cardModel({ position: pos, trades: [buyT], series: [[1500, 0.0001], [1600, 0.0001]], lastPriceUsd: 0.0001, solUsdNow: 100, currency: 'USD', settings });
  assert.equal(m.pnlText, '-$1.50');
  assert.equal(m.pctText, '-1.49%');
  assert.equal(m.positive, false);
  assert.equal(m.stats[2].value, '$99.00');
  assert.deepEqual(m.series.map((p) => p[0]), [1000, 1500, 1600]);
  assert.equal(m.isOpen, true);
});
test('chartGeometry maps to the box', () => {
  const g = chartGeometry([[0, 1], [10, 2]], [{ t: 0, p: 1, side: 'B' }], { x: 0, y: 0, w: 100, h: 100 }, 0);
  assert.deepEqual(g.path, [[0, 100], [100, 0]]);
  assert.deepEqual(g.markers, [{ x: 0, y: 100, side: 'B' }]);
  assert.equal(chartGeometry([[0, 1]], [], { x: 0, y: 0, w: 1, h: 1 }), null);
});
test('shareText', () => {
  assert.equal(shareText({ pctText: '+49.25%', symbol: 'AMD', positive: true }), '+49.25% on $AMD 📈 (paper trade via SolSim)');
  assert.equal(shareText({ pctText: '-3.41%', symbol: 'AMD', positive: false }), '-3.41% on $AMD 📉 (paper trade via SolSim)');
});
