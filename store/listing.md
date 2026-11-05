# Chrome Web Store listing

## Store listing
- **Name:** SolSim (from manifest)
- **Summary (from manifest):** Paper trade Solana memecoins on GMGN and make PnL cards. Never touches your wallet.
- **Category:** Tools
- **Language:** English

**Description:**

SolSim lets you practice trading Solana memecoins on gmgn.ai with fake SOL, then share your results as PnL cards. It never connects to your wallet.

TRADE WITH FAKE SOL
• A draggable panel appears on every Solana coin page on gmgn.ai
• Start with 10 fake SOL (adjustable) and reset any time. Past runs are kept
• Buy presets or any amount, sell by percent, "Sell Init" to take out your initial, and limit sells / stop-losses at a market cap
• Live position stats: invested, sold, remaining and PnL %

REAL PRICES, REALISTIC FILLS
• Uses the prices gmgn.ai is already showing you, several updates a second
• Backup prices from Jupiter and DexScreener if the page feed goes quiet
• Every trade pays a platform fee and your priority fee. Price impact depends on the coin's liquidity
• Slippage works as a maximum, like real trading: trades with bigger impact fail

PNL CARDS
• One click from any position
• PnL in USD or SOL, with a price chart marking your buys and sells
• Landscape or portrait, neon glow, built-in backgrounds or your own upload, your name and avatar
• Download, copy, or share to X

SAFE BY DESIGN
• No wallet connection, private keys, signing or real trades
• No remote code, no tracking, no analytics
• Your balance and trades stay in your browser
• Open source: https://github.com/djkhxled/solsim

SolSim is an independent project and is not affiliated with GMGN.

## Graphics
- Icon: store/icon-128.png
- Screenshots (1280x800): store/screenshot-1.png, store/screenshot-2.png
- Small promo tile (440x280): store/promo-small-440x280.png

## Privacy practices
- **Single purpose:** Simulated (paper) trading of Solana tokens on gmgn.ai using a fake balance, plus creating PnL share images of those simulated trades.
- **storage:** Saves the user's fake balance, simulated trades, positions, settings and card preferences locally on the device.
- **unlimitedStorage:** PnL card background images the user uploads and the price history used for card charts can exceed the default 10 MB local storage limit.
- **Host permission https://gmgn.ai/\* and https://\*.gmgn.ai/\*:** The content script shows the paper-trading panel on gmgn.ai coin pages and reads the coin prices the page already receives, so simulated trades fill at the price on screen. Coin logos are downloaded from gmgn.ai for PnL cards.
- **Host permission https://lite-api.jup.ag/\* and https://api.dexscreener.com/\*:** Backup token and SOL prices when the gmgn.ai price feed is unavailable.
- **Host permission https://api.geckoterminal.com/\*:** Historical prices to draw the price chart on PnL cards.
- **Remote code:** No. All JavaScript is included in the package.
- **Data collected:** None. Nothing is sent to the developer or any third party besides public price lookups by token address.
- **Privacy policy URL:** https://github.com/djkhxled/solsim/blob/main/PRIVACY.md
