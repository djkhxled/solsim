export const MINT = 'FakeMint' + '1'.repeat(29) + 'pump';
export const NEXT = 'NextMint' + '1'.repeat(29) + 'pump';
export const tokenStatFrame = JSON.stringify({ channel: 'token_stat', data: [{ n: 'sol', a: MINT, p: '0.00033623933', t: 1793894859, p1m: '0.0003542399', b1m: 144, s1m: 72, v1m: '604.65132158' }] });
export const majorCoinFrame = JSON.stringify({ channel: 'major_coin_price', data: [{ ts: 1793894859932, s: 'BTC', p: '75686.86' }, { ts: 1793894859932, s: 'SOL', p: '90.04' }] });
export const poolBalanceFrame = JSON.stringify({ channel: 'pool_balance', data: [{ n: 'sol', a: MINT, b: '70754408.681329' }] });
export const infoResponse = JSON.stringify({ code: 0, reason: '', message: 'success', data: [
  { chain: 'sol', address: MINT, symbol: 'trump', name: 'the lame duck', decimals: 6, logo: 'https://gmgn.ai/external-res/fake_v2.webp', circulating_supply: '1000000000', total_supply: '1000000000', liquidity: '5711.46', price: { price: '0.0000026408225' } },
  { address: NEXT, symbol: 'NX', decimals: 6 },
] });
