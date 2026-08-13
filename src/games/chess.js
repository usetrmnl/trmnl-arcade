import { Chess } from 'chess.js'

export const meta = {
  name: 'Chess',
  seats: 2,
  moveLabel: 'Your move in algebraic notation (e.g. e4, Nf3)'
}

// Outline pieces read as white and filled pieces as black on a 1-bit panel.
const GLYPHS = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚'
}

export function initialState() {
  return { fen: new Chess().fen(), lastMove: null, result: null }
}

export function applyMove(state, seat, move) {
  const board = new Chess(state.fen)
  if (board.turn() !== (seat === 1 ? 'w' : 'b')) throw new Error('Not your turn')

  let played
  try {
    played = board.move(String(move).trim())
  } catch {
    throw new Error(`Not a legal move: ${move}`)
  }

  return { fen: board.fen(), lastMove: played.san, result: outcome(board) }
}

export function publicView(state) {
  const board = new Chess(state.fen)

  return {
    rows: board.board().map((rank) => rank.map((square) => (square ? GLYPHS[`${square.color}${square.type}`] : ''))),
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

function outcome(board) {
  if (!board.isGameOver()) return null
  if (!board.isCheckmate()) return 'Draw'

  return board.turn() === 'w' ? 'Black wins' : 'White wins'
}
