import test from 'node:test';
import assert from 'node:assert/strict';
import { SOL_MINT, parseJupiter, parseDexScreener, parseGeckoPools, parseGeckoOhlcv, backupPrice, priceHistory, bytesToDataUrl } from '../src/background/apis.js';

const M = 'FakeMint' + '1'.repeat(29) + 'pump';
test('parseJupiter', () => {
  assert.equal(parseJupiter({ [M]: { usdPrice: 0.5 } }, M), 0.5);
  assert.equal(parseJupiter({}, M), null);
  assert.equal(parseJupiter(null, M), null);
});
test('parseDexScreener picks deepest matching pair', () => {
  const j = [
    { baseToken: { address: M }, priceUsd: '0.1', liquidity: { usd: 10 } },
    { baseToken: { address: M }, priceUsd: '0.2', liquidity: { usd: 99 } },
    { baseToken: { address: 'x' }, priceUsd: '9', liquidity: { usd: 1e9 } },
  ];
  assert.equal(parseDexScreener(j, M), 0.2);
  assert.equal(parseDexScreener({}, M), null);
});
test('gecko parsers', () => {
  assert.equal(parseGeckoPools({ data: [{ attributes: { address: 'POOL' } }] }), 'POOL');
  assert.equal(parseGeckoPools({ data: [] }), null);
  assert.deepEqual(parseGeckoOhlcv({ data: { attributes: { ohlcv_list: [[20, 1, 1, 1, 2, 0], [10, 1, 1, 1, 1, 0], [30, 0, 0, 0, 0, 0]] } } }), [[10000, 1], [20000, 2]]);
  assert.deepEqual(parseGeckoOhlcv({}), []);
});
test('backupPrice falls back from Jupiter to DexScreener, then null', async () => {
  const jupFails = async (url) => { if (url.includes('jup.ag')) throw new Error('down'); return [{ baseToken: { address: M }, priceUsd: '0.3', liquidity: { usd: 1 } }]; };
  assert.deepEqual(await backupPrice(M, jupFails), { priceUsd: 0.3, solUsd: null, source: 'dexscreener' });
  const jupOk = async () => ({ [M]: { usdPrice: 0.4 }, [SOL_MINT]: { usdPrice: 150 } });
  assert.deepEqual(await backupPrice(M, jupOk), { priceUsd: 0.4, solUsd: 150, source: 'jupiter' });
  assert.equal(await backupPrice(M, async () => { throw new Error('x'); }), null);
});
test('priceHistory filters to the window', async () => {
  const f = async (url) => (url.includes('/pools?') ? { data: [{ attributes: { address: 'P' } }] } : { data: { attributes: { ohlcv_list: [[100, 0, 0, 0, 1, 0], [500, 0, 0, 0, 2, 0], [100000, 0, 0, 0, 3, 0]] } } });
  assert.deepEqual(await priceHistory(M, 400000, 600000, f), [[500000, 2]]);
  assert.deepEqual(await priceHistory(M, 0, 1, async () => { throw new Error('x'); }), []);
});
test('bytesToDataUrl', () => {
  assert.equal(bytesToDataUrl(new Uint8Array([104, 105]), 'text/plain'), 'data:text/plain;base64,aGk=');
});
