import { describe, it, expect } from 'vitest'
import { memoryKv } from './helpers/memory_kv.js'
import worker from '../src/index.js'

const get = (path, kv) => worker.fetch(new Request(`https://arcade.trmnl.com${path}`), { ARCADE: kv })

describe('GET /s/:game/:key.json', () => {
  it('creates a lobby on the first poll', async () => {
    const body = await (await get('/s/chess/A1B2C3.json', memoryKv())).json()

    expect(body.phase).toBe('lobby')
  })

  it('offers a join url for every open seat', async () => {
    const body = await (await get('/s/chess/A1B2C3.json', memoryKv())).json()

    expect(Object.keys(body.join_urls)).toEqual(['1', '2'])
  })

  it('builds join urls from the nonce, not the device key', async () => {
    const body = await (await get('/s/chess/A1B2C3.json', memoryKv())).json()

    expect(body.join_urls['1']).toBe(`https://arcade.trmnl.com/j/${body.nonce}/1`)
  })

  it('keeps the same nonce across polls', async () => {
    const kv = memoryKv()
    const first = await (await get('/s/chess/A1B2C3.json', kv)).json()
    const second = await (await get('/s/chess/A1B2C3.json', kv)).json()

    expect(second.nonce).toBe(first.nonce)
  })

  it('keeps two devices on separate games', async () => {
    const kv = memoryKv()
    const first = await (await get('/s/chess/A1B2C3.json', kv)).json()
    const second = await (await get('/s/chess/D4E5F6.json', kv)).json()

    expect(second.nonce).not.toBe(first.nonce)
  })

  it('has no board while in the lobby', async () => {
    const body = await (await get('/s/chess/A1B2C3.json', memoryKv())).json()

    expect(body.board).toBeNull()
  })

  it('offers a play-again url', async () => {
    const body = await (await get('/s/chess/A1B2C3.json', memoryKv())).json()

    expect(body.play_again_url).toBe(`https://arcade.trmnl.com/again/${body.nonce}`)
  })

  it('404s an unknown game', async () => {
    expect((await get('/s/parcheesi/A1B2C3.json', memoryKv())).status).toBe(404)
  })
})
