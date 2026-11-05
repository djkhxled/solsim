export function makeLimit({ id, posId, mint, triggerMcUsd, fraction, currentMcUsd }) {
  if (!(triggerMcUsd > 0)) return { ok: false, error: 'Enter a market cap like 100k' };
  if (!(fraction > 0 && fraction <= 1)) return { ok: false, error: 'Pick a % between 1 and 100' };
  if (!(currentMcUsd > 0)) return { ok: false, error: 'No price' };
  if (triggerMcUsd === currentMcUsd) return { ok: false, error: 'Target equals current market cap' };
  return { ok: true, limit: { id, posId, mint, triggerMcUsd, fraction, direction: triggerMcUsd > currentMcUsd ? 'above' : 'below' } };
}

export function isTriggered(limit, mcUsd) {
  return limit.direction === 'above' ? mcUsd >= limit.triggerMcUsd : mcUsd <= limit.triggerMcUsd;
}

export function triggeredLimits(limits, mint, mcUsd) {
  if (!(mcUsd > 0)) return [];
  return limits.filter((l) => l.mint === mint && isTriggered(l, mcUsd));
}
