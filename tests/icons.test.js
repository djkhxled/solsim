import test from 'node:test';
import assert from 'node:assert/strict';
import { encodePng, renderIcon } from '../tools/make-icons.mjs';

test('renderIcon has transparent corner and opaque center', () => {
  const s = 32, px = renderIcon(s);
  assert.equal(px[3], 0);
  assert.equal(px[((s / 2) * s + 4) * 4 + 3], 255);
});
test('encodePng writes a PNG signature', () => {
  const png = encodePng(2, 2, Buffer.alloc(16));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});

import { LOGO_STOPS, gradientAt } from '../src/shared/logo.js';
test('logo uses the Solana gradient stops', () => {
  assert.equal(LOGO_STOPS[0][1], '#9945FF');
  assert.equal(LOGO_STOPS[LOGO_STOPS.length - 1][1], '#19FB9B');
  assert.deepEqual(gradientAt(0), [0x99, 0x45, 0xff]);
  assert.deepEqual(gradientAt(1), [0x19, 0xfb, 0x9b]);
});
test('icon runs purple bottom-left to green top-right', () => {
  const s = 64, px = renderIcon(s);
  const at = (x, y) => [...px.subarray((y * s + x) * 4, (y * s + x) * 4 + 3)];
  const [r1, g1] = at(12, s - 12); // bottom-left
  const [r2, g2] = at(s - 12, 12); // top-right
  assert.ok(r1 > g1, `bottom-left should be purple, got ${at(12, s - 12)}`);
  assert.ok(g2 > r2, `top-right should be green, got ${at(s - 12, 12)}`);
});
