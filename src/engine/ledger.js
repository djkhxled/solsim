import { quoteBuy, quoteSell, sellInitialsFraction } from './fills.js';
import { newPosition, applyBuy, applySell, openPositionFor } from './positions.js';
import { makeLimit } from './limits.js';

export const DEFAULT_SETTINGS = Object.freeze({
  startingBalance: 10, platformFeePct: 1, priorityFeeSol: 0.005, slippagePct: 1,
  buyPresets: [0.1, 0.2, 0.5, 1, 3, 5, 10, 20], sellPresets: [10, 25, 50, 100],
  pnlCurrency: 'USD', displayName: '', avatar: null,
});
export const DEFAULT_SUPPLY = 1e9;

export function initialLedger(settings, now) {
  return { balance: settings.startingBalance, positions: [], trades: [], limits: [], pastRuns: [], runStartedAt: now };
}

function upsert(list, pos) {
  const i = list.findIndex((p) => p.id === pos.id);
  if (i < 0) return [...list, pos];
  const copy = list.slice();
  copy[i] = pos;
  return copy;
}

function refreshCoin(pos, coin) {
  return {
    ...pos,
    symbol: pos.symbol === '???' && coin.symbol ? coin.symbol : pos.symbol,
    name: pos.name === 'Unknown' && (coin.name || coin.symbol) ? coin.name || coin.symbol : pos.name,
    logo: pos.logo || coin.logo || null,
    totalSupply: pos.totalSupply || coin.totalSupply || null,
  };
}

export function executeTrade(ledger, cmd, ctx) {
  const { priceUsd, solUsd, settings, now } = ctx;
  if (!(priceUsd > 0) || !(solUsd > 0)) return { ok: false, error: 'No price' };
  const priceSol = priceUsd / solUsd;
  let pos = openPositionFor(ledger.positions, cmd.mint);
  let quote;
  let side;
  if (cmd.side === 'buy') {
    quote = quoteBuy({ balance: ledger.balance, amountSol: cmd.amountSol, priceSol, settings });
    if (!quote.ok) return quote;
    const coin = cmd.coin || {};
    pos = pos ? refreshCoin(pos, coin) : newPosition({ id: ctx.newId(), mint: cmd.mint, coin, now });
    pos = applyBuy(pos, quote);
    side = 'buy';
  } else {
    if (!pos) return { ok: false, error: 'No open position' };
    let fraction = cmd.fraction;
    if (cmd.side === 'sellInit') {
      fraction = sellInitialsFraction({ invested: pos.invested, sold: pos.sold, tokensHeld: pos.tokens, priceSol, settings });
      if (fraction == null) return { ok: false, error: 'Initials already taken out' };
    }
    quote = quoteSell({ tokensHeld: pos.tokens, fraction, priceSol, settings });
    if (!quote.ok) return quote;
    pos = applySell(pos, quote, now);
    side = 'sell';
  }
  const trade = {
    id: ctx.newId(), posId: pos.id, mint: cmd.mint, symbol: pos.symbol, side, ts: now,
    amountSol: side === 'buy' ? quote.cost : quote.proceeds,
    tokens: side === 'buy' ? quote.tokens : quote.tokensOut,
    priceUsd, solUsd, mcUsd: priceUsd * (pos.totalSupply || DEFAULT_SUPPLY),
    fillPriceSol: quote.fillPriceSol, platformFee: quote.platformFee, priorityFee: quote.priorityFee,
    source: ctx.source || 'live', reason: cmd.reason || null,
  };
  const balance = side === 'buy' ? ledger.balance - quote.cost : ledger.balance + quote.proceeds;
  const limits = pos.status === 'closed' ? ledger.limits.filter((l) => l.posId !== pos.id) : ledger.limits;
  return { ok: true, trade, ledger: { ...ledger, balance, positions: upsert(ledger.positions, pos), trades: [...ledger.trades, trade], limits } };
}

export function addLimit(ledger, args) {
  const pos = ledger.positions.find((p) => p.id === args.posId && p.status === 'open');
  if (!pos) return { ok: false, error: 'No open position' };
  const r = makeLimit(args);
  if (!r.ok) return r;
  return { ok: true, limit: r.limit, ledger: { ...ledger, limits: [...ledger.limits, r.limit] } };
}

export function cancelLimit(ledger, id) {
  return { ok: true, ledger: { ...ledger, limits: ledger.limits.filter((l) => l.id !== id) } };
}

export function fireLimit(ledger, limitId, ctx) {
  const limit = ledger.limits.find((l) => l.id === limitId);
  if (!limit) return { ok: false, error: 'Limit already gone' };
  const r = executeTrade(ledger, { side: 'sell', mint: limit.mint, fraction: limit.fraction, reason: 'limit' }, ctx);
  if (!r.ok) return r;
  return { ...r, ledger: { ...r.ledger, limits: r.ledger.limits.filter((l) => l.id !== limitId) } };
}

export function resetRun(ledger, settings, now) {
  const run = { startedAt: ledger.runStartedAt, endedAt: now, endBalance: ledger.balance, trades: ledger.trades, positions: ledger.positions };
  return { ...initialLedger(settings, now), pastRuns: [...ledger.pastRuns, run] };
}
