import { describe, it, expect } from 'vitest'
import { meta, initialState, applyMove, publicView, privateView } from '../src/games/chess.js'

describe('meta', () => {
  it('seats two players', () => {
    expect(meta.seats).toBe(2)
  })
})

describe('initialState', () => {
  it('starts from the standard opening position', () => {
    expect(initialState().fen).toMatch(/^rnbqkbnr\/pppppppp\/8\/8\/8\/8\/PPPPPPPP\/RNBQKBNR w /)
  })
})

describe('applyMove', () => {
  it('accepts a legal opening move from seat 1', () => {
    expect(applyMove(initialState(), 1, 'e4').lastMove).toBe('e4')
  })

  it('rejects a move played out of turn', () => {
    expect(() => applyMove(initialState(), 2, 'e5')).toThrow('Not your turn')
  })

  it('rejects an illegal move', () => {
    expect(() => applyMove(initialState(), 1, 'e9')).toThrow('Not a legal move')
  })

  it('records the winner on checkmate', () => {
    let state = initialState()
    for (const [seat, move] of [[1, 'f3'], [2, 'e5'], [1, 'g4'], [2, 'Qh4#']]) {
      state = applyMove(state, seat, move)
    }

    expect(state.result).toBe('Black wins')
  })

  it('leaves the previous state untouched', () => {
    const state = initialState()
    applyMove(state, 1, 'e4')

    expect(state.lastMove).toBeNull()
  })
})

describe('publicView', () => {
  it('renders eight ranks', () => {
    expect(publicView(initialState()).rows).toHaveLength(8)
  })

  it('renders eight files per rank', () => {
    expect(publicView(initialState()).rows[0]).toHaveLength(8)
  })

  it('uses an empty string for an empty square', () => {
    expect(publicView(initialState()).rows[3][0]).toBe('')
  })

  it('names the side to move', () => {
    expect(publicView(initialState()).turn_name).toBe('White')
  })

  it('names each piece by colour and type', () => {
    expect(publicView(initialState()).rows[0][0]).toBe('br')
  })
})

describe('privateView', () => {
  it('tells the player which colour they are', () => {
    expect(privateView(initialState(), 2).you).toBe('Black')
  })
})
