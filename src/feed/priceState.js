export const LIVE_TIMEOUT_MS = 3000;
export const STALE_MS = 5000;

export function initialPriceState(mint, now) {
  return { mint, status: 'waiting', priceUsd: null, source: null, lastLiveAt: 0, lastPriceAt: 0, since: now };
}

export function reducePrice(s, ev, now) {
  switch (ev.type) {
    case 'live':
      if (ev.mint !== s.mint) return s;
      return { ...s, status: 'live', priceUsd: ev.priceUsd, source: 'live', lastLiveAt: now, lastPriceAt: now };
    case 'backup':
      if (ev.mint !== s.mint || s.status === 'live') return s;
      return { ...s, status: 'backup', priceUsd: ev.priceUsd, source: 'backup', lastPriceAt: now };
    case 'backupFail':
      if (s.status === 'live' || s.status === 'waiting') return s;
      return s.priceUsd == null || now - s.lastPriceAt > STALE_MS ? { ...s, status: 'stale' } : s;
    case 'tick': {
      let n = s;
      if (n.status === 'live' && now - n.lastLiveAt > LIVE_TIMEOUT_MS) n = { ...n, status: 'backup' };
      if (n.status === 'waiting' && now - n.since > LIVE_TIMEOUT_MS) n = { ...n, status: 'backup' };
      if (n.status === 'backup' && n.priceUsd != null && now - n.lastPriceAt > STALE_MS) n = { ...n, status: 'stale' };
      return n;
    }
    default:
      return s;
  }
}

export const needsBackup = (s) => !!s && (s.status === 'backup' || s.status === 'stale');
export const canTrade = (s) => !!s && (s.status === 'live' || s.status === 'backup') && s.priceUsd > 0;
