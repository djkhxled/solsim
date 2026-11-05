import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWsFrame, parseInfoResponse, parseFeedMessage } from '../src/feed/parse.js';
import { MINT, NEXT, tokenStatFrame, majorCoinFrame, poolBalanceFrame, infoResponse } from './fixtures/gmgn.js';

test('token_stat → price event', () => {
  assert.deepEqual(parseWsFrame(tokenStatFrame), [{ type: 'price', mint: MINT, priceUsd: 0.00033623933, ts: 1793894859000 }]);
});
test('major_coin_price → SOL only', () => {
  assert.deepEqual(parseWsFrame(majorCoinFrame), [{ type: 'sol', priceUsd: 90.04, ts: 1793894859932 }]);
});
test('ignored channels and garbage', () => {
  assert.deepEqual(parseWsFrame(poolBalanceFrame), []);
  assert.deepEqual(parseWsFrame('not json'), []);
  assert.deepEqual(parseWsFrame('{"channel":"token_stat","data":[{"n":"sol","a":"x","p":"abc"}]}'), []);
  assert.deepEqual(parseWsFrame('{"channel":"token_stat"}'), []);
});
test('info response', () => {
  assert.deepEqual(parseInfoResponse(infoResponse), [
    { type: 'info', mint: MINT, symbol: 'trump', name: 'the lame duck', logo: 'https://gmgn.ai/external-res/fake_v2.webp', decimals: 6, totalSupply: 1e9 },
    { type: 'info', mint: NEXT, symbol: 'NX', name: 'NX', logo: null, decimals: 6, totalSupply: null },
  ]);
  assert.deepEqual(parseInfoResponse('{"data":"nope"}'), []);
});
test('parseFeedMessage routes by kind', () => {
  assert.equal(parseFeedMessage({ kind: 'ws', data: tokenStatFrame }).length, 1);
  assert.equal(parseFeedMessage({ kind: 'http', data: infoResponse }).length, 2);
  assert.deepEqual(parseFeedMessage({ kind: 'other', data: tokenStatFrame }), []);
  assert.deepEqual(parseFeedMessage(null), []);
});
