export const MAX_TICKS = 5000;

export function addTick(ticks, tick, max = MAX_TICKS) {
  const last = ticks[ticks.length - 1];
  if (last && tick[0] <= last[0]) return ticks;
  const next = [...ticks, tick];
  if (next.length <= max) return next;
  return next.filter((_, i) => i % 2 === 0 || i === next.length - 1);
}

export function findGaps(ticks, from, to, gapMs = 30000) {
  const pts = [from, ...ticks.map((t) => t[0]).filter((t) => t > from && t < to), to];
  const gaps = [];
  for (let i = 1; i < pts.length; i++) if (pts[i] - pts[i - 1] > gapMs) gaps.push([pts[i - 1], pts[i]]);
  return gaps;
}

export function mergeSeries(a, b) {
  const seen = new Set();
  return [...a, ...b]
    .filter(([t]) => (seen.has(t) ? false : seen.add(t)))
    .sort((x, y) => x[0] - y[0]);
}

export function lastPrice(ticks) {
  return ticks.length ? ticks[ticks.length - 1][1] : null;
}
