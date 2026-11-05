# SolSim Privacy Policy

_Last updated: November 5, 2026_

SolSim is a paper-trading extension for gmgn.ai. It is a free hobby project. This page explains exactly what it does with data.

## What SolSim does not do
- It does **not** collect, sell or share any personal information.
- It does **not** connect to your crypto wallet, read private keys, sign transactions or make real trades.
- It does **not** use analytics, tracking, ads or cookies.
- It does **not** send your trades, balance or settings anywhere. There is no SolSim server.

## Data stored on your device
SolSim saves the following in your browser's local extension storage (`chrome.storage.local`). It never leaves your computer:
- your fake SOL balance, paper trades, positions, limit orders and past runs
- your settings (fees, slippage, presets, display name)
- an optional avatar and background images you upload for PnL cards
- recent prices for coins you hold, to draw the chart on PnL cards

You can delete all of it at any time by removing the extension.

## Data SolSim reads
- **gmgn.ai pages you open:** SolSim reads the coin prices, coin name, logo, supply and liquidity that gmgn.ai is already sending to your browser, so paper trades fill at the price on screen. It does not read your GMGN account, wallet or any other page content.

## Network requests
SolSim only contacts these public price services, and only sends the address of the coin being priced:
- **Jupiter** (lite-api.jup.ag): backup coin and SOL prices
- **DexScreener** (api.dexscreener.com): backup coin prices
- **GeckoTerminal** (api.geckoterminal.com): price history for PnL card charts
- **gmgn.ai**: to download a coin's logo for PnL cards

No identifying information is included in these requests.

## Contact
Questions: open an issue at https://github.com/djkhxled/solsim/issues
