# TRMNL Arcade

<img width="1858" height="1072" alt="trmnl-arcade-chess" src="https://github.com/user-attachments/assets/978282e3-cbf9-4eae-9739-259011e44648" />

Welcome to our experiment with calm, async, turn-based games.

TRMNL Arcade is hosted on a Cloudflare worker and you're welcome to add one to our server.
Gameplay lives at a tokenized URL, devices poll their own game's state, 
and your device shows who's playing and whose turn it is.

This project launched with two reference games: chess and battleship. 

Chess highlights a "public information" style, where both players see
the whole board. Battleship showcases a "hidden information" style game, 
where each player has content (in this case, a fleet) that the other player can't see.

## How to play games

1. Install a TRMNL Arcade recipe like [Chess](https://trmnl.com/recipes/415050) or [Battlefield](https://trmnl.com/recipes/415057).
2. Scan the QR code(s) to start the game. Don't close the tab. ;)
3. Have fun and stay safe.

Player-facing walkthrough: **[docs/playing.md](docs/playing.md)**.

## How to build games

A game is one file in `src/games/` exporting five things:

```js
export const meta = { name, seats, moveLabel }
export function initialState()                  // fresh game state
export function applyMove(state, seat, move)    // returns a NEW state; throws Error on an illegal move
export function publicView(state)               // what's on the TRMNL display — never hidden info
export function privateView(state, seat)        // what a player sees from their phone/computer
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

- **A lost bookmark ends that game.** Player URLs act as credentials and
  there is no recovery — any recovery route reachable from the shared screen
  would be reachable by everyone who can see that screen.
- **Anyone who can see the screen can act on it.** They can claim an open
  seat, or reset a game that's in the lobby or over — including a lobby where
  one player is already waiting for an opponent, which destroys that
  waiting player's bookmark. Only a game already in progress is protected
  from a reset.
- **A game abandoned mid-play is stuck** until its record expires after one
  week. Delete and re-install the plugin if you lose a URL.
- **Simultaneous first polls of one device can race** and mint competing
  nonces, because Workers KV has no compare-and-set. The screen self-corrects
  on its next poll.

## Requirements

Node 20+.
