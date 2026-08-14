export const meta = {
  name: 'Battleship',
  seats: 2,
  moveLabel: 'Call a shot (e.g. B7)'
}

const BOARD_SIZE = 8
const SHIP_LENGTHS = [4, 3, 3, 2]
const HIT = '×'
const MISS = '·'
const SHIP = '■'
const MAX_PLACEMENT_ATTEMPTS = 200

export function initialState(random = Math.random) {
  return {
    fleets: { 1: placeFleet(random), 2: placeFleet(random) },
    shots: { 1: [], 2: [] },
    turn: 1,
    lastMove: null,
    result: null
  }
}

export function applyMove(state, seat, move) {
  if (state.turn !== seat) throw new Error('Not your turn')

  const square = parseSquare(move)
  if (!square) throw new Error(`Not a square: ${move}`)
  if (state.shots[seat].some((shot) => shot.x === square.x && shot.y === square.y)) {
    throw new Error(`Already fired at ${move}`)
  }

  const opponent = seat === 1 ? 2 : 1
  const hit = state.fleets[opponent].some((cell) => cell.x === square.x && cell.y === square.y)
  const shots = { ...state.shots, [seat]: [...state.shots[seat], { ...square, hit }] }
  const sunkEverything = state.fleets[opponent].every((cell) =>
    shots[seat].some((shot) => shot.x === cell.x && shot.y === cell.y)
  )

  return {
    ...state,
    shots,
    turn: opponent,
    lastMove: `${formatSquare(square)} — ${hit ? 'hit' : 'miss'}`,
    result: sunkEverything ? `Player ${seat} wins` : null
  }
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

// Grid of shots fired AT `seat`; `revealShips` toggles shared-screen vs. own-phone view.
function incomingGrid(state, seat, revealShips) {
  const attacker = seat === 1 ? 2 : 1
  const grid = Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => ''))

  if (revealShips) state.fleets[seat].forEach(({ x, y }) => { grid[y][x] = SHIP })
  state.shots[attacker].forEach(({ x, y, hit }) => { grid[y][x] = hit ? HIT : MISS })

  return grid
}

function placeFleet(random) {
  const cells = []

  for (const length of SHIP_LENGTHS) {
    let placed = null
    for (let attempt = 0; !placed && attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
      placed = tryPlace(length, cells, random)
    }
    // Throws rather than looping forever: a degenerate `random` never places a second ship.
    if (!placed) throw new Error('Could not place the fleet')
    cells.push(...placed)
  }

  return cells
}

function tryPlace(length, taken, random) {
  const horizontal = random() < 0.5
  const span = BOARD_SIZE - length + 1
  const x = Math.floor(random() * (horizontal ? span : BOARD_SIZE))
  const y = Math.floor(random() * (horizontal ? BOARD_SIZE : span))
  const cells = Array.from({ length }, (_, offset) => ({
    x: horizontal ? x + offset : x,
    y: horizontal ? y : y + offset
  }))

  const overlaps = cells.some((cell) => taken.some((used) => used.x === cell.x && used.y === cell.y))
  return overlaps ? null : cells
}

function parseSquare(move) {
  const match = String(move).trim().toUpperCase().match(/^([A-H])([1-8])$/)
  if (!match) return null

  return { x: match[1].charCodeAt(0) - 65, y: Number(match[2]) - 1 }
}

const formatSquare = ({ x, y }) => `${String.fromCharCode(65 + x)}${y + 1}`
