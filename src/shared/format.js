export function fmtCompactUsd(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(2)}K`;
  return `${sign}$${a.toFixed(2)}`;
}

export function fmtUsd(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e3) return fmtCompactUsd(n);
  if (a === 0) return '$0';
  const sign = n < 0 ? '-' : '';
  return a >= 1 ? `${sign}$${a.toFixed(2)}` : `${sign}$${a.toPrecision(3)}`;
}

export function fmtSol(n, digits = 3) {
  if (n == null || !Number.isFinite(n)) return '—';
  const v = Number(n.toFixed(Math.abs(n) >= 100 ? 1 : digits));
  return String(v === 0 ? 0 : v);
}

export function fmtPct(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(Math.abs(n) >= 100 ? 0 : 2)}%`;
}

export function parseCompact(s) {
  const m = /^\s*\$?\s*([0-9]*\.?[0-9]+)\s*([kmb])?\s*$/i.exec(String(s ?? ''));
  if (!m) return null;
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] || '').toLowerCase()] || 1;
  return Number(m[1]) * mult;
}
