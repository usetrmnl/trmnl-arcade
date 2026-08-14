import { describe, it, expect } from 'vitest'
import { memoryKv } from './helpers/memory_kv.js'
import worker from '../src/index.js'

const HOST = 'https://arcade.trmnl.com'
const call = (path, kv, init) => worker.fetch(new Request(`${HOST}${path}`, init), { ARCADE: kv })

async function lobby(kv, game = 'chess') {
  const body = await (await call(`/s/${game}/A1B2C3.json`, kv)).json()
  return body.nonce
}

const claim = async (kv, nonce, seat) => {
  const location = (await call(`/j/${nonce}/${seat}`, kv)).headers.get('location')
  return location.split('/').pop()
}

const move = (kv, nonce, seat, token, value) =>
  call(`/p/${nonce}/${seat}/${token}`, kv, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ move: value })
  })

describe('GET /j/:nonce/:seat', () => {
  it('redirects to the player page', async () => {
    const kv = memoryKv()

    expect((await call(`/j/${await lobby(kv)}/1`, kv)).status).toBe(302)
  })

  it('mints a token in the redirect target', async () => {
    const kv = memoryKv()
    const nonce = await lobby(kv)

    expect(await claim(kv, nonce, 1)).toHaveLength(8)
  })

  it('refuses a seat that is already taken', async () => {
    const kv = memoryKv()
    const nonce = await lobby(kv)
    await claim(kv, nonce, 1)

    expect((await call(`/j/${nonce}/1`, kv)).status).toBe(409)
  })

  it('404s an unknown nonce', async () => {
    expect((await call('/j/nosuchid/1', memoryKv())).status).toBe(404)
  })

  it('starts play once every seat is claimed', async () => {
    const kv = memoryKv()
    const nonce = await lobby(kv)
    await claim(kv, nonce, 1)
    await claim(kv, nonce, 2)

    expect((await (await call('/s/chess/A1B2C3.json', kv)).json()).phase).toBe('playing')
  })

  it('stops offering join urls once seats are full', async () => {
    const kv = memoryKv()
    const nonce = await lobby(kv)
    await claim(kv, nonce, 1)
    await claim(kv, nonce, 2)

    expect((await (await call('/s/chess/A1B2C3.json', kv)).json()).join_urls).toEqual({})
  })
})

describe('POST /p/:nonce/:seat/:token', () => {
  it('applies a legal move', async () => {
    const kv = memoryKv()
    const nonce = await lobby(kv)
    const token = await claim(kv, nonce, 1)
    await claim(kv, nonce, 2)
    await move(kv, nonce, 1, token, 'e4')

    expect((await (await call('/s/chess/A1B2C3.json', kv)).json()).board.last_move).toBe('e4')
  })

  it('rejects a move signed with the wrong token', async () => {
    const kv = memoryKv()
    const nonce = await lobby(kv)
    await claim(kv, nonce, 1)
    await claim(kv, nonce, 2)

    expect((await move(kv, nonce, 1, 'aaaaaaaa', 'e4')).status).toBe(403)
  })

  it('reports an illegal move without changing the board', async () => {
    const kv = memoryKv()
    const nonce = await lobby(kv)
    const token = await claim(kv, nonce, 1)
    await claim(kv, nonce, 2)

    expect((await move(kv, nonce, 1, token, 'e9')).status).toBe(422)
  })

  it('refuses a move before every seat is claimed', async () => {
    const kv = memoryKv()
    const nonce = await lobby(kv)
    const token = await claim(kv, nonce, 1)

    expect((await move(kv, nonce, 1, token, 'e4')).status).toBe(409)
  })
})

describe('GET /p/:nonce/:seat/:token', () => {
  it('shows a battleship player their own fleet and no other', async () => {
    const kv = memoryKv()
    const nonce = await lobby(kv, 'battleship')
    const token = await claim(kv, nonce, 1)
    await claim(kv, nonce, 2)
    const page = await (await call(`/p/${nonce}/1/${token}`, kv)).text()
    const record = JSON.parse(await kv.get('game:battleship:A1B2C3'))

    expect((page.match(/■/g) || []).length).toBe(record.state.fleets['1'].length)
  })
})

describe('GET /again/:nonce', () => {
  it('reopens every seat', async () => {
    const kv = memoryKv()
    const nonce = await lobby(kv)
    await claim(kv, nonce, 1)
    await claim(kv, nonce, 2)
    await call(`/again/${nonce}`, kv)

    expect((await (await call('/s/chess/A1B2C3.json', kv)).json()).seats_open).toEqual([1, 2])
  })

  it('keeps the nonce so the printed code still works', async () => {
    const kv = memoryKv()
    const nonce = await lobby(kv)
    await claim(kv, nonce, 1)
    await call(`/again/${nonce}`, kv)

    expect((await (await call('/s/chess/A1B2C3.json', kv)).json()).nonce).toBe(nonce)
  })

  it('clears the finished board', async () => {
    const kv = memoryKv()
    const nonce = await lobby(kv)
    const token = await claim(kv, nonce, 1)
    await claim(kv, nonce, 2)
    await move(kv, nonce, 1, token, 'e4')
    await call(`/again/${nonce}`, kv)

    expect((await (await call('/s/chess/A1B2C3.json', kv)).json()).board).toBeNull()
  })

  it('404s an unknown nonce', async () => {
    expect((await call('/again/nosuchid', memoryKv())).status).toBe(404)
  })
})
