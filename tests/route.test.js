import test from 'node:test';
import assert from 'node:assert/strict';
import { mintFromPath, symbolFromTitle } from '../src/shared/route.js';

const MINT = 'FakeMint' + '1'.repeat(29) + 'pump';
test('mintFromPath', () => {
  assert.equal(mintFromPath('/sol/token/' + MINT), MINT);
  assert.equal(mintFromPath('/sol/token/abc_' + MINT), MINT);
  assert.equal(mintFromPath('/sol/token/' + MINT + '?tab=holders'), MINT);
  assert.equal(mintFromPath('/?chain=sol'), null);
  assert.equal(mintFromPath('/eth/token/0xabc'), null);
});
test('symbolFromTitle', () => {
  assert.equal(symbolFromTitle('AMD ↑ $330.17K | GMGN.AI | The Fastest'), 'AMD');
  assert.equal(symbolFromTitle('trump $2.64K | GMGN.AI'), 'trump');
  assert.equal(symbolFromTitle(''), null);
});
