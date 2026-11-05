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
