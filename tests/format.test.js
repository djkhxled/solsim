import test from 'node:test';
import assert from 'node:assert/strict';
import { fmtCompactUsd, fmtUsd, fmtSol, fmtPct, parseCompact } from '../src/shared/format.js';

test('fmtCompactUsd', () => {
  assert.equal(fmtCompactUsd(330170), '$330.17K');
  assert.equal(fmtCompactUsd(2640000), '$2.64M');
  assert.equal(fmtCompactUsd(12.5), '$12.50');
  assert.equal(fmtCompactUsd(-1500), '-$1.50K');
  assert.equal(fmtCompactUsd(NaN), '—');
});
test('fmtUsd', () => {
  assert.equal(fmtUsd(-0.106), '-$0.106');
  assert.equal(fmtUsd(2.79), '$2.79');
  assert.equal(fmtUsd(0), '$0');
  assert.equal(fmtUsd(12300), '$12.30K');
});
test('fmtSol', () => {
  assert.equal(fmtSol(3.36), '3.36');
  assert.equal(fmtSol(10), '10');
  assert.equal(fmtSol(-0.0004), '0');
  assert.equal(fmtSol(0.1234), '0.123');
  assert.equal(fmtSol(250.56), '250.6');
});
test('fmtPct', () => {
  assert.equal(fmtPct(12.3), '+12.30%');
  assert.equal(fmtPct(-3.41), '-3.41%');
  assert.equal(fmtPct(342.4), '+342%');
  assert.equal(fmtPct(0), '0.00%');
});
test('parseCompact', () => {
  assert.equal(parseCompact('100k'), 100000);
  assert.equal(parseCompact('1.5M'), 1500000);
  assert.equal(parseCompact('$2.5k'), 2500);
  assert.equal(parseCompact('250000'), 250000);
  assert.equal(parseCompact('abc'), null);
  assert.equal(parseCompact(''), null);
});
