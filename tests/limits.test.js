import test from 'node:test';
import assert from 'node:assert/strict';
import { makeLimit, isTriggered, triggeredLimits } from '../src/engine/limits.js';

const args = { id: 'l1', posId: 'p', mint: 'm', fraction: 0.5 };
test('direction from current MC', () => {
  assert.equal(makeLimit({ ...args, triggerMcUsd: 100000, currentMcUsd: 50000 }).limit.direction, 'above');
  assert.equal(makeLimit({ ...args, triggerMcUsd: 20000, currentMcUsd: 50000 }).limit.direction, 'below');
});
test('validation', () => {
  assert.equal(makeLimit({ ...args, triggerMcUsd: 0, currentMcUsd: 5 }).ok, false);
  assert.equal(makeLimit({ ...args, fraction: 0, triggerMcUsd: 9, currentMcUsd: 5 }).ok, false);
  assert.equal(makeLimit({ ...args, triggerMcUsd: 9, currentMcUsd: 0 }).ok, false);
  assert.equal(makeLimit({ ...args, triggerMcUsd: 5, currentMcUsd: 5 }).ok, false);
});
test('triggering', () => {
  const up = makeLimit({ ...args, triggerMcUsd: 100, currentMcUsd: 50 }).limit;
  const down = makeLimit({ ...args, id: 'l2', triggerMcUsd: 20, currentMcUsd: 50 }).limit;
  assert.ok(isTriggered(up, 100)); assert.ok(!isTriggered(up, 99));
  assert.ok(isTriggered(down, 20)); assert.ok(!isTriggered(down, 21));
  assert.deepEqual(triggeredLimits([up, down], 'm', 150).map((l) => l.id), ['l1']);
  assert.deepEqual(triggeredLimits([up, down], 'other', 150), []);
  assert.deepEqual(triggeredLimits([up, down], 'm', NaN), []);
});
