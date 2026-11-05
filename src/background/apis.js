export const SOL_MINT = 'So11111111111111111111111111111111111111112';

export const jupiterUrl = (mints) => `https://lite-api.jup.ag/price/v3?ids=${mints.join(',')}`;
export const dexScreenerUrl = (mint) => `https://api.dexscreener.com/tokens/v1/solana/${mint}`;
export const geckoPoolsUrl = (mint) => `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools?page=1`;
export const geckoOhlcvUrl = (pool, mint, beforeSec) =>
  `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/ohlcv/minute?aggregate=1&limit=1000&currency=usd&token=${mint}&before_timestamp=${beforeSec}`;

export function parseJupiter(json, mint) {
  const p = Number(json && json[mint] && json[mint].usdPrice);
  return p > 0 ? p : null;
}

export function parseDexScreener(json, mint) {
  if (!Array.isArray(json)) return null;
  const pairs = json.filter((p) => p && p.baseToken && p.baseToken.address === mint && Number(p.priceUsd) > 0);
  pairs.sort((a, b) => ((b.liquidity && b.liquidity.usd) || 0) - ((a.liquidity && a.liquidity.usd) || 0));
  return pairs.length ? Number(pairs[0].priceUsd) : null;
}

export function parseGeckoPools(json) {
  const d = json && json.data;
  if (!Array.isArray(d) || !d.length) return null;
  return (d[0].attributes && d[0].attributes.address) || null;
}

export function parseGeckoOhlcv(json) {
  const list = json && json.data && json.data.attributes && json.data.attributes.ohlcv_list;
  if (!Array.isArray(list)) return [];
  return list.map((r) => [r[0] * 1000, Number(r[4])]).filter(([t, p]) => t > 0 && p > 0).sort((a, b) => a[0] - b[0]);
}

export async function fetchJson(url, timeoutMs = 4000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ac.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function backupPrice(mint, getJson = fetchJson) {
  try {
    const j = await getJson(jupiterUrl([mint, SOL_MINT]));
    const p = parseJupiter(j, mint);
    if (p) return { priceUsd: p, solUsd: parseJupiter(j, SOL_MINT), source: 'jupiter' };
  } catch (e) {
    console.warn('[SolSim] jupiter', e.message);
  }
  try {
    const p = parseDexScreener(await getJson(dexScreenerUrl(mint)), mint);
    if (p) return { priceUsd: p, solUsd: null, source: 'dexscreener' };
  } catch (e) {
    console.warn('[SolSim] dexscreener', e.message);
  }
  return null;
}

export async function priceHistory(mint, fromMs, toMs, getJson = fetchJson) {
  try {
    const pool = parseGeckoPools(await getJson(geckoPoolsUrl(mint)));
    if (!pool) return [];
    const pts = parseGeckoOhlcv(await getJson(geckoOhlcvUrl(pool, mint, Math.ceil(toMs / 1000) + 60)));
    return pts.filter(([t]) => t >= fromMs - 60000 && t <= toMs + 60000);
  } catch (e) {
    console.warn('[SolSim] geckoterminal', e.message);
    return [];
  }
}

export function bytesToDataUrl(bytes, mime) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(bin)}`;
}
