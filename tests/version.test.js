import test from 'node:test';
import assert from 'node:assert/strict';
import { isStale } from '../src/shared/version.js';

test('stale when the files on disk are a different version than what Chrome is running', () => {
  assert.equal(isStale('0.1.2', '0.1.3'), true);
  assert.equal(isStale('0.1.3', '0.1.3'), false);
});
test('unknown disk version is never treated as stale', () => {
  assert.equal(isStale('0.1.3', null), false);
  assert.equal(isStale('0.1.3', undefined), false);
  assert.equal(isStale(undefined, '0.1.3'), false);
});
