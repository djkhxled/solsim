// Fill model.
// Price impact comes from trade size vs. the pool's SOL side (constant product:
// the average fill moves by size/pool). If the pool is unknown we fall back to a
// small fixed impact. The user's slippage setting is a LIMIT like on GMGN: a
// trade whose impact is over it fails instead of being charged.

export const FALLBACK_IMPACT_PCT = 1;

const impactFraction = (valueSol, poolSol) => (poolSol > 0 ? valueSol / poolSol : FALLBACK_IMPACT_PCT / 100);

function overLimit(pricePct, slippagePct) {
  return pricePct > slippagePct + 1e-9
    ? { ok: false, error: `Price impact ${pricePct.toFixed(1)}% is over your ${slippagePct}% slippage` }
    : null;
}

export function quoteBuy({ balance, amountSol, priceSol, poolSol = null, settings }) {
  const { platformFeePct, priorityFeeSol, slippagePct } = settings;
  if (!(amountSol > 0)) return { ok: false, error: 'Enter an amount above 0' };
  if (!(priceSol > 0)) return { ok: false, error: 'No price' };
  const cost = amountSol + priorityFeeSol;
  if (cost > balance + 1e-12) return { ok: false, error: 'Not enough SOL' };
  const platformFee = (amountSol * platformFeePct) / 100;
  const net = amountSol - platformFee;
  const i = impactFraction(net, poolSol);
  const fail = overLimit(i * 100, slippagePct);
  if (fail) return fail;
  const fillPriceSol = priceSol * (1 + i);
  return { ok: true, cost, tokens: net / fillPriceSol, platformFee, priorityFee: priorityFeeSol, fillPriceSol, impactPct: i * 100 };
}

export function quoteSell({ tokensHeld, fraction, priceSol, poolSol = null, settings }) {
  const { platformFeePct, priorityFeeSol, slippagePct } = settings;
  if (!(tokensHeld > 0)) return { ok: false, error: 'Nothing to sell' };
  if (!(fraction > 0 && fraction <= 1)) return { ok: false, error: 'Pick a % between 1 and 100' };
  if (!(priceSol > 0)) return { ok: false, error: 'No price' };
  const tokensOut = fraction === 1 ? tokensHeld : tokensHeld * fraction;
  const i = impactFraction(tokensOut * priceSol, poolSol);
  const fail = overLimit((i / (1 + i)) * 100, slippagePct);
  if (fail) return fail;
  const fillPriceSol = priceSol / (1 + i);
  const gross = tokensOut * fillPriceSol;
  const platformFee = (gross * platformFeePct) / 100;
  const proceeds = Math.max(0, gross - platformFee - priorityFeeSol);
  return { ok: true, tokensOut, proceeds, platformFee, priorityFee: priorityFeeSol, fillPriceSol, impactPct: i * 100 };
}

export function sellInitialsFraction({ invested, sold, tokensHeld, priceSol, poolSol = null, settings }) {
  const target = invested - sold;
  if (!(target > 1e-9) || !(tokensHeld > 0) || !(priceSol > 0)) return null;
  const gross = (target + settings.priorityFeeSol) / (1 - settings.platformFeePct / 100);
  let valueSol;
  if (poolSol > 0) {
    if (gross >= poolSol) return 1;
    valueSol = (gross * poolSol) / (poolSol - gross); // inverse of gross = v / (1 + v/pool)
  } else {
    valueSol = gross * (1 + FALLBACK_IMPACT_PCT / 100);
  }
  return Math.min(1, valueSol / (tokensHeld * priceSol));
}
