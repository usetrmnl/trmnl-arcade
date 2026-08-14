import { GAMES } from './games/index.js'
import { newRecord, save, loadByKey } from './store.js'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)

    if (segments[0] === 's' && segments.length === 3) {
      return stateResponse(request, env, segments[1], segments[2].replace(/\.json$/, ''))
    }

    return new Response('Not found', { status: 404 })
  }
}

async function stateResponse(request, env, game, key) {
  const rules = GAMES[game]
  if (!rules) return new Response('Unknown game', { status: 404 })

  const origin = new URL(request.url).origin
  let record = await loadByKey(env.ARCADE, game, key)
  if (!record) record = await save(env.ARCADE, newRecord(game, key, rules.meta.seats))

  const openSeats = Object.keys(record.seats).filter((seat) => !record.seats[seat])
  const joinUrls = {}
  openSeats.forEach((seat) => { joinUrls[seat] = `${origin}/j/${record.nonce}/${seat}` })

  return json({
    phase: record.phase,
    nonce: record.nonce,
    join_urls: joinUrls,
    rejoin_url: `${origin}/j/${record.nonce}`,
    play_again_url: `${origin}/again/${record.nonce}`,
    seats_open: openSeats.map(Number),
    board: record.state ? rules.publicView(record.state) : null,
    result: record.state ? record.state.result : null
  })
}

// no-store — a cached board goes stale, and polls are too infrequent for caching to help.
function json(body) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  })
}
