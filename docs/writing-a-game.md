# Writing a game for TRMNL Arcade

Before anything else, know what you are building for. **The player's phone is the
live surface. The TRMNL screen is an ambient public board that lags up to 15–20
minutes behind.** That is a property of e-ink refresh budgets, not something to
design around. Games that work here are turn-based and unhurried: the screen says
*a game is happening and it's Sarah's move*, while the actual playing happens on
phones.

A game is **one file** in `src/games/` plus one line in `src/games/index.js`. It
never touches the network, storage, or the request — it takes plain data and
returns plain data. Everything else (seats, tokens, QR codes, storage, the
screen) is already handled.

## The contract

Five exports. That's the whole interface.

```js
export const meta = { name: 'Chess', seats: 2, moveLabel: 'Your move (e.g. e4)' }

export function initialState()                  // opening position
export function applyMove(state, seat, move)    // returns a NEW state; throws on illegal
export function publicView(state)               // what the shared screen renders
export function privateView(state, seat)        // what one player's phone renders
```

`move` is whatever the player typed. `seat` is `1` or `2`. `applyMove` must not
mutate the state it was handed — build a new object and return it. Set
`state.result` to a string when the game ends and the engine handles the rest.

Register it:

```js
import * as yourgame from './yourgame.js'
export const GAMES = { chess, battleship, yourgame }
```

## The one decision that shapes everything

**Does your game have hidden information?**

Chess doesn't — both players see the whole board, and so can anyone walking past
the screen. Battleship does — your fleet is the entire point, and it must never
reach the shared screen.

This single question decides how you write your two view functions, and it is the
only genuinely hard part of authoring a game here.

---

## Shape A: shared information (chess)

When there is nothing to hide, `privateView` is `publicView` plus whatever is
personal to that seat — usually just which side they're playing.

```js
export function publicView(state) {
  const board = new Chess(state.fen)

  return {
    rows: board.board().map((rank) =>
      rank.map((square) => (square ? `${square.color}${square.type}` : ''))),
    turn: board.turn() === 'w' ? 1 : 2,
    turn_name: board.turn() === 'w' ? 'White' : 'Black',
    last_move: state.lastMove,
    check: board.isCheck(),
    result: state.result
  }
}

export function privateView(state, seat) {
  return { you: seat === 1 ? 'White' : 'Black', ...publicView(state) }
}
```

`privateView` spreads `publicView` rather than rebuilding the board. Two view
functions that each construct the board independently will drift apart, and the
one that drifts is usually the one nobody looks at.

**Return data, not presentation.** Notice `rows` holds `'wp'`, `'bn'` — codes,
not `♙♞`. The recipe markup turns those into SVG. This isn't fussiness: no font
a TRMNL renders with contains the Unicode chess codepoints, so glyphs would
depend on an undeclared font fallback in the render container. Keep display
decisions in the markup where each surface can make its own.

---

## Shape B: hidden information (battleship)

Here the two views genuinely differ, and a mistake leaks the game.

The wrong way is to write two independent functions and remember to mask in one
of them. Remembering is not a mechanism. **Write one builder with a reveal flag,
and pass `false` from every public path:**

```js
function incomingGrid(state, seat, revealShips) {
  const attacker = seat === 1 ? 2 : 1
  const grid = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ''))

  if (revealShips) state.fleets[seat].forEach(({ x, y }) => { grid[y][x] = SHIP })
  state.shots[attacker].forEach(({ x, y, hit }) => { grid[y][x] = hit ? HIT : MISS })

  return grid
}

export function publicView(state) {
  return {
    grids: { 1: incomingGrid(state, 1, false), 2: incomingGrid(state, 2, false) },
    turn: state.turn,
    turn_name: `Player ${state.turn}`,
    last_move: state.lastMove,
    result: state.result
  }
}

export function privateView(state, seat) {
  return { you: `Player ${seat}`, fleet: incomingGrid(state, seat, true), ...publicView(state) }
}
```

Three things are load-bearing here:

1. **One flag, one place.** `revealShips` is the only switch between secret and
   public. There is no second code path that could forget.
2. **`true` appears exactly once,** in `privateView`, for the caller's own seat —
   never for their opponent's.
3. **`privateView` still spreads `publicView`,** so a player sees the shared board
   *and* their own fleet, and the shared board can't drift.

### Test the secret, not the happy path

Every hidden-information game needs a test asserting the secret cannot escape.
This is the test that matters most in the whole file:

```js
it('never reveals an unhit ship', () => {
  const view = publicView(stateWithKnownFleets())

  expect(JSON.stringify(view.grids)).not.toContain('■')
})
```

Assert against the *rendered output*, not internal flags. And test the boundary
from the other side too — that seat 1's private view contains only seat 1's ships:

```js
it('does not show the opponent their ships', () => {
  expect(privateView(stateWithKnownFleets(), 2).fleet[0][0]).toBe('')
})
```

## What CI enforces

Game modules are never handed `env`, so your game **cannot** reach storage or read
another game's state — that's structural, not a rule you have to follow. On top of
that, `test/games_are_pure.test.js` scans every file in `src/games/` and fails the
build on `fetch(`, `env.`, `eval(`, `new Function`, timers, and dynamic `import(`.
Pure functions in, pure data out.

Anything genuinely pure is fine as a dependency — chess.js is the precedent: a
rules engine with no I/O.

## Deterministic randomness

If your game randomises setup, take an injectable RNG so tests can pin it:

```js
export function initialState(random = Math.random) { ... }
```

The default must stay — the engine calls `initialState()` with no arguments. And
make the test RNG an actual *varying* sequence. A constant returns the same value
every call, which collapses every random placement onto one cell; ours deadlocked
a placement loop that way before it was caught.

## Shipping it

```bash
npm test
```

Then open a PR. A reviewer checks two things CI can't: whether the game is
actually fun on a 15-minute refresh, and whether the board reads at a glance on a
1-bit panel from across a room.

To try it on hardware before that, deploy your own Worker with `npx wrangler
deploy` and point a recipe's `arcade_host` custom field at your hostname.
`wrangler dev` won't work for this — a TRMNL fetches its screen through TRMNL's
servers, which can't reach your localhost.

## Drawing the board

The TRMNL side is a private plugin whose markup reads your `publicView` output.
See `recipes/` for both worked examples and `recipes/README.md` for the framework
gotchas that cost us the most time — chiefly that `.layout` classes collapse to
zero size when nested, and that anything you want visible needs an explicit flex
basis.
