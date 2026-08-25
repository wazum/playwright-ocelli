import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderKitty } from '#src/features/diff-image/render-kitty'

function chunksOf(escape: string) {
  return escape
    .split('\x1b\\')
    .filter(Boolean)
    .map((chunk) => {
      const [keys, payload] = chunk.slice('\x1b_G'.length).split(';')

      return { keys, payload }
    })
}

test('a small image becomes one transmit-and-display escape', () => {
  const png = Buffer.from('pretend-png-bytes')

  const { escape, rows } = renderKitty(png, { columns: 4, rows: 2 })

  assert.equal(
    escape,
    `\x1b_Ga=T,f=100,q=2,c=4,r=2;${png.toString('base64')}\x1b\\`,
  )
  assert.equal(rows, 2)
})

test('a payload beyond one chunk is split with continuation flags', () => {
  const png = Buffer.alloc(4096, 7)

  const chunks = chunksOf(renderKitty(png, { columns: 4, rows: 2 }).escape)

  assert.equal(chunks.length, 2)
  assert.ok(chunks[0].keys.startsWith('a=T,f=100,q=2,c=4,r=2'))
  assert.ok(chunks[0].keys.endsWith('m=1'))
  assert.equal(chunks[1].keys, 'm=0')
  assert.ok(chunks.every((chunk) => chunk.payload.length <= 4096))
  assert.equal(
    chunks.map((chunk) => chunk.payload).join(''),
    png.toString('base64'),
  )
})

test('every middle chunk of a long payload is flagged as continuing', () => {
  const png = Buffer.alloc(8192, 3)

  const chunks = chunksOf(renderKitty(png, { columns: 4, rows: 2 }).escape)

  assert.equal(chunks.length, 3)
  assert.equal(chunks[1].keys, 'm=1')
  assert.equal(chunks[2].keys, 'm=0')
  assert.equal(
    chunks.map((chunk) => chunk.payload).join(''),
    png.toString('base64'),
  )
})
