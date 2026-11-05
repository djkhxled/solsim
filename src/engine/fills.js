export function quoteBuy({ balance, amountSol, priceSol, settings }) {
  const { platformFeePct, priorityFeeSol, slippagePct } = settings;
  if (!(amountSol > 0)) return { ok: false, error: 'Enter an amount above 0' };
  if (!(priceSol > 0)) return { ok: false, error: 'No price' };
  const cost = amountSol + priorityFeeSol;
  if (cost > balance + 1e-12) return { ok: false, error: 'Not enough SOL' };
  const platformFee = (amountSol * platformFeePct) / 100;
  const fillPriceSol = priceSol * (1 + slippagePct / 100);
  const tokens = (amountSol - platformFee) / fillPriceSol;
  return { ok: true, cost, tokens, platformFee, priorityFee: priorityFeeSol, fillPriceSol };
}

export function quoteSell({ tokensHeld, fraction, priceSol, settings }) {
  const { platformFeePct, priorityFeeSol, slippagePct } = settings;
  if (!(tokensHeld > 0)) return { ok: false, error: 'Nothing to sell' };
  if (!(fraction > 0 && fraction <= 1)) return { ok: false, error: 'Pick a % between 1 and 100' };
  if (!(priceSol > 0)) return { ok: false, error: 'No price' };
  const tokensOut = fraction === 1 ? tokensHeld : tokensHeld * fraction;
  const fillPriceSol = priceSol * (1 - slippagePct / 100);
  const gross = tokensOut * fillPriceSol;
  const platformFee = (gross * platformFeePct) / 100;
  const proceeds = Math.max(0, gross - platformFee - priorityFeeSol);
  return { ok: true, tokensOut, proceeds, platformFee, priorityFee: priorityFeeSol, fillPriceSol };
}

export function sellInitialsFraction({ invested, sold, tokensHeld, priceSol, settings }) {
  const target = invested - sold;
  if (!(target > 1e-9) || !(tokensHeld > 0) || !(priceSol > 0)) return null;
  const fillPriceSol = priceSol * (1 - settings.slippagePct / 100);
  const gross = (target + settings.priorityFeeSol) / (1 - settings.platformFeePct / 100);
  return Math.min(1, gross / (tokensHeld * fillPriceSol));
}
