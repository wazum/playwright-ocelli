import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { frameSizes } from '#src/features/diff-summary/frame-size'
import { PNG } from '#src/playwright-internals'

const directory = mkdtempSync(join(tmpdir(), 'ocelli-'))

process.on('exit', () => rmSync(directory, { recursive: true, force: true }))

function frame(name: string, width: number, height: number) {
  const path = join(directory, name)

  writeFileSync(
    path,
    PNG.sync.write({
      width,
      height,
      data: Buffer.alloc(width * height * 4, 0xff),
    }),
  )

  return { name, contentType: 'image/png', path }
}

test('reads both sizes out of the PNG headers when they differ', () => {
  const sizes = frameSizes(
    [
      frame('price-diff.png', 400, 200),
      frame('price-expected.png', 400, 200),
      frame('price-actual.png', 300, 150),
    ],
    'price-diff.png',
  )

  assert.deepEqual(sizes, {
    expected: { width: 400, height: 200 },
    actual: { width: 300, height: 150 },
  })
})

test('frames of one size are not a mismatch', () => {
  const sizes = frameSizes(
    [frame('same-expected.png', 400, 200), frame('same-actual.png', 400, 200)],
    'same-diff.png',
  )

  assert.equal(sizes, null)
})

test('a comparison missing a frame reports no mismatch', () => {
  const sizes = frameSizes([frame('lone-expected.png', 400, 200)], 'lone-diff.png')

  assert.equal(sizes, null)
})

test('a frame too short to hold a header reports no mismatch', () => {
  const truncated = join(directory, 'cut-actual.png')

  writeFileSync(truncated, 'not a png')

  const sizes = frameSizes(
    [
      frame('cut-expected.png', 400, 200),
      { name: 'cut-actual.png', contentType: 'image/png', path: truncated },
    ],
    'cut-diff.png',
  )

  assert.equal(sizes, null)
})

test('a frame whose file has gone reports no mismatch', () => {
  const sizes = frameSizes(
    [
      frame('gone-expected.png', 400, 200),
      {
        name: 'gone-actual.png',
        contentType: 'image/png',
        path: join(directory, 'never-written.png'),
      },
    ],
    'gone-diff.png',
  )

  assert.equal(sizes, null)
})
