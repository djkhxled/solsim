import test from 'node:test';
import assert from 'node:assert/strict';
import { addTick, findGaps, mergeSeries, lastPrice } from '../src/engine/ticks.js';

test('addTick appends and ignores non-increasing ts', () => {
  let t = addTick([], [1, 10]);
  t = addTick(t, [2, 11]);
  t = addTick(t, [2, 12]);
  assert.deepEqual(t, [[1, 10], [2, 11]]);
});
test('addTick halves when over max, keeping the last point', () => {
  let t = [];
  for (let i = 1; i <= 5; i++) t = addTick(t, [i, i], 4);
  assert.deepEqual(t, [[1, 1], [3, 3], [5, 5]]);
});
test('findGaps', () => {
  const ticks = [0, 2000, 4000, 6000, 8000, 10000].map((t) => [t, 1]);
  assert.deepEqual(findGaps(ticks, 0, 100000), [[10000, 100000]]);
  assert.deepEqual(findGaps([], 0, 100000), [[0, 100000]]);
  assert.deepEqual(findGaps(ticks, 0, 12000), []);
});
test('mergeSeries sorts and dedupes', () => {
  assert.deepEqual(mergeSeries([[1, 1], [3, 3]], [[2, 2], [3, 9]]), [[1, 1], [2, 2], [3, 3]]);
});
test('lastPrice', () => {
  assert.equal(lastPrice([[1, 5], [2, 6]]), 6);
  assert.equal(lastPrice([]), null);
});
