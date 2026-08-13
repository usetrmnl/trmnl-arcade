import { describe, it, expect } from 'vitest'
import { memoryKv } from './helpers/memory_kv.js'
import { randomId, newRecord, save, loadByKey, loadByNonce } from '../src/store.js'

describe('randomId', () => {
  it('returns the requested length', () => {
    expect(randomId(8)).toHaveLength(8)
  })

  it('omits characters that misread off a screen', () => {
    const sample = Array.from({ length: 200 }, () => randomId(8)).join('')
    expect(sample).not.toMatch(/[lo01]/)
  })
})

describe('newRecord', () => {
  it('opens every seat', () => {
    expect(newRecord('chess', 'A1B2C3', 2).seats).toEqual({ 1: null, 2: null })
  })

  it('starts in the lobby', () => {
    expect(newRecord('chess', 'A1B2C3', 2).phase).toBe('lobby')
  })
})

describe('save and load', () => {
  it('round-trips a record by game and key', async () => {
    const kv = memoryKv()
    await save(kv, newRecord('chess', 'A1B2C3', 2))

    expect((await loadByKey(kv, 'chess', 'A1B2C3')).game).toBe('chess')
  })

  it('finds the same record by nonce', async () => {
    const kv = memoryKv()
    const record = await save(kv, newRecord('chess', 'A1B2C3', 2))

    expect((await loadByNonce(kv, record.nonce)).key).toBe('A1B2C3')
  })

  it('returns null for an unknown nonce', async () => {
    expect(await loadByNonce(memoryKv(), 'nosuchid')).toBeNull()
  })

  it('returns null for an unknown key', async () => {
    expect(await loadByKey(memoryKv(), 'chess', 'ZZZZZZ')).toBeNull()
  })
})
