import { cardModel, SIZES, shareText } from './model.js';
import { drawCard } from './render.js';
import { BACKGROUNDS } from './backgrounds.js';
import { findGaps, mergeSeries, lastPrice } from '../engine/ticks.js';
import { downscaleToDataUrl, loadImage } from '../shared/image.js';

const $ = (s) => document.querySelector(s);
const send = (m) => chrome.runtime.sendMessage(m);
const DEFAULT_PREFS = { layout: 'landscape', neon: true, overlay: true, currency: null, bg: { kind: 'builtin', id: 'starfield' } };
const MAX_UPLOADS = 5;
const MAX_UPLOAD_CHARS = Math.round(2 * 1024 * 1024 * 1.37);
const S = { assets: { uploads: [] } };

const status = (t) => { $('#status').textContent = t; };
const savePrefs = () => chrome.storage.local.set({ cardPrefs: S.prefs });

async function init() {
  const posId = new URLSearchParams(location.search).get('pos');
  const { ledger, settings } = await send({ cmd: 'getState' });
  const position = ledger.positions.find((p) => p.id === posId);
  if (!position) { $('#msg').textContent = 'Position not found (it may have been reset).'; return; }
  const tickKey = 'ticks:' + posId;
  const o = await chrome.storage.local.get([tickKey, 'solUsd', 'cardPrefs', 'cardUploads']);
  const ticks = o[tickKey] || [];
  const trades = ledger.trades.filter((t) => t.posId === posId);
  const last = trades[trades.length - 1];
  Object.assign(S, {
    position, settings, trades, ticks, series: ticks,
    solUsd: o.solUsd || (last && last.solUsd) || null,
    lastPriceUsd: lastPrice(ticks) ?? (last ? last.priceUsd : null),
    prefs: { ...DEFAULT_PREFS, ...(o.cardPrefs || {}) },
    uploads: o.cardUploads || [],
  });
  if (!S.prefs.currency) S.prefs.currency = settings.pnlCurrency;
  document.title = `SolSim · ${position.symbol}`;
  await loadAssets();
  bindControls();
  draw();

  const end = position.closedAt || Date.now();
  const gaps = findGaps(ticks, position.openedAt, end);
  if (gaps.length) {
    status('Loading price history…');
    const r = await send({ cmd: 'history', mint: position.mint, from: position.openedAt, to: end });
    const extra = r && r.ok ? r.points.filter(([t]) => gaps.some(([a, b]) => t > a && t < b)) : [];
    if (extra.length) { S.series = mergeSeries(ticks, extra); draw(); }
    status('');
  }
}

async function safeImage(src) {
  try { return src ? await loadImage(src) : null; } catch { return null; }
}

async function loadAssets() {
  if (S.position.logo) {
    const r = await send({ cmd: 'logoData', url: S.position.logo });
    S.assets.coin = r && r.ok ? await safeImage(r.dataUrl) : null;
  }
  S.assets.avatar = await safeImage(S.settings.avatar);
  S.assets.uploads = await Promise.all(S.uploads.map(safeImage));
}

function background() {
  const bg = S.prefs.bg;
  if (bg.kind === 'upload' && S.assets.uploads[bg.index]) return { kind: 'upload', img: S.assets.uploads[bg.index] };
  return { kind: 'builtin', id: bg.kind === 'builtin' ? bg.id : 'starfield' };
}

function draw() {
  const { w, h } = SIZES[S.prefs.layout];
  const cv = $('#cv');
  cv.width = w; cv.height = h;
  cv.className = S.prefs.layout;
  S.model = cardModel({
    position: S.position, trades: S.trades, series: S.series, lastPriceUsd: S.lastPriceUsd,
    solUsdNow: S.solUsd, currency: S.prefs.currency, displayName: S.settings.displayName, settings: S.settings,
  });
  drawCard(cv.getContext('2d'), S.model, { layout: S.prefs.layout, neon: S.prefs.neon, overlay: S.prefs.overlay, background: background() },
    { coinImg: S.assets.coin, avatarImg: S.assets.avatar });
  syncControls();
}

function syncControls() {
  $('#neon').checked = S.prefs.neon;
  $('#overlay').checked = S.prefs.overlay;
  for (const b of document.querySelectorAll('#layout button')) b.classList.toggle('on', b.dataset.v === S.prefs.layout);
  for (const b of document.querySelectorAll('#currency button')) b.classList.toggle('on', b.dataset.v === S.prefs.currency);
  for (const t of document.querySelectorAll('#bgs .thumb')) {
    const bg = S.prefs.bg;
    const on = t.dataset.kind === bg.kind && (bg.kind === 'builtin' ? t.dataset.id === bg.id : Number(t.dataset.index) === bg.index);
    t.classList.toggle('on', on);
  }
}

function renderThumbs() {
  const thumbs = BACKGROUNDS.map((b) => {
    const c = document.createElement('canvas');
    c.width = 160; c.height = 90; c.className = 'thumb'; c.title = b.name;
    c.dataset.kind = 'builtin'; c.dataset.id = b.id;
    b.draw(c.getContext('2d'), 160, 90);
    return c;
  });
  S.assets.uploads.forEach((img, i) => {
    if (!img) return;
    const wrap = document.createElement('div');
    wrap.className = 'thumb upl'; wrap.dataset.kind = 'upload'; wrap.dataset.index = String(i);
    const im = document.createElement('img'); im.src = img.src;
    const x = document.createElement('button'); x.textContent = '✕'; x.className = 'del'; x.dataset.del = String(i);
    wrap.append(im, x);
    thumbs.push(wrap);
  });
  $('#bgs').replaceChildren(...thumbs);
}

function bindControls() {
  renderThumbs();
  $('#neon').onchange = (e) => { S.prefs.neon = e.target.checked; savePrefs(); draw(); };
  $('#overlay').onchange = (e) => { S.prefs.overlay = e.target.checked; savePrefs(); draw(); };
  $('#layout').onclick = (e) => { const v = e.target.dataset.v; if (v) { S.prefs.layout = v; savePrefs(); draw(); } };
  $('#currency').onclick = (e) => { const v = e.target.dataset.v; if (v) { S.prefs.currency = v; savePrefs(); draw(); } };
  $('#bgs').onclick = async (e) => {
    if (e.target.dataset.del !== undefined) {
      const i = Number(e.target.dataset.del);
      S.uploads.splice(i, 1);
      S.assets.uploads.splice(i, 1);
      await chrome.storage.local.set({ cardUploads: S.uploads });
      if (S.prefs.bg.kind === 'upload') S.prefs.bg = { kind: 'builtin', id: 'starfield' };
      savePrefs(); renderThumbs(); draw();
      return;
    }
    const t = e.target.closest('.thumb');
    if (!t) return;
    S.prefs.bg = t.dataset.kind === 'builtin' ? { kind: 'builtin', id: t.dataset.id } : { kind: 'upload', index: Number(t.dataset.index) };
    savePrefs(); draw();
  };
  $('#upload').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const dataUrl = await downscaleToDataUrl(file, 1600, 1350, 'image/jpeg', 0.88);
    if (dataUrl.length > MAX_UPLOAD_CHARS) return status('That image is too big even after shrinking (2 MB max).');
    S.uploads.push(dataUrl);
    S.assets.uploads.push(await safeImage(dataUrl));
    while (S.uploads.length > MAX_UPLOADS) { S.uploads.shift(); S.assets.uploads.shift(); }
    await chrome.storage.local.set({ cardUploads: S.uploads });
    S.prefs.bg = { kind: 'upload', index: S.uploads.length - 1 };
    savePrefs(); renderThumbs(); draw();
  };
  const blob = () => new Promise((r) => $('#cv').toBlob(r, 'image/png'));
  async function copy() {
    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob() })]); return true; }
    catch (err) { console.warn('[SolSim] copy', err); return false; }
  }
  $('#download').onclick = async () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await blob());
    a.download = `solsim-${S.position.symbol.replace(/[^A-Za-z0-9_-]/g, '') || 'coin'}-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  $('#copy').onclick = async () => status((await copy()) ? 'Copied image' : 'Could not copy; use Download');
  $('#share').onclick = async () => {
    const ok = await copy();
    window.open('https://x.com/intent/post?text=' + encodeURIComponent(shareText(S.model)), '_blank');
    status(ok ? 'Image copied. Paste it into your post.' : 'Could not copy; use Download');
  };
}

init().catch((e) => { console.error('[SolSim]', e); $('#msg').textContent = 'Something went wrong loading this card.'; });
