import test from 'node:test';
import assert from 'node:assert/strict';
import { initialPriceState, reducePrice, needsBackup, canTrade } from '../src/feed/priceState.js';

const M = 'mintA';
const live = (s, p, now) => reducePrice(s, { type: 'live', mint: M, priceUsd: p }, now);

test('waiting → live', () => {
  const s = live(initialPriceState(M, 0), 0.001, 100);
  assert.equal(s.status, 'live'); assert.equal(s.priceUsd, 0.001); assert.equal(s.source, 'live');
  assert.ok(canTrade(s)); assert.ok(!needsBackup(s));
});
test('other mint ignored', () => {
  const s = reducePrice(initialPriceState(M, 0), { type: 'live', mint: 'other', priceUsd: 1 }, 10);
  assert.equal(s.status, 'waiting');
});
test('live goes backup after 3s, stale after 5s', () => {
  let s = live(initialPriceState(M, 0), 0.001, 1000);
  s = reducePrice(s, { type: 'tick' }, 3500);
  assert.equal(s.status, 'live');
  s = reducePrice(s, { type: 'tick' }, 4100);
  assert.equal(s.status, 'backup'); assert.ok(needsBackup(s)); assert.ok(canTrade(s));
  s = reducePrice(s, { type: 'backup', mint: M, priceUsd: 0.002 }, 4200);
  assert.equal(s.priceUsd, 0.002); assert.equal(s.source, 'backup');
  s = reducePrice(s, { type: 'tick' }, 9300);
  assert.equal(s.status, 'stale'); assert.ok(!canTrade(s)); assert.ok(needsBackup(s));
  s = live(s, 0.003, 9400);
  assert.equal(s.status, 'live');
});
test('backup ignored while live', () => {
  const s = reducePrice(live(initialPriceState(M, 0), 0.001, 0), { type: 'backup', mint: M, priceUsd: 9 }, 10);
  assert.equal(s.priceUsd, 0.001);
});
test('waiting with no feed: backup with no price, then stale on failure', () => {
  let s = reducePrice(initialPriceState(M, 0), { type: 'tick' }, 3100);
  assert.equal(s.status, 'backup'); assert.equal(s.priceUsd, null); assert.ok(!canTrade(s));
  s = reducePrice(s, { type: 'backupFail' }, 3200);
  assert.equal(s.status, 'stale');
  s = reducePrice(s, { type: 'backup', mint: M, priceUsd: 0.5 }, 3300);
  assert.equal(s.status, 'backup'); assert.ok(canTrade(s));
});
test('backupFail with fresh price keeps backup', () => {
  let s = reducePrice(live(initialPriceState(M, 0), 1, 0), { type: 'tick' }, 3100);
  s = reducePrice(s, { type: 'backupFail' }, 3200);
  assert.equal(s.status, 'backup');
});
