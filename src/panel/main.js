import { parseFeedMessage } from '../feed/parse.js';
import { initialPriceState, reducePrice, needsBackup, canTrade } from '../feed/priceState.js';
import { mintFromPath, symbolFromTitle } from '../shared/route.js';
import { fmtSol, fmtCompactUsd } from '../shared/format.js';
import { openPositionFor, latestPositionFor, positionStats } from '../engine/positions.js';
import { triggeredLimits } from '../engine/limits.js';
import { DEFAULT_SETTINGS, DEFAULT_SUPPLY } from '../engine/ledger.js';
import { createView } from './view.js';

const send = (msg) =>
  chrome.runtime.sendMessage(msg).catch((e) => ({ ok: false, error: String((e && e.message) || e) }));

export function start() {
  const st = {
    mint: null, price: null, solUsd: null, infos: new Map(),
    ledger: null, settings: DEFAULT_SETTINGS,
    firing: new Map(), lastSlow: 0, solSavedAt: 0,
  };

  const coin = () => {
    const i = st.infos.get(st.mint) || {};
    return { symbol: i.symbol || symbolFromTitle(document.title) || '???', name: i.name || null, logo: i.logo || null, totalSupply: i.totalSupply || null };
  };
  const openPos = () => (st.ledger && st.mint ? openPositionFor(st.ledger.positions, st.mint) : null);
  const supply = () => coin().totalSupply || (openPos() && openPos().totalSupply) || DEFAULT_SUPPLY;
  const market = () => ({ priceUsd: st.price.priceUsd, solUsd: st.solUsd, source: st.price.source });
  const tradable = () => !!st.price && canTrade(st.price) && st.solUsd > 0;

  async function trade(cmd) {
    if (!tradable()) return view.toast('No price yet', 'err');
    const r = await send({ cmd: 'trade', trade: { ...cmd, mint: st.mint, coin: coin() }, market: market() });
    if (!r || !r.ok) return view.toast((r && r.error) || 'Trade failed', 'err');
    const t = r.trade;
    view.toast(t.side === 'buy' ? `Bought ${fmtSol(t.amountSol)} SOL of ${t.symbol}` : `Sold for ${fmtSol(t.amountSol)} SOL`, 'ok');
  }

  const view = createView({
    onBuy: (amountSol) => trade({ side: 'buy', amountSol }),
    onSell: (pct) => trade({ side: 'sell', fraction: pct / 100 }),
    onSellInit: () => trade({ side: 'sellInit' }),
    onLimitAdd: async ({ mcUsd, pct }) => {
      const pos = openPos();
      if (!pos || !tradable()) return view.toast('No open position', 'err');
      const r = await send({ cmd: 'limitAdd', limit: { posId: pos.id, mint: st.mint, triggerMcUsd: mcUsd, fraction: pct / 100, currentMcUsd: st.price.priceUsd * supply() } });
      if (!r.ok) return view.toast(r.error, 'err');
      view.clearLimitForm();
      view.toast(`Limit set at ${fmtCompactUsd(mcUsd)}`, 'ok');
    },
    onLimitCancel: (limitId) => send({ cmd: 'limitCancel', limitId }),
    onSettings: () => send({ cmd: 'openSettings' }),
    onCard: (posId) => send({ cmd: 'openCard', posId }),
  });

  function badgeFor(p) {
    if (!p) return { status: 'waiting', text: '' };
    if (p.status === 'live') return st.solUsd ? { status: 'live', text: 'Live' } : { status: 'waiting', text: 'Waiting for SOL price…' };
    if (p.status === 'backup') return p.priceUsd ? { status: 'backup', text: 'Backup price' } : { status: 'waiting', text: 'Finding price…' };
    if (p.status === 'stale') return { status: 'stale', text: 'No price' };
    return { status: 'waiting', text: 'Waiting for price…' };
  }

  let raf = 0;
  function render() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const pos = openPos();
      const priceSol = st.price && st.price.priceUsd && st.solUsd ? st.price.priceUsd / st.solUsd : 0;
      const stats = pos ? positionStats(pos, priceSol, st.settings) : null;
      const cardPos = pos || (st.ledger && st.mint ? latestPositionFor(st.ledger.positions, st.mint) : null);
      view.render({
        visible: !!st.mint,
        balance: st.ledger ? st.ledger.balance : 0,
        symbol: coin().symbol,
        badge: badgeFor(st.price),
        mcUsd: st.price && st.price.priceUsd ? st.price.priceUsd * supply() : null,
        mcEstimated: !coin().totalSupply && !(pos && pos.totalSupply),
        canTrade: tradable(),
        buyPresets: st.settings.buyPresets,
        sellPresets: st.settings.sellPresets,
        pos: stats,
        canSellInit: !!pos && pos.invested - pos.sold > 1e-9 && pos.tokens > 0,
        limits: ((st.ledger && st.ledger.limits) || []).filter((l) => l.mint === st.mint).map((l) => ({
          id: l.id,
          text: `Sell ${Math.round(l.fraction * 100)}% ${l.direction === 'above' ? '≥' : '≤'} ${fmtCompactUsd(l.triggerMcUsd)}`,
        })),
        cardPosId: cardPos ? cardPos.id : null,
      });
    });
  }

  function checkLimits() {
    if (!st.ledger || !tradable()) return;
    const mc = st.price.priceUsd * supply();
    const now = Date.now();
    for (const l of triggeredLimits(st.ledger.limits, st.mint, mc)) {
      if (now - (st.firing.get(l.id) || 0) < 5000) continue;
      st.firing.set(l.id, now);
      send({ cmd: 'limitFire', limitId: l.id, market: market() }).then((r) => {
        if (r && r.ok) view.toast(`Limit hit: sold ${Math.round(l.fraction * 100)}%`, 'ok');
      });
    }
  }

  window.addEventListener('message', (ev) => {
    if (ev.source !== window || !ev.data || ev.data.source !== 'solsim-feed') return;
    let priced = false;
    for (const e of parseFeedMessage(ev.data)) {
      if (e.type === 'info') st.infos.set(e.mint, e);
      else if (e.type === 'sol') {
        st.solUsd = e.priceUsd;
        const now = Date.now();
        if (now - st.solSavedAt > 30000) { st.solSavedAt = now; chrome.storage.local.set({ solUsd: e.priceUsd }); }
      } else if (e.type === 'price' && st.price && e.mint === st.mint) {
        st.price = reducePrice(st.price, { type: 'live', mint: e.mint, priceUsd: e.priceUsd }, Date.now());
        priced = true;
      }
    }
    if (priced) checkLimits();
    render();
  });
  window.postMessage({ source: 'solsim-panel', kind: 'hello' }, location.origin);

  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local') return;
    if (ch.ledger) st.ledger = ch.ledger.newValue;
    if (ch.settings) st.settings = { ...DEFAULT_SETTINGS, ...ch.settings.newValue };
    if (ch.ledger || ch.settings) render();
  });
  send({ cmd: 'getState' }).then((r) => {
    if (r && r.ledger) { st.ledger = r.ledger; st.settings = r.settings; }
    render();
  });
  chrome.storage.local.get('solUsd').then((o) => { if (o.solUsd && !st.solUsd) st.solUsd = o.solUsd; });

  async function slow(now) {
    const mint = st.mint;
    if (needsBackup(st.price) || !st.solUsd) {
      const r = await send({ cmd: 'backupPrice', mint });
      if (mint !== st.mint) return;
      if (r && r.ok) {
        if (r.solUsd && !st.solUsd) st.solUsd = r.solUsd;
        st.price = reducePrice(st.price, { type: 'backup', mint, priceUsd: r.priceUsd }, Date.now());
        checkLimits();
      } else {
        st.price = reducePrice(st.price, { type: 'backupFail' }, Date.now());
      }
    }
    const pos = openPos();
    if (pos && canTrade(st.price)) send({ cmd: 'tick', posId: pos.id, ts: now, priceUsd: st.price.priceUsd });
    render();
  }

  const timer = setInterval(() => {
    if (!chrome.runtime || !chrome.runtime.id) {
      clearInterval(timer);
      view.destroy();
      return;
    }
    const now = Date.now();
    const m = mintFromPath(location.pathname);
    if (m !== st.mint) {
      st.mint = m;
      st.price = m ? initialPriceState(m, now) : null;
      view.clearLimitForm();
    }
    if (st.price) st.price = reducePrice(st.price, { type: 'tick' }, now);
    if (st.mint && now - st.lastSlow >= 2000) {
      st.lastSlow = now;
      slow(now);
    }
    render();
  }, 500);
}
