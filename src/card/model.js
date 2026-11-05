import { fmtUsd, fmtSol, fmtPct } from '../shared/format.js';
import { mergeSeries } from '../engine/ticks.js';

export const SIZES = { landscape: { w: 1600, h: 900 }, portrait: { w: 1080, h: 1350 } };

export function cardModel({ position, trades, series = [], lastPriceUsd, solUsdNow, currency = 'USD', displayName = '', settings }) {
  const own = trades.filter((t) => t.posId === position.id).sort((a, b) => a.ts - b.ts);
  const sum = (side, f) => own.filter((t) => t.side === side).reduce((acc, t) => acc + f(t), 0);
  const boughtSol = sum('buy', (t) => t.amountSol);
  const soldSol = sum('sell', (t) => t.amountSol);
  const boughtUsd = sum('buy', (t) => t.amountSol * t.solUsd);
  const soldUsd = sum('sell', (t) => t.amountSol * t.solUsd);
  const solNow = solUsdNow > 0 ? solUsdNow : (own.length ? own[own.length - 1].solUsd : 0);
  const holdSol = position.tokens > 0 && lastPriceUsd > 0 && solNow > 0
    ? position.tokens * (lastPriceUsd / solNow) : 0;
  const usd = currency === 'USD';
  const bought = usd ? boughtUsd : boughtSol;
  const sold = usd ? soldUsd : soldSol;
  const hold = usd ? holdSol * solNow : holdSol;
  const pnl = sold + hold - bought;
  const pct = bought > 0 ? (pnl / bought) * 100 : 0;
  const fmt = (n) => (usd ? fmtUsd(n) : `${fmtSol(n)} SOL`);
  const positive = pnl >= 0;
  const markers = own.map((t) => ({ t: t.ts, p: t.priceUsd, side: t.side === 'buy' ? 'B' : 'S' }));
  return {
    symbol: position.symbol, logo: position.logo || null, currency, positive,
    pnlText: (pnl > 0 ? '+' : '') + fmt(pnl),
    pctText: fmtPct(pct),
    stats: [
      { label: 'PNL', value: `${fmt(pnl)} (${fmtPct(pct)})`, tone: positive ? 'up' : 'down' },
      { label: 'Sold', value: fmt(sold) },
      { label: 'Hold', value: fmt(hold) },
      { label: 'Bought', value: fmt(bought) },
    ],
    series: series.length >= 2 ? mergeSeries(series, markers.map((m) => [m.t, m.p])) : [],
    markers, displayName, isOpen: position.status === 'open',
  };
}

export function chartGeometry(series, markers, box, pad = 0.08) {
  if (!series || series.length < 2) return null;
  const t0 = series[0][0];
  const t1 = series[series.length - 1][0];
  let lo = Infinity;
  let hi = -Infinity;
  for (const [, p] of series) { lo = Math.min(lo, p); hi = Math.max(hi, p); }
  for (const m of markers) { lo = Math.min(lo, m.p); hi = Math.max(hi, m.p); }
  if (hi === lo) { hi = lo * 1.01 + 1e-12; lo *= 0.99; }
  const span = hi - lo;
  lo -= span * pad;
  hi += span * pad;
  const tx = (t) => box.x + (t1 === t0 ? 0 : (t - t0) / (t1 - t0)) * box.w;
  const py = (p) => box.y + (1 - (p - lo) / (hi - lo)) * box.h;
  return {
    path: series.map(([t, p]) => [tx(t), py(p)]),
    markers: markers.filter((m) => m.t >= t0 && m.t <= t1).map((m) => ({ x: tx(m.t), y: py(m.p), side: m.side })),
  };
}

export function shareText(model) {
  return `${model.pctText} on $${model.symbol} ${model.positive ? '📈' : '📉'} (paper trade via SolSim)`;
}
