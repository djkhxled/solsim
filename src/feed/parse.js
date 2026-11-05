function num(v) {
  const n = Number(v);
  return v !== '' && v != null && Number.isFinite(n) ? n : null;
}
function parseJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

export function parseWsFrame(text) {
  const j = parseJson(text);
  if (!j || !Array.isArray(j.data)) return [];
  const out = [];
  if (j.channel === 'token_stat') {
    for (const d of j.data) {
      const p = num(d && d.p);
      if (d && d.n === 'sol' && typeof d.a === 'string' && p > 0) {
        out.push({ type: 'price', mint: d.a, priceUsd: p, ts: num(d.t) ? d.t * 1000 : null });
      }
    }
  } else if (j.channel === 'major_coin_price') {
    for (const d of j.data) {
      const p = num(d && d.p);
      if (d && d.s === 'SOL' && p > 0) out.push({ type: 'sol', priceUsd: p, ts: num(d.ts) });
    }
  }
  return out;
}

export function parseInfoResponse(text) {
  const j = parseJson(text);
  if (!j || !Array.isArray(j.data)) return [];
  const out = [];
  for (const d of j.data) {
    if (!d || typeof d.address !== 'string' || typeof d.symbol !== 'string') continue;
    if (d.chain && d.chain !== 'sol') continue;
    const supply = num(d.total_supply);
    out.push({
      type: 'info', mint: d.address, symbol: d.symbol,
      name: typeof d.name === 'string' && d.name ? d.name : d.symbol,
      logo: typeof d.logo === 'string' && d.logo ? d.logo : null,
      decimals: num(d.decimals), totalSupply: supply > 0 ? supply : null,
      liquidityUsd: num(d.liquidity) > 0 ? num(d.liquidity) : null,
    });
  }
  return out;
}

export function parseFeedMessage(msg) {
  if (!msg || typeof msg.data !== 'string') return [];
  if (msg.kind === 'ws') return parseWsFrame(msg.data);
  if (msg.kind === 'http') return parseInfoResponse(msg.data);
  return [];
}
