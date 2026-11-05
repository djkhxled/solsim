import { DEFAULT_SETTINGS } from '../engine/ledger.js';
import { positionStats } from '../engine/positions.js';
import { lastPrice } from '../engine/ticks.js';
import { fmtSol, fmtPct, fmtCompactUsd } from '../shared/format.js';
import { downscaleToDataUrl } from '../shared/image.js';

const send = (m) => chrome.runtime.sendMessage(m);
const $ = (s) => document.querySelector(s);
const st = { ledger: null, settings: DEFAULT_SETTINGS, solUsd: null, ticks: {}, avatar: undefined };

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  e.append(...kids);
  return e;
}

async function load() {
  const r = await send({ cmd: 'getState' });
  st.ledger = r.ledger;
  st.settings = r.settings;
  st.solUsd = (await chrome.storage.local.get('solUsd')).solUsd || null;
  const keys = st.ledger.positions.filter((p) => p.status === 'open').map((p) => 'ticks:' + p.id);
  st.ticks = keys.length ? await chrome.storage.local.get(keys) : {};
  render();
}

function renderPositions() {
  const list = [...st.ledger.positions].sort((a, b) =>
    a.status === b.status ? b.openedAt - a.openedAt : a.status === 'open' ? -1 : 1);
  if (!list.length) {
    $('#positions').replaceChildren(el('p', { className: 'muted', textContent: 'No trades yet. Open a coin on gmgn.ai and buy from the SolSim panel.' }));
    return;
  }
  $('#positions').replaceChildren(...list.map((p) => {
    const lp = p.status === 'open' ? lastPrice(st.ticks['ticks:' + p.id] || []) : null;
    const s = positionStats(p, lp && st.solUsd ? lp / st.solUsd : 0);
    const img = el('img', { className: 'coin', alt: '' });
    if (p.logo) img.src = p.logo; else img.style.visibility = 'hidden';
    const btn = el('button', { className: 'small', textContent: 'Make card' });
    btn.onclick = () => send({ cmd: 'openCard', posId: p.id });
    const detail = `In ${fmtSol(s.invested)} · Out ${fmtSol(s.sold)}` + (p.status === 'open' ? ` · Hold ${fmtSol(s.remaining)}` : '');
    return el('div', { className: 'pos' },
      img,
      el('div', { className: 'grow' },
        el('b', { textContent: p.symbol }),
        el('span', { className: 'muted', textContent: p.status === 'open' ? ' open' : ' closed' }),
        el('div', { className: 'muted small', textContent: detail })),
      el('span', { className: s.pnlSol >= 0 ? 'up' : 'down', textContent: `${fmtSol(s.pnlSol)} (${fmtPct(s.pnlPct)})` }),
      btn);
  }));
}

function renderHistory() {
  const trades = [...st.ledger.trades].reverse();
  if (!trades.length) {
    $('#history').replaceChildren(el('p', { className: 'muted', textContent: 'No trades yet.' }));
    return;
  }
  $('#history').replaceChildren(...trades.map((t) => el('div', { className: 'trade' },
    el('span', { className: 'muted', textContent: new Date(t.ts).toLocaleTimeString() }),
    el('span', { className: t.side === 'buy' ? 'up' : 'down', textContent: t.side === 'buy' ? 'BUY' : 'SELL' }),
    el('b', { textContent: t.symbol }),
    el('span', { textContent: `${fmtSol(t.amountSol)} SOL` }),
    el('span', { className: 'muted', textContent: `MC ${fmtCompactUsd(t.mcUsd)}` }))));
}

function renderSettings() {
  const f = $('#sform');
  for (const k of ['startingBalance', 'platformFeePct', 'priorityFeeSol', 'slippagePct', 'pnlCurrency', 'displayName']) f.elements[k].value = st.settings[k];
  f.elements.buyPresets.value = st.settings.buyPresets.join(', ');
  f.elements.sellPresets.value = st.settings.sellPresets.join(', ');
  const av = st.avatar !== undefined ? st.avatar : st.settings.avatar;
  $('#avatarPreview').hidden = !av;
  if (av) $('#avatarPreview').src = av;
  const runs = [...st.ledger.pastRuns].reverse();
  $('#runs').replaceChildren(...(runs.length ? runs.map((r) => el('div', { className: 'muted small',
    textContent: `${new Date(r.startedAt).toLocaleDateString()} – ${new Date(r.endedAt).toLocaleDateString()}: ${r.trades.length} trades, ended ${fmtSol(r.endBalance)} SOL` }))
    : [el('p', { className: 'muted', textContent: 'None yet.' })]));
}

function render() {
  $('#bal').textContent = fmtSol(st.ledger.balance);
  renderPositions();
  renderHistory();
  renderSettings();
}

function showTab(name) {
  for (const b of document.querySelectorAll('nav button')) b.classList.toggle('on', b.dataset.tab === name);
  for (const s of document.querySelectorAll('section')) s.hidden = s.id !== name;
}
for (const b of document.querySelectorAll('nav button')) b.onclick = () => showTab(b.dataset.tab);
if (location.hash === '#settings') { document.body.classList.add('wide'); showTab('settings'); }

const nums = (s) => s.split(',').map((x) => Number(x.trim())).filter((x) => x > 0);

$('#avatar').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  st.avatar = await downscaleToDataUrl(file, 256, 256, 'image/png');
  renderSettings();
};

$('#sform').onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target.elements;
  const buyPresets = nums(f.buyPresets.value);
  const sellPresets = nums(f.sellPresets.value).filter((x) => x <= 100);
  if (!buyPresets.length || !sellPresets.length) { $('#saved').textContent = 'Presets need at least one number'; return; }
  const settings = {
    startingBalance: Number(f.startingBalance.value) || DEFAULT_SETTINGS.startingBalance,
    platformFeePct: Math.max(0, Number(f.platformFeePct.value) || 0),
    priorityFeeSol: Math.max(0, Number(f.priorityFeeSol.value) || 0),
    slippagePct: Math.max(0.1, Number(f.slippagePct.value) || DEFAULT_SETTINGS.slippagePct),
    buyPresets, sellPresets,
    pnlCurrency: f.pnlCurrency.value === 'SOL' ? 'SOL' : 'USD',
    displayName: f.displayName.value.trim(),
  };
  if (st.avatar !== undefined) settings.avatar = st.avatar;
  await send({ cmd: 'saveSettings', settings });
  $('#saved').textContent = 'Saved';
  setTimeout(() => ($('#saved').textContent = ''), 1500);
};

$('#reset').onclick = async () => {
  if (!confirm('Reset your SolSim balance? Current trades move to Past runs.')) return;
  await send({ cmd: 'reset' });
};

chrome.storage.onChanged.addListener((ch, area) => {
  if (area === 'local' && (ch.ledger || ch.settings)) load();
});
load();
