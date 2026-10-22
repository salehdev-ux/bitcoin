Link:https://salehdev-ux.github.io/bitcoin/

# ₿ BITCOIN — SOUND MONEY SERIES

A single-page tribute site to Bitcoin, built as a **living dithered poster**.
Typography follows the "Exposure" reference (one huge elegant serif word,
letter-spaced micro-caps above and below), art direction follows the
"TWK Lausanne" reference (riso-style dithered poster, grain, print marks).

**Zero images. Zero frameworks. Every pixel is computed in your browser.**

---

## Run it

No build step. Either:

- double-click `index.html`, or
- serve the folder (nicer URLs, identical result):

```bash
python -m http.server 8080
# → http://localhost:8080
```

Fonts (Fraunces, Space Grotesk, IBM Plex Mono) load from Google Fonts;
everything else works fully offline.

## What's inside

| Area | Effect |
|---|---|
| Hero | Procedural night poster — a coin-sun, orbiting node-satellites, green hills, a mountain that is literally a rising price chart — all Bayer 8×8 dithered at 12 fps, reacting to your cursor |
| Grain & scanlines | Animated film-grain canvas overlay + CRT scanlines across the whole page |
| Ticker | Live BTC/USD (Coinbase) + live block height (mempool.space), falls back to a labelled SIM mode offline |
| 01 The Promise | Manifesto + dithered coin panel that "disturbs" on hover |
| 02 Genesis | Binary rain + terminal with a typed-out genesis coinbase message and block-0 data |
| 03 Proof of Work | **A real SHA-256 implementation (FIPS 180-4) mining in your browser** — pick difficulty 0000/00000/000000, watch hashrate, find a block, get the stamp + ASCII confetti |
| 04 Scarcity | Animated 21M supply counter, dithered supply bar, **live halving countdown**, and a **spinning Bitcoin rendered entirely in ASCII text — drag it** |
| 05 Why It Wins | Cards with dithered icons (21 / key / network) |
| Footer | Giant serif sign-off, ASCII divider, real links |

### Micro-details

- Scramble-decode headings on scroll, word-mask reveals, animated counters
- Custom orange cursor, theme-adaptive navbar (scroll-spy), reading progress bar
- Preloader that "syncs the chain" in ASCII
- Easter eggs: type `21` anywhere. Also try `hodl`.
- `prefers-reduced-motion` respected throughout; fully responsive.

## Palette

| Role | Hex |
|---|---|
| Bitcoin orange | `#F7931A` |
| Gold | `#FFC24B` |
| Burnt orange | `#B4530A` |
| Ink (night) | `#0E0C09` |
| Bone paper | `#F4EDE3` |
| Riso green | `#1E4A38` |

## Structure

```
index.html        markup + copy
css/style.css     all styling (poster type, themes, effects)
js/dither.js      Bayer 8×8 ordered-dither engine + scene painters
js/ascii.js       ASCII spinning coin + binary rain
js/miner.js       from-scratch SHA-256 + mining simulator + confetti
js/main.js        orchestration: preloader, reveals, live data, countdown
```
