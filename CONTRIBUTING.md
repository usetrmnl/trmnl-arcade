For a walkthrough of both game shapes with worked examples, see
[docs/writing-a-game.md](docs/writing-a-game.md). This file is the rules.

# Contributing

Community game PRs are welcome. The reason we can accept a game module
without auditing it line by line is the contract below — read it before you
start.

## The capability boundary

A game module (`src/games/*.js`) exports pure functions and nothing else.
The Worker calls those functions with plain data and reads back plain data —
it never hands the module `env`. That means a game module **cannot** reach
the KV namespace, cannot read another game's state, and cannot read another
seat's token or hidden information. This isn't a rule contributors are asked
to remember — it's structural. There is no `env` parameter to misuse.

## Rules a contributed game must follow

CI enforces these (see `test/games_are_pure.test.js`):

- **Pure functions only.** No `fetch`, no network, no timers, no I/O of any
  kind.
- **No `env`, no bindings, no KV access.**
- **No `eval`, no `new Function`.**
- **No imports outside the module** except genuinely pure helper libraries.
  `chess.js` is the precedent — a rules engine, no I/O.
- **`applyMove` must not mutate the state it's given.** Return a new object.
- **`publicView` must never contain hidden information.** This is the rule
  that matters most: whatever `publicView` returns is rendered on a screen
  everyone in the room can see. Battleship is the worked example — its
  `incomingGrid` helper takes a `revealShips` flag that is `false` on every
  call reachable from `publicView`, and `true` only from `privateView`.
- **Every game ships tests**, including one that proves `publicView` leaks
  nothing, if the game has hidden information to leak.

## What CI can't check

A reviewer still checks these by hand:

- Is the game actually fun on a 15-minute refresh cycle? Games that need
  fast back-and-forth don't fit this medium.
- Does the board read at a glance on a 1-bit e-ink panel? No subtle shading,
  no color-only distinctions, no dense detail that disappears at low
  resolution.
