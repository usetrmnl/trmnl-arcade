import { describe, it, expect } from 'vitest'
import { memoryKv } from './helpers/memory_kv.js'
import worker from '../src/index.js'

const get = (path, kv) => worker.fetch(new Request(`https://arcade.trmnl.com${path}`), { ARCADE: kv })

describe('GET /', () => {
  it('forwards to the github repo', async () => {
    const response = await get('/', memoryKv())

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://github.com/usetrmnl/trmnl-arcade')
  })

  it('still 404s a path that matches no route', async () => {
    expect((await get('/nope', memoryKv())).status).toBe(404)
  })
})
