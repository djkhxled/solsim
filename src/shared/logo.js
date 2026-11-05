export const LOGO_LINE = [[0.2, 0.7], [0.4, 0.5], [0.55, 0.62], [0.8, 0.3]];

export function drawLogoMark(ctx, x, y, s) {
  ctx.save();
  const g = ctx.createLinearGradient(x, y, x + s, y + s);
  g.addColorStop(0, '#14F195');
  g.addColorStop(1, '#9945FF');
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
