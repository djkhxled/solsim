export const DUST = 1e-9;

export function newPosition({ id, mint, coin, now }) {
  const c = coin || {};
  return {
    id, mint,
    symbol: c.symbol || '???',
    name: c.name || c.symbol || 'Unknown',
    logo: c.logo || null,
    totalSupply: c.totalSupply || null,
    liquidityUsd: c.liquidityUsd || null,
    openedAt: now, closedAt: null, status: 'open',
    invested: 0, sold: 0, tokens: 0, peakTokens: 0,
  };
}

export function applyBuy(pos, q) {
  const tokens = pos.tokens + q.tokens;
  return { ...pos, invested: pos.invested + q.cost, tokens, peakTokens: Math.max(pos.peakTokens, tokens) };
}

export function applySell(pos, q, now) {
  const left = Math.max(0, pos.tokens - q.tokensOut);
  const closed = left <= pos.peakTokens * DUST;
  return { ...pos, sold: pos.sold + q.proceeds, tokens: closed ? 0 : left, status: closed ? 'closed' : 'open', closedAt: closed ? now : null };
}

// Remaining is market value (tokens x current price), like GMGN's unrealized PnL.
export function positionStats(pos, priceSol) {
  const remaining = priceSol > 0 ? pos.tokens * priceSol : 0;
  const pnlSol = pos.sold + remaining - pos.invested;
  const pnlPct = pos.invested > 0 ? (pnlSol / pos.invested) * 100 : 0;
  return { invested: pos.invested, sold: pos.sold, remaining, pnlSol, pnlPct };
}

export function openPositionFor(positions, mint) {
  return positions.find((p) => p.mint === mint && p.status === 'open') || null;
}

export function latestPositionFor(positions, mint) {
  return positions.filter((p) => p.mint === mint).sort((a, b) => b.openedAt - a.openedAt)[0] || null;
}
