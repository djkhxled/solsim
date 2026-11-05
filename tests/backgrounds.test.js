import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKGROUNDS, mulberry32 } from '../src/card/backgrounds.js';

test('six unique backgrounds', () => {
  assert.deepEqual(BACKGROUNDS.map((b) => b.id), ['starfield', 'aurora', 'synthgrid', 'waves', 'bokeh', 'carbon']);
});
test('mulberry32 is deterministic', () => {
  const a = mulberry32(7), b = mulberry32(7);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
  const v = mulberry32(1)();
  assert.ok(v >= 0 && v < 1);
});
