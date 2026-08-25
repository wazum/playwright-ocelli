import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { PNG } from '../../playwright-internals.ts'
import { renderBlocks } from './render-blocks.ts'

const oneDigitDiff = PNG.sync.read(
  readFileSync(new URL('../../fixtures/one-digit-diff.png', import.meta.url)),
)

function image(width: number, height: number, pixels: number[][]) {
  const data = Buffer.alloc(width * height * 4)

  pixels.forEach(([red, green, blue], index) => {
    data.set([red, green, blue, 255], index * 4)
  })

  return { width, height, data }
}

const RED = [255, 0, 0]
const YELLOW = [255, 255, 0]
const BLUE = [0, 0, 255]

test('a cell paints its top pixel as foreground and its bottom as background', () => {
  const lines = renderBlocks(image(1, 2, [RED, BLUE]), { columns: 1, rows: 1 })

  assert.equal(lines.length, 1)
  assert.equal(lines[0].emit, '\x1b[38;2;255;0;0;48;2;0;0;255m▀\x1b[0m')
})

test('a cell only one pixel tall paints that pixel in both halves', () => {
  const lines = renderBlocks(image(1, 1, [RED]), { columns: 1, rows: 1 })

  assert.equal(lines[0].emit, '\x1b[38;2;255;0;0;48;2;255;0;0m▀\x1b[0m')
})

test('a cell narrower than one pixel still samples that pixel', () => {
  const lines = renderBlocks(image(1, 2, [RED, BLUE]), { columns: 2, rows: 1 })

  const cell = '\x1b[38;2;255;0;0;48;2;0;0;255m▀'
  assert.equal(lines[0].emit, cell + cell + '\x1b[0m')
})

test('a single red pixel outranks the anti-aliasing around it', () => {
  const scene = image(4, 2, [
    YELLOW, YELLOW, RED, YELLOW,
    YELLOW, YELLOW, YELLOW, YELLOW,
  ])

  const lines = renderBlocks(scene, { columns: 1, rows: 1 })

  assert.equal(lines[0].emit, '\x1b[38;2;255;0;0;48;2;255;255;0m▀\x1b[0m')
})

test('a 63-pixel diff survives downscaling to 32 columns', () => {
  const lines = renderBlocks(oneDigitDiff, { columns: 32, rows: 8 })

  const paintsRed = lines.some(
    ({ emit }) =>
      emit.includes('38;2;255;0;0') || emit.includes('48;2;255;0;0'),
  )

  assert.ok(paintsRed, 'the 63-pixel diff vanished from the rendered image')
})

test('every rendered line declares exactly the cell count', () => {
  const lines = renderBlocks(oneDigitDiff, { columns: 64, rows: 16 })

  assert.equal(lines.length, 16)

  for (const line of lines) {
    assert.equal(line.visibleWidth, 64)
  }
})
