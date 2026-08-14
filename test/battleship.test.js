import { describe, it, expect } from 'vitest'
import { meta, initialState, applyMove, publicView, privateView } from '../src/games/battleship.js'

// A fixed sequence makes fleet placement deterministic without stubbing internals.
const fixedRandom = () => 0

const stateWithKnownFleets = () => {
  const state = initialState(fixedRandom)
  state.fleets = { 1: [{ x: 0, y: 0 }], 2: [{ x: 1, y: 1 }] }
  return state
}

describe('meta', () => {
  it('seats two players', () => {
    expect(meta.seats).toBe(2)
  })
})

describe('initialState', () => {
  it('gives each seat a fleet', () => {
    expect(initialState(fixedRandom).fleets[1].length).toBeGreaterThan(0)
  })

  it('starts with seat 1 to move', () => {
    expect(initialState(fixedRandom).turn).toBe(1)
  })
})

describe('applyMove', () => {
  it('records a miss', () => {
    const state = applyMove(stateWithKnownFleets(), 1, 'H8')

    expect(state.shots[1][0].hit).toBe(false)
  })

  it('records a hit', () => {
    const state = applyMove(stateWithKnownFleets(), 1, 'B2')

    expect(state.shots[1][0].hit).toBe(true)
  })

  it('rejects a shot played out of turn', () => {
    expect(() => applyMove(stateWithKnownFleets(), 2, 'A1')).toThrow('Not your turn')
  })

  it('rejects an unparseable coordinate', () => {
    expect(() => applyMove(stateWithKnownFleets(), 1, 'Z9')).toThrow('Not a square')
  })

  it('rejects a repeat shot', () => {
    const state = applyMove(stateWithKnownFleets(), 1, 'A1')
    state.turn = 1

    expect(() => applyMove(state, 1, 'A1')).toThrow('Already fired')
  })

  it('passes the turn to the other seat', () => {
    expect(applyMove(stateWithKnownFleets(), 1, 'H8').turn).toBe(2)
  })

  it('declares a winner when the last ship is sunk', () => {
    expect(applyMove(stateWithKnownFleets(), 1, 'B2').result).toBe('Player 1 wins')
  })
})

describe('publicView', () => {
  it('never reveals an unhit ship', () => {
    const view = publicView(stateWithKnownFleets())

    expect(JSON.stringify(view.grids)).not.toContain('■')
  })

  it('shows a hit on the target grid', () => {
    const state = applyMove(stateWithKnownFleets(), 1, 'B2')

    expect(publicView(state).grids[2][1][1]).toBe('×')
  })
})

describe('privateView', () => {
  it('shows the player their own ships', () => {
    expect(privateView(stateWithKnownFleets(), 1).fleet[0][0]).toBe('■')
  })

  it('does not show the opponent their ships', () => {
    expect(privateView(stateWithKnownFleets(), 2).fleet[0][0]).toBe('')
  })
})
