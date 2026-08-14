import { GAMES } from './games/index.js'
import { newRecord, save, loadByKey, loadByNonce, randomId } from './store.js'
import { seatPicker, playerPage } from './views.js'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)

    if (segments[0] === 's' && segments.length === 3) {
      return stateResponse(request, env, segments[1], segments[2].replace(/\.json$/, ''))
    }
    if (segments[0] === 'j' && segments.length === 2) return seatPickerResponse(request, env, segments[1])
    if (segments[0] === 'j' && segments.length === 3) return claimResponse(request, env, segments[1], segments[2])
    if (segments[0] === 'p' && segments.length === 4) {
      return playResponse(request, env, segments[1], segments[2], segments[3])
    }
    if (segments[0] === 'again' && segments.length === 2) return resetResponse(request, env, segments[1])

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

async function seatPickerResponse(request, env, nonce) {
  const record = await loadByNonce(env.ARCADE, nonce)
  if (!record) return new Response('No such game', { status: 404 })

  return html(seatPicker(record, new URL(request.url).origin))
}

async function claimResponse(request, env, nonce, seat) {
  const record = await loadByNonce(env.ARCADE, nonce)
  if (!record || !Object.hasOwn(record.seats, seat)) return new Response('No such seat', { status: 404 })
  // Accepted race: KV lacks compare-and-set, so a simultaneous claim can win the same seat.
  if (record.seats[seat]) return new Response('Seat already taken', { status: 409 })

  const token = randomId(8)
  record.seats[seat] = token
  advancePhase(record, GAMES[record.game])
  await save(env.ARCADE, record)

  return Response.redirect(`${new URL(request.url).origin}/p/${nonce}/${seat}/${token}`, 302)
}

async function playResponse(request, env, nonce, seat, token) {
  const record = await loadByNonce(env.ARCADE, nonce)
  if (!record || record.seats[seat] !== token) return new Response('Not your seat', { status: 403 })

  const rules = GAMES[record.game]
  if (request.method !== 'POST') return html(playerPage(record, seat, token, rules, null))
  if (record.phase !== 'playing') return new Response('Game is not in play', { status: 409 })

  const form = await request.formData()
  try {
    record.state = rules.applyMove(record.state, Number(seat), form.get('move') || '')
  } catch (error) {
    return html(playerPage(record, seat, token, rules, error.message), 422)
  }

  advancePhase(record, rules)
  await save(env.ARCADE, record)

  return Response.redirect(`${new URL(request.url).origin}/p/${nonce}/${seat}/${token}`, 302)
}

// Keeps the nonce: rotating it would invalidate the PLAY AGAIN code being scanned right now.
async function resetResponse(request, env, nonce) {
  const record = await loadByNonce(env.ARCADE, nonce)
  if (!record) return new Response('No such game', { status: 404 })
  // Blocks a bystander from wiping a live board mid-game.
  if (record.phase === 'playing') return new Response('Game still in progress', { status: 409 })

  Object.keys(record.seats).forEach((seat) => { record.seats[seat] = null })
  record.state = null
  record.phase = 'lobby'
  await save(env.ARCADE, record)

  return html(seatPicker(record, new URL(request.url).origin))
}

// Deals the opening position only once every seat is claimed — a half-full lobby shows no board.
function advancePhase(record, rules) {
  if (record.state && record.state.result) {
    record.phase = 'over'
    return
  }
  if (Object.values(record.seats).every(Boolean)) {
    record.state = record.state || rules.initialState()
    record.phase = 'playing'
  }
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
  })
}
