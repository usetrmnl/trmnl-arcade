# TRMNL Arcade

Your phone is the live playing surface. The TRMNL screen is an ambient public
board that lags **up to 15–20 minutes** behind — that's a property of e-ink
refresh budgets, not a defect. Don't expect the screen to update after every
move; expect it to eventually catch up.

TRMNL Arcade hosts turn-based games whose boards render on TRMNL e-ink
displays. A device polls its game state, a shared screen shows who's playing
and whose turn it is, and each player moves from their phone. Live at
[arcade.trmnl.com](https://arcade.trmnl.com).

Two reference games ship today: chess (public information — both players see
the whole board) and battleship (hidden information — each player has a
fleet the other can't see).

## How to play

1. Install the TRMNL Arcade recipe on a device.
2. Wait for the next refresh. The screen shows a QR code per open seat.
3. Scan a code to claim that seat. Scanning returns a bookmarkable URL — bookmark
   it, because that URL is your credential for the rest of the game. There's no
   game code to type in; the game is keyed to the device you scanned.
4. Once every seat is claimed, the game starts. Moves are made from your
   phone; the shared screen catches up on its next refresh.

## How to add a game

A game is one file in `src/games/` exporting five things:

```js
export const meta = { name, seats, moveLabel }
export function initialState()                  // fresh game state
export function applyMove(state, seat, move)    // returns a NEW state; throws Error on an illegal move
export function publicView(state)               // what the shared e-ink screen sees — never hidden info
export function privateView(state, seat)        // what one player's phone sees
```

Plus one line registering it in `src/games/index.js`.

Read `src/games/chess.js` and `src/games/battleship.js` — they're the worked
examples. Copy chess's shape for a public-information game (both `publicView`
and `privateView` can show the same board). Copy battleship's shape for a
hidden-information game (an `incomingGrid`-style helper with a reveal flag
that's only ever `true` on the private, per-seat path).

Then:

```bash
npm test
```

Open a PR. **[docs/writing-a-game.md](docs/writing-a-game.md)** walks through both
game shapes — shared information like chess, and hidden information like
battleship — and `CONTRIBUTING.md` has the rules a contributed game must follow.

## Running it yourself

```bash
npm install
npm test
npx wrangler dev
```

`wrangler dev` is for local testing only — a TRMNL device fetches its screen
through TRMNL's servers, which cannot reach your localhost. To try a game on
real hardware, deploy your own Worker (`npx wrangler deploy`) and override the
recipe's `arcade_host` custom field with that Worker's hostname.

## Known limitations

- **A lost bookmark ends that game.** The player URL is the credential and
  there is no recovery — any recovery route reachable from the shared screen
  would be reachable by everyone who can see that screen.
- **Anyone who can see the screen can act on it.** They can claim an open
  seat, or reset a game that's in the lobby or over — including a lobby where
  one player is already waiting for an opponent, which destroys that
  waiting player's bookmark. Only a game already in progress is protected
  from a reset.
- **A game abandoned mid-play is stuck** until its record expires after one
  week.
- **Simultaneous first polls of one device can race** and mint competing
  nonces, because Workers KV has no compare-and-set. The screen self-corrects
  on its next poll.

## Requirements

Node 20+. Node 19 added the global `crypto.getRandomValues` this project
relies on for seat tokens and nonces.
