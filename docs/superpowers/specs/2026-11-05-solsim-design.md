# SolSim — design spec

Date: 2026-11-05
Status: approved in chat, awaiting written-spec review

## 1. What it is

SolSim is a Chrome extension (Manifest V3) for **paper trading Solana memecoins on gmgn.ai** and making **PnL share cards** of those paper trades. It replaces MockApe with code the user owns.

### Hard rules
- **No wallet access.** No wallet permissions, no signing code, no private keys, and no real trades. SolSim only reads prices and keeps a fake SOL balance.
- **No remote code.** All JS ships in the extension folder. Nothing is fetched and executed.
- **Network access is limited to:** gmgn.ai (reading its feed and coin logos), Jupiter and DexScreener (backup prices), GeckoTerminal (price-history backfill).
- **Data stays local** in `chrome.storage.local`.
- **No GMGN branding** on cards: no GMGN logo, artwork or invite code.

### Out of scope for v1
Chains other than Solana. Trading Recap video. Period (daily or weekly) PnL cards. Limit orders that fire with no GMGN tab open. Limit *buys*. DCA.

## 2. Architecture

Plain JavaScript (ES modules), no build step. Load the `solsim/` folder unpacked in Chrome.

```
solsim/
  manifest.json
  src/feed/        hook.js (MAIN world), parse.js (pure)
  src/engine/      fills.js, positions.js, limits.js (pure)
  src/store/       store.js (chrome.storage wrapper)
  src/background/  worker.js
  src/panel/       panel.js (content script, Shadow DOM), panel.css
  src/popup/       popup.html/js/css
  src/card/        studio.html/js/css, render.js, backgrounds.js
  assets/          icons, SolSim logo
  tests/           node:test suites + fixtures/
```

| Unit | Job | Talks to |
|---|---|---|
| **feed/hook.js** | Runs in the page's MAIN world at `document_start` on `https://gmgn.ai/*`. Wraps `WebSocket` and `fetch`/XHR to **copy** incoming data. Never sends, alters or blocks anything. Forwards the raw messages it cares about to the panel via `window.postMessage` with a fixed `source: "solsim-feed"` tag. | panel (postMessage) |
| **feed/parse.js** | Pure functions that turn raw GMGN messages into `{type:"price", mint, priceUsd, ts}`, `{type:"sol", priceUsd, ts}` or `{type:"info", mint, symbol, name, logo, decimals, totalSupply}`. Returns `null` on unknown shapes. This file and hook.js are the only code that knows GMGN's format. | — |
| **panel** | Isolated-world content script on `gmgn.ai/sol/token/*`. Draggable, collapsible floating panel in a Shadow DOM. Shows the price state, balance, buy presets, sell buttons and the position row. Follows SPA navigation (URL polling + `popstate`). Records price ticks while a position is open. | hook (postMessage), worker (runtime messages) |
| **background/worker.js** | Single writer for trades: serializes every buy and sell so tabs can't double-spend. Backup prices (Jupiter → DexScreener). Fetches coin logos as data URLs for the canvas. GeckoTerminal OHLCV backfill. | store, external APIs |
| **engine** | Pure fill math, position accounting, limit-trigger checks. | — |
| **store** | Typed get/set for balance, settings, positions, trades, ticks, past runs, panel position, card prefs. | chrome.storage.local |
| **popup** | Balance, open positions, trade history, settings, Reset, a **Make card** button per position. | worker, store |
| **card studio** | Extension page `src/card/studio.html?pos=<id>`. Canvas renderer plus controls. Exports. | store, worker |

## 3. The GMGN feed (observed 2026-11-05)

WebSocket: `wss://ws.gmgn.ai/v2/ws?...` sends JSON text frames shaped like `{"channel": "...", "data": [ ... ]}`. The client sends heartbeats like `{"action":"heartbeat",...}` every ~5 s.

Channels SolSim uses:
- **`token_stat`**: `data[i] = { n:"sol", a:<mint>, p:"<price USD>", t:<unix s>, p1m, p5m, ... }`. Arrives ~3–5×/s for the open coin. `p` is the **last trade price**, so it alternates by about the pool spread (~1%) between buy and sell prints. SolSim uses the latest `p`.
- **`major_coin_price`**: `data[i] = { ts:<ms>, s:"SOL"|"BTC"|"ETH"|"BNB", p:"<USD>" }`. SolSim uses `s === "SOL"`.

HTTP responses caught by the fetch/XHR wrap on page load:
- **`/api/v1/mutil_window_token_info`** (sic) and **`/mrwapi/v1/multi_token_info`**: `data[i]` has `address, symbol, name, decimals, logo, total_supply, circulating_supply, price{...}`.

Other channels (`token_activity`, `pool_balance`, `token_page`, …) are ignored in v1.

Market cap = `priceUsd × totalSupply`. If info hasn't arrived, the default supply is 1,000,000,000 (standard for pump.fun), and a small "~" marks the MC as estimated.

Test fixtures: real frames saved to `tests/fixtures/` with mint and wallet addresses replaced by fake base58 strings.

## 4. Price state machine (per panel)

```
waiting ──first token_stat for this mint──► live
live ──no token_stat for 3 s──► backup (ask worker: Jupiter, then DexScreener, every 2 s)
backup ──token_stat arrives──► live
backup ──backup fails, or last price > 5 s old──► stale (trade buttons disabled, "No price")
stale ──any price──► live / backup
```
- The panel badge shows: **Live** (green), **Backup price** (yellow), **No price** (red), **Waiting for price…** (grey).
- On a coin switch, the state resets to `waiting` for the new mint.
- SOL/USD comes from `major_coin_price`. Backup is Jupiter's SOL price. Last known value is cached in store.

## 5. Trading engine

Settings (defaults): `startingBalance 10 SOL`, `platformFeePct 1`, `priorityFeeSol 0.005`, `slippagePct 1`, `buyPresets [0.1,0.2,0.5,1,3,5,10,20]`, `sellPresets [10,25,50,100]`, `pnlCurrency "USD"`, `displayName ""`.

**Buy `amountSol`** at live token price `pSol` (SOL per token = priceUsd / solUsd):
```
platformFee = amountSol × platformFeePct/100
fillPrice   = pSol × (1 + slippagePct/100)
tokens      = (amountSol − platformFee) / fillPrice
balance    -= amountSol + priorityFeeSol
position.invested += amountSol + priorityFeeSol
position.tokens   += tokens
```
The buy is rejected if `amountSol + priorityFeeSol > balance` or `amountSol <= 0`.

**Sell `fraction` (0–1]** of held tokens:
```
tokensOut  = position.tokens × fraction
fillPrice  = pSol × (1 − slippagePct/100)
gross      = tokensOut × fillPrice
proceeds   = gross − gross×platformFeePct/100 − priorityFeeSol   (floored at 0)
balance   += proceeds
position.sold   += proceeds
position.tokens -= tokensOut
```

**Sell Initials:** sell the fraction whose proceeds equal `invested − sold` (clamped to (0, 1]). It's disabled when `sold ≥ invested` or `tokens == 0`. The formula inverts the sell math: `gross = (target + priorityFeeSol)/(1 − fee)`, `fraction = gross / (tokens × fillPrice)`.

**Custom amount:** the panel has an input for any SOL amount (buy) or any % (sell), like MockApe's "Amount (SOL)" field.

**Position row** (MockApe-style): Invested, Sold, Remaining (`tokens × pSol × (1 − slippagePct/100)`, i.e. what you'd get selling now before fees), PnL change (`sold + remaining − invested`, shown in SOL and %).

A position **closes** when `tokens` drops below dust (1e-9 of the original) and stays in history as closed. Buying again later opens a new position.

**Every trade record:** `{id, posId, mint, side, ts, amountSol, tokens, priceUsd, solUsd, mcUsd, fillPriceSol, platformFee, priorityFee, source:"live"|"backup"}`.

**Limit sells:** `{posId, triggerMcUsd, fraction, direction:"above"|"below"}`. Direction is set from the trigger vs the current MC when created, so stop-losses work too. Checked on every price tick in any open GMGN tab for that mint. When one triggers, it sends `{cmd:"limitFire", limitId}` to the worker, which (inside its queue) checks the limit still exists, removes it, and runs the sell. Two tabs firing the same limit therefore sell once. The panel shows "Limits only fire while this coin is open in a tab."

**Concurrency:** panels send `{cmd:"trade", ...}` to the worker. The worker applies trades one at a time (promise queue) against the store and broadcasts the new state to every tab and the popup.

**Reset:** after a confirm dialog, the current run (`trades`, `positions`, final balance, date) moves to `pastRuns[]` and the balance resets to `startingBalance`.

## 6. Panel UI

Matches the MockApe layout from the user's screenshot:
- Header: "SolSim", balance with SOL glyph, price badge, settings gear (opens `src/popup/popup.html#settings` in a tab via the worker; content scripts cannot open the toolbar popup), collapse chevron.
- "Buy <SYMBOL>": a grid of preset buttons plus a custom amount input.
- "Sell": an Invested / Sold / Remaining / PnL row, then % buttons, a custom % input, **Sell Init**, and **Limit** (opens a small form: MC target + %).
- Dark theme to match GMGN, green buys, red sells.
- Drag by the header. Position and collapsed state are saved.

## 7. Popup

Tabs: **Positions** (open, then closed, each with PnL and **Make card**), **History** (trade list), **Settings** (all of §5's settings, display name, avatar upload, Reset, past-runs list).

## 8. Card Studio

- Canvas sizes: **Landscape 1600×900**, **Portrait 1080×1350**.
- **Layout:** SolSim logo and name at top left. Coin logo and ticker. Big PnL value (USD or SOL) in green or red, with optional neon glow (canvas `shadowBlur`). The % change. A stats block (PNL, Hold, Sold, Bought). A price line with B/S markers on the right (landscape) or top (portrait). Display name and avatar at bottom left.
- **Controls:** Neon Glow, Dark Overlay, Landscape/Portrait, USD/SOL, background picker (6 procedural backgrounds in `backgrounds.js` plus user uploads saved to the store as data URLs, max 5, each ≤ 2 MB after downscale to the canvas size).
- **Hold:** the open position's tokens valued at the last known price.
- **Price line data:** stored ticks for the position (sampled every 2 s while open in a tab, capped at 5,000 points, downsampled when over). Gaps over 30 s are filled from GeckoTerminal OHLCV (`/api/v2/networks/solana/pools/{pool}/ohlcv/minute`, pool found via `/api/v2/networks/solana/tokens/{mint}/pools`). With no data the line is omitted.
- **Logos:** the worker fetches the logo URL and returns a data URL, so the canvas stays untainted.
- **Export:** Download PNG (`solsim-<SYMBOL>-<date>.png`), Copy image (`ClipboardItem`), Share to X (copies the image, then opens `https://x.com/intent/post?text=` with e.g. `+342% on $AMD 📈 (paper trade via SolSim)`).

## 9. Error handling

- Unknown feed shapes → `parse` returns null and is ignored. The state machine falls back to backup by timeout.
- All external fetches have a 4 s timeout. Failures are logged to the console with a `[SolSim]` prefix and never throw into the UI.
- Storage writes happen in the worker queue. A failed write rejects the trade and the panel shows "Trade not saved".
- Hook errors are wrapped in try/catch so they can never break GMGN's own socket handling.

## 10. Testing

- `node --test tests/` (Node 26, no dependencies).
- **Unit:** `parse.js` (real fixtures + garbage input), `fills.js` (buy, sell, fees, slippage, insufficient balance, Sell Initials inversion), `positions.js` (invested/sold/remaining/PnL, close, reopen), `limits.js` (above/below triggers, one-shot), the price state machine (pure reducer with injected clock), and tick downsampling.
- **Manual (in the user's Chrome):** load unpacked, open a gmgn.ai coin, check the Live badge and MC match the page, buy, sell 50%, Sell Init, set a limit and watch it fire, open two tabs and confirm the balance stays consistent, kill the worker (chrome://serviceworker-internals) and confirm state survives, make a card in both layouts and export it.
