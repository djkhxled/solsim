# SolSim

An open source paper trading tool to trade Solana memecoins on gmgn.ai and make PnL cards. **SolSim never touches your wallet.** It has no wallet permissions and no signing code. It reads prices and keeps a fake SOL balance on your computer.

## Install
1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this `solsim` folder.
4. Pin SolSim from the puzzle-piece menu.

After changing code, click the ↻ on SolSim's card in `chrome://extensions`, then reload the GMGN tab.

## Use
- Open any Solana coin on gmgn.ai. The SolSim panel appears. Drag it by its header.
- **Live** = price from GMGN's own feed. **Backup price** = Jupiter/DexScreener. **No price** = trading paused.
- Fills include the platform fee, your priority fee and slippage (set them in Settings).
- Limit sells only fire while that coin is open in a tab.
- Click the toolbar icon for positions, history, settings, Reset, and **Make card**.

## Develop
```bash
npm test
```
