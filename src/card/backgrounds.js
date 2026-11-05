export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function radial(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export const BACKGROUNDS = [
  { id: 'starfield', name: 'Starfield', draw(ctx, w, h) {
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, w, h);
    radial(ctx, w * 0.75, h * 0.3, w * 0.45, 'rgba(120,60,255,0.35)');
    radial(ctx, w * 0.2, h * 0.8, w * 0.4, 'rgba(20,241,149,0.18)');
    const r = mulberry32(7);
    for (let i = 0; i < (w * h) / 2500; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`;
      ctx.beginPath(); ctx.arc(r() * w, r() * h, r() * 1.8 + 0.3, 0, Math.PI * 2); ctx.fill();
    }
  } },
  { id: 'aurora', name: 'Aurora', draw(ctx, w, h) {
    ctx.fillStyle = '#020a08'; ctx.fillRect(0, 0, w, h);
    const r = mulberry32(3);
    for (let i = 0; i < 7; i++) radial(ctx, r() * w, h * (0.2 + r() * 0.5), w * (0.25 + r() * 0.25), i % 2 ? 'rgba(20,241,149,0.28)' : 'rgba(153,69,255,0.28)');
  } },
  { id: 'synthgrid', name: 'Synth Grid', draw(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#12002b'); g.addColorStop(0.55, '#3a0a5e'); g.addColorStop(1, '#07000f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    radial(ctx, w / 2, h * 0.55, h * 0.35, 'rgba(255,90,170,0.45)');
    const hz = h * 0.58;
    ctx.strokeStyle = 'rgba(255,80,200,0.45)'; ctx.lineWidth = 2;
    for (let i = 1; i < 14; i++) { const y = hz + (h - hz) * Math.pow(i / 13, 2); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(w / 2 + i * w * 0.02, hz); ctx.lineTo(w / 2 + i * w * 0.16, h); ctx.stroke(); }
  } },
  { id: 'waves', name: 'Waves', draw(ctx, w, h) {
    ctx.fillStyle = '#03121a'; ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 2;
    for (let k = 0; k < 26; k++) {
      ctx.strokeStyle = `rgba(20,241,200,${0.05 + k * 0.012})`;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = h * 0.25 + k * h * 0.025 + Math.sin((x / w) * Math.PI * 3 + k * 0.35) * h * 0.06;
        if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  } },
  { id: 'bokeh', name: 'Bokeh', draw(ctx, w, h) {
    ctx.fillStyle = '#0a0710'; ctx.fillRect(0, 0, w, h);
    const r = mulberry32(11);
    for (let i = 0; i < 40; i++) {
      const c = r() < 0.5 ? '153,69,255' : '20,241,149';
      radial(ctx, r() * w, r() * h, 20 + r() * w * 0.08, `rgba(${c},${0.12 + r() * 0.25})`);
    }
  } },
  { id: 'carbon', name: 'Carbon', draw(ctx, w, h) {
    ctx.fillStyle = '#0b0d10'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 6;
    for (let x = -h; x < w; x += 18) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke(); }
    radial(ctx, w * 0.85, h * 0.1, w * 0.5, 'rgba(20,241,149,0.16)');
  } },
];
