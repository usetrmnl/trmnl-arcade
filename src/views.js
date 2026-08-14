const escape = (value) =>
  String(value).replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
  )

const page = (title, body) => `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; margin: 0; padding: 24px; max-width: 34rem; }
  table { border-collapse: collapse; font-size: 22px; }
  td { width: 2rem; height: 2rem; text-align: center; border: 1px solid #999; }
  input, button { font: inherit; padding: 8px; }
  .error { color: #b00; }
</style></head><body>${body}</body></html>`

// Chess sends colour+type codes (e.g. "br"); the phone has full system fonts, so
// show players a recognisable glyph instead of the raw code.
const PIECE_GLYPHS = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚'
}

const grid = (rows) =>
  `<table>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escape(Object.hasOwn(PIECE_GLYPHS, cell) ? PIECE_GLYPHS[cell] : cell)}</td>`).join('')}</tr>`).join('')}</table>`

export function seatPicker(record, origin) {
  const seats = Object.keys(record.seats)
    .map((seat) =>
      // Seat tokens never render here — this page is visible to every bystander.
      record.seats[seat]
        ? `<li>Seat ${escape(seat)} taken — open your bookmark to resume</li>`
        : `<li><a href="${origin}/j/${record.nonce}/${seat}">Claim seat ${escape(seat)}</a></li>`
    )
    .join('')

  return page('Pick your seat', `<h1>Pick your seat</h1><ul>${seats}</ul>`)
}

export function playerPage(record, seat, token, rules, error) {
  const view = record.state ? rules.privateView(record.state, Number(seat)) : null
  const waiting = record.phase === 'lobby'

  const board = view
    ? `<h2>Board</h2>${grid(view.rows || view.grids[seat === '1' ? 2 : 1])}
       ${view.fleet ? `<h2>Your fleet</h2>${grid(view.fleet)}` : ''}`
    : '<p>Waiting for the other player to take their seat.</p>'

  const form = waiting || record.phase === 'over'
    ? ''
    : `<form method="post">
         <label for="move">${escape(rules.meta.moveLabel)}</label><br>
         <input id="move" name="move" autocomplete="off" autocapitalize="off"><br>
         <button type="submit">Play</button>
       </form>`

  return page(`${rules.meta.name} — seat ${seat}`, `
    <h1>${escape(rules.meta.name)}</h1>
    <p>You are ${escape(view ? view.you : `seat ${seat}`)}. Bookmark this page — the address is your seat.</p>
    ${error ? `<p class="error">${escape(error)}</p>` : ''}
    ${record.state && record.state.result ? `<p><strong>${escape(record.state.result)}</strong></p>` : ''}
    ${board}
    ${form}`)
}
