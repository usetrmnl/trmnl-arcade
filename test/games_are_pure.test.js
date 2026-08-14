import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Game modules receive plain data and return plain data — never `env` — so this
// list is what would let a game escape that boundary if it snuck past review.
const FORBIDDEN_TOKENS = [
  'fetch(',
  'env.',
  'eval(',
  'new Function',
  'setTimeout',
  'setInterval',
  'XMLHttpRequest',
  'WebSocket',
  'import('
]

const GAMES_DIR = join(import.meta.dirname, '../src/games')
const gameFiles = readdirSync(GAMES_DIR).filter((file) => file !== 'index.js')

gameFiles.forEach((file) => {
  describe(file, () => {
    const source = readFileSync(join(GAMES_DIR, file), 'utf8')

    FORBIDDEN_TOKENS.forEach((token) => {
      it(`does not contain ${token}`, () => {
        expect(source.includes(token), `found forbidden token "${token}" in src/games/${file}`).toBe(false)
      })
    })
  })
})
