import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { renderBlocks } from '#src/features/diff-image/render-blocks'
import { PNG } from '#src/playwright-internals'

const oneDigitDiff = PNG.sync.read(
  readFileSync(new URL('../../../fixtures/one-digit-diff.png', import.meta.url)),
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

test('more rows than the image is tall never fabricates a black cell', () => {
  const lines = renderBlocks(image(1, 2, [RED, BLUE]), { columns: 1, rows: 3 })

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

test('a region renders only that part of the image', () => {
  // Left column blue, right column red. Rendered whole, red outranks blue and
  // the cell is red; rendered over the left column only, it must be blue.
  const halved = image(2, 2, [BLUE, RED, BLUE, RED])
  const size = { columns: 1, rows: 1 }

  assert.equal(
    renderBlocks(halved, size)[0].emit,
    '\x1b[38;2;255;0;0;48;2;255;0;0m▀\x1b[0m',
    'the whole image should be dominated by red',
  )

  assert.equal(
    renderBlocks(halved, size, { x: 0, y: 0, width: 1, height: 2 })[0].emit,
    '\x1b[38;2;0;0;255;48;2;0;0;255m▀\x1b[0m',
    'the region outside the crop leaked into the cell',
  )
})

test('every rendered line declares exactly the cell count', () => {
  const lines = renderBlocks(oneDigitDiff, { columns: 64, rows: 16 })

  assert.equal(lines.length, 16)

  for (const line of lines) {
    assert.equal(line.visibleWidth, 64)
  }
})
