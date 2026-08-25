import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fit } from '#src/features/diff-image/fit'

const CELL_ASPECT = 2.1

test('a tall screenshot shrinks until it fits the row budget', () => {
  const size = fit({
    imageWidth: 1280,
    imageHeight: 3000,
    maxColumns: 80,
    maxRows: 16,
    cellAspect: CELL_ASPECT,
  })

  assert.deepEqual(size, { columns: 14, rows: 16 })
})

test('an image inside the row budget uses every available column', () => {
  const size = fit({
    imageWidth: 480,
    imageHeight: 240,
    maxColumns: 80,
    maxRows: 20,
    cellAspect: CELL_ASPECT,
  })

  assert.deepEqual(size, { columns: 80, rows: 19 })

  const shownAspect = size.columns / (size.rows * CELL_ASPECT)
  assert.ok(Math.abs(shownAspect - 480 / 240) / (480 / 240) < 0.01)
})

test('a wide thin strip still gets a row to render into', () => {
  const size = fit({
    imageWidth: 1000,
    imageHeight: 13,
    maxColumns: 80,
    maxRows: 16,
    cellAspect: CELL_ASPECT,
  })

  assert.deepEqual(size, { columns: 80, rows: 1 })
})
