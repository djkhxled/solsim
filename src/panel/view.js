import { fmtSol, fmtCompactUsd, fmtPct, parseCompact } from '../shared/format.js';

const HTML = `
<div class="panel">
  <div class="hdr" data-drag>
    <span class="mark"></span><span class="title">SolSim</span>
    <span class="bal"><b data-bal>—</b> SOL</span>
    <button class="icon" data-act="settings" title="Settings">⚙</button>
    <button class="icon" data-act="collapse" title="Collapse">▾</button>
  </div>
  <div class="body">
    <div class="stale" data-stale hidden>SolSim was updated. Go to chrome://extensions, click ↻ on SolSim, then reload this tab. Trading is paused until then.</div>
    <div class="status"><span class="badge" data-badge></span><span class="mc" data-mc></span></div>
    <div class="sect">Buy <span data-sym></span></div>
    <div class="grid" data-buys></div>
    <div class="custom">
      <input data-buyamt type="number" min="0" step="0.01" placeholder="Amount (SOL)">
      <button class="buy" data-act="buycustom">Buy</button>
    </div>
    <div class="sect">Sell</div>
    <div class="stats">
      <div><label>Invested</label><span data-inv>–</span></div>
      <div><label>Sold</label><span data-sold>–</span></div>
      <div><label>Remaining</label><span data-rem>–</span></div>
      <div><label>PnL</label><span data-pnl>–</span></div>
    </div>
    <div class="grid" data-sells></div>
    <div class="custom">
      <input data-sellpct type="number" min="1" max="100" placeholder="%">
      <button class="sell" data-act="sellcustom">Sell</button>
      <button class="ghost" data-act="sellinit">Sell Init</button>
      <button class="ghost" data-act="limit">Limit</button>
    </div>
    <div class="limitform" data-limitform hidden>
      <input data-limmc placeholder="MC e.g. 100k">
      <input data-limpct type="number" min="1" max="100" placeholder="% to sell">
      <button class="sell" data-act="limitsave">Set</button>
      <div class="note">Limits only fire while this coin is open in a tab.</div>
    </div>
    <div class="limits" data-limits></div>
    <button class="ghost wide" data-act="card">Make PnL card</button>
    <div class="toast" data-toast></div>
  </div>
</div>`;

export function createView(h) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;z-index:2147483000;left:16px;top:140px;display:none;';
  const root = host.attachShadow({ mode: 'closed' });
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('src/panel/panel.css');
  const tpl = document.createElement('template');
  tpl.innerHTML = HTML.trim();
  root.append(link, tpl.content);
  document.documentElement.append(host);
  const $ = (s) => root.querySelector(s);

  let collapsed = false;
  let lastVm = null;
  let presetKey = '';
  let toastTimer = 0;

  function place(x, y) {
    const w = host.offsetWidth || 290;
    host.style.left = Math.min(Math.max(0, x), window.innerWidth - w) + 'px';
    host.style.top = Math.min(Math.max(0, y), window.innerHeight - 40) + 'px';
  }
  function setCollapsed(v, save) {
    collapsed = v;
    $('.body').hidden = v;
    $('[data-act=collapse]').textContent = v ? '▸' : '▾';
    if (save) chrome.storage.local.set({ panelCollapsed: v });
  }
  chrome.storage.local.get(['panelPos', 'panelCollapsed']).then((o) => {
    if (o.panelPos) place(o.panelPos.x, o.panelPos.y);
    setCollapsed(!!o.panelCollapsed, false);
  });

  const handle = $('[data-drag]');
  let drag = null;
  handle.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    const r = host.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', (e) => { if (drag) place(e.clientX - drag.dx, e.clientY - drag.dy); });
  handle.addEventListener('pointerup', () => {
    if (!drag) return;
    drag = null;
    chrome.storage.local.set({ panelPos: { x: parseFloat(host.style.left), y: parseFloat(host.style.top) } });
  });

  // Keep GMGN hotkeys from firing while typing in the panel.
  for (const t of ['keydown', 'keyup', 'keypress']) root.addEventListener(t, (e) => e.stopPropagation());

  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.buy) return h.onBuy(Number(b.dataset.buy));
    if (b.dataset.sell) return h.onSell(Number(b.dataset.sell));
    if (b.dataset.cancel) return h.onLimitCancel(b.dataset.cancel);
    switch (b.dataset.act) {
      case 'settings': return h.onSettings();
      case 'collapse': return setCollapsed(!collapsed, true);
      case 'buycustom': return h.onBuy(Number($('[data-buyamt]').value));
      case 'sellcustom': return h.onSell(Number($('[data-sellpct]').value));
      case 'sellinit': return h.onSellInit();
      case 'limit': $('[data-limitform]').hidden = !$('[data-limitform]').hidden; return;
      case 'limitsave':
        return h.onLimitAdd({ mcUsd: parseCompact($('[data-limmc]').value), pct: Number($('[data-limpct]').value) });
      case 'card': return lastVm && lastVm.cardPosId && h.onCard(lastVm.cardPosId);
    }
  });

  function fillButtons(el, vals, kind, label) {
    el.replaceChildren(...vals.map((v) => {
      const b = document.createElement('button');
      b.className = kind;
      b.dataset[kind] = String(v);
      b.textContent = label(v);
      return b;
    }));
  }

  function render(vm) {
    lastVm = vm;
    host.style.display = vm.visible ? 'block' : 'none';
    if (!vm.visible) return;
    $('[data-stale]').hidden = !vm.stale;
    $('[data-bal]').textContent = fmtSol(vm.balance);
    const badge = $('[data-badge]');
    badge.textContent = vm.badge.text;
    badge.className = 'badge ' + vm.badge.status;
    $('[data-mc]').textContent = vm.mcUsd ? 'MC ' + (vm.mcEstimated ? '~' : '') + fmtCompactUsd(vm.mcUsd) : '';
    $('[data-sym]').textContent = vm.symbol;
    const key = vm.buyPresets.join() + '|' + vm.sellPresets.join();
    if (key !== presetKey) {
      presetKey = key;
      fillButtons($('[data-buys]'), vm.buyPresets, 'buy', (v) => `${v} SOL`);
      fillButtons($('[data-sells]'), vm.sellPresets, 'sell', (v) => `${v}%`);
    }
    root.querySelectorAll('[data-buy],[data-act=buycustom]').forEach((b) => (b.disabled = !vm.canTrade));
    root.querySelectorAll('[data-sell],[data-act=sellcustom],[data-act=limit],[data-act=limitsave]').forEach((b) => (b.disabled = !vm.canTrade || !vm.pos));
    $('[data-act=sellinit]').disabled = !vm.canTrade || !vm.canSellInit;
    const p = vm.pos;
    $('[data-inv]').textContent = p ? fmtSol(p.invested) : '–';
    $('[data-sold]').textContent = p ? fmtSol(p.sold) : '–';
    $('[data-rem]').textContent = p ? fmtSol(p.remaining) : '–';
    const pnl = $('[data-pnl]');
    pnl.textContent = p ? fmtPct(p.pnlPct) : '–';
    pnl.title = p ? `${fmtSol(p.pnlSol)} SOL` : '';
    pnl.className = p ? (p.pnlSol >= 0 ? 'up' : 'down') : '';
    $('[data-limits]').replaceChildren(...vm.limits.map((l) => {
      const row = document.createElement('div');
      row.className = 'lim';
      const t = document.createElement('span');
      t.textContent = l.text;
      const x = document.createElement('button');
      x.className = 'icon';
      x.textContent = '✕';
      x.dataset.cancel = l.id;
      row.append(t, x);
      return row;
    }));
    $('[data-act=card]').hidden = !vm.cardPosId;
  }

  function toast(text, kind) {
    const t = $('[data-toast]');
    t.textContent = text;
    t.className = 'toast show ' + (kind || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = 'toast'), 2500);
  }

  function clearLimitForm() {
    $('[data-limmc]').value = '';
    $('[data-limpct]').value = '';
    $('[data-limitform]').hidden = true;
  }

  return { render, toast, clearLimitForm, destroy: () => host.remove() };
}
