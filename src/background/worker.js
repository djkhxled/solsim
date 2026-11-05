import { DEFAULT_SETTINGS, initialLedger, executeTrade, addLimit, cancelLimit, fireLimit, resetRun } from '../engine/ledger.js';
import { addTick } from '../engine/ticks.js';
import { backupPrice, priceHistory, bytesToDataUrl } from './apis.js';

const store = chrome.storage.local;
const newId = () => crypto.randomUUID();

let chain = Promise.resolve();
function enqueue(fn) {
  const p = chain.then(fn);
  chain = p.catch(() => {});
  return p;
}

async function load() {
  const { ledger, settings } = await store.get(['ledger', 'settings']);
  const s = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  return { ledger: ledger || initialLedger(s, Date.now()), settings: s };
}

function ledgerOp(fn) {
  return enqueue(async () => {
    const { ledger, settings } = await load();
    const r = fn(ledger, settings);
    if (!r.ok) return { ok: false, error: r.error };
    await store.set({ ledger: r.ledger });
    return { ok: true, trade: r.trade || null, limit: r.limit || null };
  });
}

chrome.runtime.onInstalled.addListener(() =>
  enqueue(async () => {
    const st = await load();
    await store.set(st);
  }),
);

const handlers = {
  getState: () => load(),
  trade: ({ trade, market }) =>
    ledgerOp((ledger, settings) => executeTrade(ledger, trade, { ...market, now: Date.now(), settings, newId })),
  limitAdd: ({ limit }) => ledgerOp((ledger) => addLimit(ledger, { ...limit, id: newId() })),
  limitCancel: ({ limitId }) => ledgerOp((ledger) => cancelLimit(ledger, limitId)),
  limitFire: ({ limitId, market }) =>
    ledgerOp((ledger, settings) => fireLimit(ledger, limitId, { ...market, now: Date.now(), settings, newId })),
  reset: () => ledgerOp((ledger, settings) => ({ ok: true, ledger: resetRun(ledger, settings, Date.now()) })),
  saveSettings: ({ settings }) =>
    enqueue(async () => {
      const cur = await load();
      const s = { ...cur.settings, ...settings };
      await store.set({ settings: s });
      return { ok: true, settings: s };
    }),
  tick: ({ posId, ts, priceUsd }) =>
    enqueue(async () => {
      const key = 'ticks:' + posId;
      const o = await store.get(key);
      await store.set({ [key]: addTick(o[key] || [], [ts, priceUsd]) });
      return { ok: true };
    }),
  async backupPrice({ mint }) {
    const r = await backupPrice(mint);
    if (r && r.solUsd) await store.set({ solUsd: r.solUsd });
    return r ? { ok: true, ...r } : { ok: false, error: 'No backup price' };
  },
  async history({ mint, from, to }) {
    return { ok: true, points: await priceHistory(mint, from, to) };
  },
  async logoData({ url }) {
    if (!/^https:\/\/([a-z0-9-]+\.)*gmgn\.ai\//.test(url || '')) return { ok: false, error: 'Logo host not allowed' };
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const bytes = new Uint8Array(await r.arrayBuffer());
      return { ok: true, dataUrl: bytesToDataUrl(bytes, r.headers.get('content-type') || 'image/png') };
    } catch (e) {
      console.warn('[SolSim] logo', e.message);
      return { ok: false, error: e.message };
    }
  },
  async openSettings() {
    await chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/popup.html#settings') });
    return { ok: true };
  },
  async openCard({ posId }) {
    await chrome.tabs.create({ url: chrome.runtime.getURL('src/card/studio.html?pos=' + encodeURIComponent(posId)) });
    return { ok: true };
  },
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const h = msg && handlers[msg.cmd];
  if (!h) return false;
  Promise.resolve()
    .then(() => h(msg))
    .then(sendResponse, (e) => {
      console.error('[SolSim]', e);
      sendResponse({ ok: false, error: msg.cmd === 'trade' ? 'Trade not saved' : String(e.message || e) });
    });
  return true;
});
