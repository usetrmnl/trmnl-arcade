// l/o/0/1 are omitted: these ids are read off a screen through a phone camera.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'
const RECORD_TTL_SECONDS = 604800

export function randomId(length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('')
}

export const recordKey = (game, key) => `game:${game}:${key}`
export const nonceKey = (nonce) => `nonce:${nonce}`

export function newRecord(game, key, seats) {
  const openSeats = {}
  for (let seat = 1; seat <= seats; seat++) openSeats[seat] = null

  return {
    version: 1,
    game,
    key,
    nonce: randomId(8),
    phase: 'lobby',
    seats: openSeats,
    state: null,
    updatedAt: 0
  }
}

export async function save(kv, record) {
  record.updatedAt = Date.now()
  const options = { expirationTtl: RECORD_TTL_SECONDS }

  // Pointer first: a half-failed write then re-creates the game instead of stranding it.
  await kv.put(nonceKey(record.nonce), `${record.game}/${record.key}`, options)
  await kv.put(recordKey(record.game, record.key), JSON.stringify(record), options)
  return record
}

export async function loadByKey(kv, game, key) {
  const raw = await kv.get(recordKey(game, key))
  return raw ? JSON.parse(raw) : null
}

export async function loadByNonce(kv, nonce) {
  const pointer = await kv.get(nonceKey(nonce))
  if (!pointer) return null

  const [game, key] = pointer.split('/')
  return loadByKey(kv, game, key)
}
