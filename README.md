# SolSim

An open source **VIBECODED** paper trading tool to trade Solana memecoins on gmgn.ai and make PnL cards. **SolSim never touches your wallet.** It has no wallet permissions and no signing code. It reads prices and keeps a fake SOL balance on your computer.

## Features

**Trade on GMGN with fake SOL**
- A draggable, collapsible panel shows up on every Solana coin page on gmgn.ai
- Start with 10 fake SOL (change it in Settings) and Reset any time. Old runs are saved, not deleted
- Buy presets (0.1 to 20 SOL) or any custom amount
- Sell by % (10/25/50/100 or custom), **Sell Init** to pull out your initial, and **limit sells / stop-losses** at a market cap you pick
- Live position row: Invested, Sold, Remaining and PnL %

**Prices from GMGN itself**
- Reads GMGN's own live price feed, so fills match the chart you're looking at, several updates a second
- Falls back to Jupiter, then DexScreener, if GMGN's feed goes quiet. The panel badge shows **Live**, **Backup price** or **No price**

**Realistic fills**
- 1% platform fee and your priority fee on every trade
- Price impact based on the coin's liquidity: big buys into thin coins fill worse, like real trading
- Slippage works like GMGN: it's a max. A trade whose impact is bigger fails instead of filling

**PnL cards**
- One click from any position, open or closed
- Big PnL in USD or SOL, PNL / Sold / Hold / Bought, and a price line with your buy (B) and sell (S) points
- Landscape or portrait, Neon Glow and Dark Overlay toggles
- 6 built-in backgrounds or upload your own. Add your display name and avatar
- Download PNG, copy to clipboard, or Share to X

**Safe by design**
- No wallet connection, no private keys, no signing, no real trades
- No remote code: everything runs from the folder you install
- Only talks to gmgn.ai, Jupiter, DexScreener and GeckoTerminal
- Your balance and trades stay in your browser

## Install
1. Download the latest zip from [Releases](https://github.com/djkhxled/solsim/releases) and unzip it. You'll get a `solsim` folder.
2. Open `chrome://extensions` in Chrome (Brave and Edge work too).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and pick the `solsim` folder.
5. Pin SolSim from the puzzle-piece menu.

Don't delete or move the folder afterwards. Chrome runs the extension from it.

**Updating:** replace the `solsim` folder with the new one, then click ↻ on SolSim in `chrome://extensions` and reload the GMGN tab. Your balance and trades are kept.

## Use
- Open any Solana coin on gmgn.ai. The SolSim panel appears. Drag it by its header.
- Click the toolbar icon for positions, history, settings, Reset and **Make card**.
- Limit sells only fire while that coin is open in a tab.

## Develop
```bash
npm test
```
