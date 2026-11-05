export const LOGO_LINE = [[0.2, 0.7], [0.4, 0.5], [0.55, 0.62], [0.8, 0.3]];

// Solana's brand gradient, running from bottom-left (purple) to top-right (green).
export const LOGO_STOPS = [
  [0.08, '#9945FF'],
  [0.3, '#8752F3'],
  [0.5, '#5497D5'],
  [0.6, '#43B4CA'],
  [0.72, '#28E0B9'],
  [0.97, '#19FB9B'],
];

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// Colour at position t (0 = bottom-left, 1 = top-right) as [r, g, b].
export function gradientAt(t) {
  const stops = LOGO_STOPS;
  if (t <= stops[0][0]) return hex(stops[0][1]);
  for (let i = 1; i < stops.length; i++) {
    const [p1, c1] = stops[i];
    if (t <= p1) {
      const [p0, c0] = stops[i - 1];
      const k = (t - p0) / (p1 - p0);
      const a = hex(c0), b = hex(c1);
      return a.map((v, j) => Math.round(v + (b[j] - v) * k));
    }
  }
  return hex(stops[stops.length - 1][1]);
}

export function drawLogoMark(ctx, x, y, s) {
  ctx.save();
  const g = ctx.createLinearGradient(x, y + s, x + s, y);
  for (const [p, c] of LOGO_STOPS) g.addColorStop(p, c);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y, s, s, s * 0.22);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = s * 0.09;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  LOGO_LINE.forEach(([u, v], i) => (i ? ctx.lineTo(x + u * s, y + v * s) : ctx.moveTo(x + u * s, y + v * s)));
  ctx.stroke();
  ctx.restore();
}
