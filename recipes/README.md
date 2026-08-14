# Recipes

The TRMNL side of each game: a private plugin that polls this Worker and draws
the board. Each directory is a ready-to-import archive.

## Installing one

1. On trmnl.com go to **Plugins → Private Plugin → Import new**
2. Choose that game's `.zip`
3. Add the imported plugin to a playlist

The zip is just `settings.yml` + `full.liquid`. Rebuild it after editing either:

```bash
cd recipes/chess && zip -q -j arcade-chess.zip settings.yml full.liquid
```

## Why the markup looks the way it does

- **Pieces are inline SVG, never Unicode.** None of the three fonts a TRMNL
  renders with contain U+2654-265F, so glyphs would depend on an undeclared
  font fallback in the render container.
- **The lobby iterates `join_urls`, not `seats_open`.** The former is keyed by
  strings, the latter holds integers, so cross-referencing them silently
  yields nil and the QR filter raises.
- **The board is `flex: 0 0 420px` and the info column `flex: 1 1 auto`.**
  The framework's `.layout--col` is `flex: 0 1 auto` and collapses to zero
  width beside a table, taking the turn indicator off-screen with it.
