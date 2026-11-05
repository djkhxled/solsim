import { BACKGROUNDS } from './backgrounds.js';
import { SIZES, chartGeometry } from './model.js';
import { drawLogoMark } from '../shared/logo.js';

const FONT = '-apple-system, "Segoe UI", system-ui, sans-serif';
const GREEN = '#2EE6A6';
const RED = '#FF5470';

const LAYOUTS = {
  landscape: {
    logo: [64, 56, 64], brand: [144, 104], tag: [1536, 100], coin: [64, 236, 64], sym: [144, 282],
    pnl: [64, 440, 150, 780], pct: [64, 512], chart: { x: 880, y: 150, w: 656, h: 400 }, band: [0, 600, 1600, 300],
    stats: { x1: 64, v1: 230, x2: 700, v2: 860, y1: 700, y2: 770 }, name: [64, 846, 48], foot: [1536, 856],
  },
  portrait: {
    logo: [56, 56, 64], brand: [136, 104], tag: [1024, 100], coin: [56, 220, 64], sym: [136, 266],
    pnl: [56, 420, 140, 968], pct: [56, 490], chart: { x: 56, y: 560, w: 968, h: 360 }, band: [0, 960, 1080, 300],
    stats: { x1: 56, v1: 220, x2: 560, v2: 720, y1: 1060, y2: 1130 }, name: [56, 1290, 48], foot: [1024, 1300],
  },
};

function text(ctx, str, x, y, o) {
  let size = o.size;
  const setFont = () => (ctx.font = `${o.weight || 400} ${size}px ${FONT}`);
  setFont();
  if (o.maxWidth) while (size > 12 && ctx.measureText(str).width > o.maxWidth) { size -= 2; setFont(); }
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = o.color || '#fff';
  if (o.glow) {
    ctx.save();
    ctx.shadowColor = o.glow;
    ctx.shadowBlur = 40; ctx.fillText(str, x, y);
    ctx.shadowBlur = 16; ctx.fillText(str, x, y);
    ctx.restore();
  }
  ctx.fillText(str, x, y);
}

function circleImage(ctx, img, x, y, s) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2); ctx.clip();
  ctx.drawImage(img, x, y, s, s);
  ctx.restore();
}

function drawCoin(ctx, img, symbol, x, y, s) {
  if (img) return circleImage(ctx, img, x, y, s);
  ctx.fillStyle = '#2a2f3a';
  ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2); ctx.fill();
  text(ctx, (symbol || '?').slice(0, 1).toUpperCase(), x + s / 2, y + s * 0.68, { size: s * 0.5, weight: 800, align: 'center' });
}

function drawBackground(ctx, bg, w, h) {
  if (bg && bg.kind === 'upload' && bg.img) {
    const k = Math.max(w / bg.img.width, h / bg.img.height);
    const dw = bg.img.width * k, dh = bg.img.height * k;
    ctx.drawImage(bg.img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    return;
  }
  const b = BACKGROUNDS.find((x) => bg && x.id === bg.id) || BACKGROUNDS[0];
  b.draw(ctx, w, h);
}

function drawChart(ctx, model, box, neon) {
  const g = chartGeometry(model.series, model.markers, box);
  if (!g) return;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
  if (neon) { ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 18; }
  ctx.beginPath();
  g.path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
  for (const m of g.markers) {
    const c = m.side === 'B' ? GREEN : RED;
    ctx.save();
    ctx.beginPath(); ctx.arc(m.x, m.y, 16, 0, Math.PI * 2); ctx.fillStyle = c;
    if (neon) { ctx.shadowColor = c; ctx.shadowBlur = 20; }
    ctx.fill();
    ctx.restore();
    ctx.font = `800 18px ${FONT}`; ctx.fillStyle = '#0b0f14'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(m.side, m.x, m.y + 1);
  }
}

export function drawCard(ctx, model, opts, assets = {}) {
  const { w, h } = SIZES[opts.layout];
  const L = LAYOUTS[opts.layout];
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, opts.background, w, h);
  if (opts.overlay) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, w, h); }
  const [bx, by, bw, bh] = L.band;
  const band = ctx.createLinearGradient(0, by, 0, by + bh);
  band.addColorStop(0, 'rgba(0,0,0,0.25)'); band.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = band; ctx.fillRect(bx, by, bw, bh);

  drawLogoMark(ctx, L.logo[0], L.logo[1], L.logo[2]);
  text(ctx, 'SolSim', L.brand[0], L.brand[1], { size: 44, weight: 800 });
  text(ctx, 'PAPER TRADE', L.tag[0], L.tag[1], { size: 26, weight: 700, color: 'rgba(255,255,255,0.7)', align: 'right' });

  drawCoin(ctx, assets.coinImg, model.symbol, L.coin[0], L.coin[1], L.coin[2]);
  text(ctx, model.symbol, L.sym[0], L.sym[1], { size: 52, weight: 800, maxWidth: 600 });

  const col = model.positive ? GREEN : RED;
  text(ctx, model.pnlText, L.pnl[0], L.pnl[1], { size: L.pnl[2], weight: 900, color: col, glow: opts.neon ? col : null, maxWidth: L.pnl[3] });
  text(ctx, model.pctText, L.pct[0], L.pct[1], { size: 44, weight: 700, color: col });

  drawChart(ctx, model, L.chart, opts.neon);

  const s = L.stats;
  const cells = [[s.x1, s.v1, s.y1], [s.x2, s.v2, s.y1], [s.x1, s.v1, s.y2], [s.x2, s.v2, s.y2]];
  model.stats.forEach((st, i) => {
    const [x, vx, y] = cells[i];
    text(ctx, st.label, x, y, { size: 34, weight: 600, color: 'rgba(255,255,255,0.6)' });
    text(ctx, st.value, vx, y, {
      size: 38, weight: 800,
      color: st.tone === 'up' ? GREEN : st.tone === 'down' ? RED : '#fff',
      maxWidth: i % 2 === 0 ? s.x2 - s.v1 - 24 : w - s.v2 - 48,
    });
  });

  const [nx, ny, ns] = L.name;
  let tx = nx;
  if (assets.avatarImg) { circleImage(ctx, assets.avatarImg, nx, ny - ns * 0.75, ns); tx += ns + 16; }
  if (model.displayName) text(ctx, model.displayName, tx, ny, { size: 34, weight: 700 });
  text(ctx, model.isOpen ? 'Position open · SolSim' : 'SolSim', L.foot[0], L.foot[1], { size: 26, weight: 600, color: 'rgba(255,255,255,0.55)', align: 'right' });
  ctx.restore();
}
